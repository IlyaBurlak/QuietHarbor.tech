import { Avatar } from 'antd';
import { fileUrl } from '@/shared/lib';

interface Props {
  fullName: string;
  avatarKey: string | null;
  size?: number | 'small' | 'large' | 'default';
}

const PALETTE = [
  '#3d7f73',
  '#6d4fd8',
  '#b4531c',
  '#0e7490',
  '#a21caf',
  '#4d7c0f',
  '#b45309',
  '#be185d',
];

/** Цвет аватара-заглушки зависит от имени, чтобы у разных людей он был разным, но не менялся. */
const colorOf = (name: string) =>
  PALETTE[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PALETTE.length]!;

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
      style={{ background: colorOf(fullName), color: '#fff', fontWeight: 700, flexShrink: 0 }}
    >
      {initialsOf(fullName) || '?'}
    </Avatar>
  );
}
