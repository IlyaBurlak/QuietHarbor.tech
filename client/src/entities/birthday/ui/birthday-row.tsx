import { Tag, Typography } from 'antd';
import type { BirthdayEntry } from '@wishlist/shared';
import { UserAvatar } from '@/entities/user';
import { formatDayMonth, turnsText, whenText } from '../lib/format';

/** Строка «аватар, имя, дата». Для списка в календаре и блока «Ближайшие даты». */
export function BirthdayRow({ entry }: { entry: BirthdayEntry }) {
  const turns = turnsText(entry);
  return (
    <li className="birthday-row">
      <UserAvatar fullName={entry.fullName} avatarKey={entry.avatarKey} size={40} />
      <div className="birthday-row__main">
        <Typography.Text strong>{entry.fullName}</Typography.Text>
        <Typography.Text type="secondary" className="birthday-row__sub">
          {entry.username ? `@${entry.username}` : null}
          {entry.username && turns ? ' · ' : null}
          {turns}
        </Typography.Text>
      </div>
      <div className="birthday-row__when">
        <span>{formatDayMonth(entry.date)}</span>
        {entry.daysUntil <= 1 ? (
          <Tag color={entry.daysUntil === 0 ? 'green' : 'blue'} bordered={false}>
            {whenText(entry.daysUntil)}
          </Tag>
        ) : (
          <Typography.Text type="secondary" className="birthday-row__sub">
            {whenText(entry.daysUntil)}
          </Typography.Text>
        )}
      </div>
    </li>
  );
}
