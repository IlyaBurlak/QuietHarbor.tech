import { Prisma, type User } from '@prisma/client';
import type {
  FriendsResponse,
  ProfileWishlist,
  PublicProfile,
  Relation,
  SearchResult,
  UserCard,
} from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { escapeLike } from '../../core/db/like';
import { HttpError, notFound } from '../../core/http/errors';
import { dropFriendRequestNotice, notify } from '../notifications/notifications.service';
import { areFriends } from '../wishlists/wishlists.access';

export const CARD_SELECT = { id: true, username: true, fullName: true, avatarKey: true } as const;
const card = (u: UserCard): UserCard => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  avatarKey: u.avatarKey,
});

/** Связь между мной и другим человеком (и id входящей заявки, если есть). */
async function relationTo(me: string, other: string) {
  if (me === other) return { relation: 'self' as Relation, requestId: null };
  const f = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId: other },
        { requesterId: other, addresseeId: me },
      ],
    },
  });
  if (!f) return { relation: 'none' as Relation, requestId: null };
  if (f.status === 'accepted') return { relation: 'friend' as Relation, requestId: null };
  return f.requesterId === me
    ? { relation: 'outgoing' as Relation, requestId: f.id }
    : { relation: 'incoming' as Relation, requestId: f.id };
}

/** Поиск по началу ника. Отдаёт только ник, имя и аватар. */
export async function searchUsers(me: string, nick: string): Promise<SearchResult[]> {
  const users = await prisma.user.findMany({
    where: { username: { startsWith: escapeLike(nick) }, status: 'active', id: { not: me } },
    select: CARD_SELECT,
    orderBy: { username: 'asc' },
    take: 20,
  });
  return Promise.all(
    users.map(async (u) => ({ ...card(u), ...(await relationTo(me, u.id)) })),
  );
}

async function findActiveByUsername(username: string) {
  const user = await prisma.user.findFirst({ where: { username, status: 'active' } });
  if (!user) throw notFound('Пользователь не найден');
  return user;
}

export async function sendRequest(me: string, username: string) {
  const target = await findActiveByUsername(username);
  if (target.id === me) {
    throw new HttpError(400, 'SELF_REQUEST', 'Нельзя добавить в друзья самого себя');
  }
  const { relation, requestId } = await relationTo(me, target.id);
  if (relation === 'friend') throw new HttpError(409, 'ALREADY_FRIENDS', 'Вы уже друзья');
  if (relation === 'outgoing') {
    throw new HttpError(409, 'REQUEST_EXISTS', 'Заявка уже отправлена');
  }
  // Он уже просил нас — достаточно принять его заявку
  if (relation === 'incoming') {
    await prisma.friendship.update({ where: { id: requestId! }, data: { status: 'accepted' } });
    await dropFriendRequestNotice(me, target.id);
    await notify({ userId: target.id, type: 'friend_accepted', actorId: me });
    return { status: 'accepted' as const };
  }
  try {
    await prisma.friendship.create({ data: { requesterId: me, addresseeId: target.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'REQUEST_EXISTS', 'Заявка уже отправлена');
    }
    throw e;
  }
  await notify({ userId: target.id, type: 'friend_request', actorId: me });
  return { status: 'pending' as const };
}

async function getIncoming(me: string, id: string) {
  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || f.addresseeId !== me || f.status !== 'pending') throw notFound('Заявка не найдена');
  return f;
}

export async function acceptRequest(me: string, id: string) {
  const f = await getIncoming(me, id);
  await prisma.friendship.update({ where: { id }, data: { status: 'accepted' } });
  await dropFriendRequestNotice(me, f.requesterId);
  await notify({ userId: f.requesterId, type: 'friend_accepted', actorId: me });
}

export async function declineRequest(me: string, id: string) {
  const f = await getIncoming(me, id);
  await prisma.friendship.delete({ where: { id } });
  await dropFriendRequestNotice(me, f.requesterId);
}

/** Отозвать свою исходящую заявку. */
export async function cancelRequest(me: string, id: string) {
  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || f.requesterId !== me || f.status !== 'pending') throw notFound('Заявка не найдена');
  await prisma.friendship.delete({ where: { id } });
  await dropFriendRequestNotice(f.addresseeId, me);
}

export async function listFriends(me: string): Promise<FriendsResponse> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me }, { addresseeId: me }] },
    include: {
      requester: { select: CARD_SELECT },
      addressee: { select: CARD_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });
  const res: FriendsResponse = { friends: [], incoming: [], outgoing: [] };
  for (const f of rows) {
    const mine = f.requesterId === me;
    const other = card(mine ? f.addressee : f.requester);
    if (f.status === 'accepted') res.friends.push(other);
    else if (mine) res.outgoing.push({ id: f.id, user: other });
    else res.incoming.push({ id: f.id, user: other });
  }
  res.friends.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
  return res;
}

export async function removeFriend(me: string, userId: string) {
  const { count } = await prisma.friendship.deleteMany({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: me, addresseeId: userId },
        { requesterId: userId, addresseeId: me },
      ],
    },
  });
  if (count === 0) throw notFound('Этот человек не в вашем списке друзей');
}

function birthdayFor(user: User, viewerIsFriend: boolean, isSelf: boolean): PublicProfile['birthday'] {
  if (!user.birthDate) return null;
  const visible =
    isSelf ||
    user.birthdayVisibility === 'all' ||
    (user.birthdayVisibility === 'friends' && viewerIsFriend);
  if (!visible) return null;
  return {
    month: user.birthDate.getUTCMonth() + 1,
    day: user.birthDate.getUTCDate(),
    year: user.hideBirthYear && !isSelf ? null : user.birthDate.getUTCFullYear(),
  };
}

/** Краткий профиль по нику (страница /u/:username и приглашение в друзья). */
export async function getPublicProfile(me: string, username: string): Promise<PublicProfile> {
  const user = await findActiveByUsername(username);
  const rel = await relationTo(me, user.id);
  return {
    ...card(user),
    bio: user.bio,
    ...rel,
    birthday: birthdayFor(user, rel.relation === 'friend', rel.relation === 'self'),
  };
}

/**
 * Вишлисты человека, которые я вправе видеть. Чужие не-друзья не видят ничего:
 * режим «по ссылке» означает «у кого есть ссылка», а не «виден в профиле».
 */
export async function getProfileWishlists(me: string, username: string): Promise<ProfileWishlist[]> {
  const user = await findActiveByUsername(username);
  if (user.id !== me && !(await areFriends(me, user.id))) return [];
  const lists = await prisma.wishlist.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
  // Смотрящий уже признан другом (или это он сам), владелец активен: от приватных вишлистов отсекаем только «только я»
  const visible: ProfileWishlist[] = [];
  for (const w of lists) {
    if (w.visibility === 'private' && w.ownerId !== me) continue;
    visible.push({
      id: w.id,
      title: w.title,
      description: w.description,
      eventDate: w.eventDate ? w.eventDate.toISOString().slice(0, 10) : null,
      shareSlug: w.shareSlug,
      itemsCount: w._count.items,
    });
  }
  return visible;
}

