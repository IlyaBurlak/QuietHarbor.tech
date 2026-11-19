import { Avatar } from 'antd';
import { fileUrl } from '@/shared/lib';

interface Props {
  fullName: string;
  avatarKey: string | null;
  size?: number | 'small' | 'large' | 'default';
}

const initialsOf = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Аватар пользователя: фото или инициалы. Декоративный: имя рядом уже есть в тексте. */
export function UserAvatar({ fullName, avatarKey, size = 'default' }: Props) {
  return (
    <Avatar
      size={size}
      src={avatarKey ? fileUrl(avatarKey) : undefined}
      alt=""
      style={{ background: '#1F5F7A', flexShrink: 0 }}
    >
      {initialsOf(fullName) || '?'}
    </Avatar>
  );
}
