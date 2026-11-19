import { prisma } from '../../core/db/prisma';
import { upcomingBirthdays } from './birthdays';

/**
 * Дни рождения друзей. Попадают только принятые друзья с активным аккаунтом, у которых указана дата
 * и видимость не «никто». Видимость «все» и «друзья» для друга одинакова: он уже друг.
 */
export async function getFriendsBirthdays(userId: string, today = new Date()) {
  const friendships = await prisma.friendship.findMany({
    where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );

  const friends = await prisma.user.findMany({
    where: {
      id: { in: friendIds },
      status: 'active',
      birthDate: { not: null },
      birthdayVisibility: { in: ['all', 'friends'] },
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarKey: true,
      birthDate: true,
      hideBirthYear: true,
    },
  });

  return upcomingBirthdays(
    friends.map((f) => ({
      userId: f.id,
      username: f.username,
      fullName: f.fullName,
      avatarKey: f.avatarKey,
      birthDate: f.birthDate!,
      hideBirthYear: f.hideBirthYear,
    })),
    today,
  );
}
