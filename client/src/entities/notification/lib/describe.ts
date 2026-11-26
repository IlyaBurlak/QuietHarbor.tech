import type { NotificationDto } from '@wishlist/shared';

/** Текст и ссылка уведомления. Для жеребьёвки пар в тексте нет и не бывает. */
export function describeNotification(n: NotificationDto): { text: string; to: string } {
  const who = n.actor?.fullName ?? 'Кто-то';
  const group = n.group?.title ? `«${n.group.title}»` : 'игре';
  switch (n.type) {
    case 'friend_request':
      return { text: `${who} хочет добавить вас в друзья`, to: '/friends/requests' };
    case 'friend_accepted':
      return {
        text: `${who} принял(а) вашу заявку в друзья`,
        to: n.actor?.username ? `/u/${n.actor.username}` : '/friends',
      };
    case 'group_joined':
      return { text: `${who} вступил(а) в игру ${group}`, to: n.group ? `/santa/${n.group.id}` : '/santa' };
    case 'group_drawn':
      return {
        text: `Жеребьёвка в игре ${group} проведена. Узнайте, кому вы дарите подарок`,
        to: n.group ? `/santa/${n.group.id}` : '/santa',
      };
  }
}
