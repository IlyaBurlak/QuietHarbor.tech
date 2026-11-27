import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { UserCard } from '@wishlist/shared';
import { UserAvatar } from '@/entities/user';

/** Строка человека: аватар, имя, ник (ссылка на профиль) и действия справа. */
export function PersonRow({ user, actions }: { user: UserCard; actions?: ReactNode }) {
  const body = (
    <>
      <UserAvatar fullName={user.fullName} avatarKey={user.avatarKey} size={44} />
      <div className="person-row__text">
        <Typography.Text strong>{user.fullName}</Typography.Text>
        {user.username && <Typography.Text type="secondary">@{user.username}</Typography.Text>}
      </div>
    </>
  );
  return (
    <li className="person-row">
      {user.username ? (
        <Link to={`/u/${user.username}`} className="person-row__main">
          {body}
        </Link>
      ) : (
        <div className="person-row__main">{body}</div>
      )}
      {actions && <div className="person-row__actions">{actions}</div>}
    </li>
  );
}
