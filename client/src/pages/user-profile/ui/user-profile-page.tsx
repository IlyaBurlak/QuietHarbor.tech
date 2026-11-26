import { Button, Card, Result, Skeleton, Typography } from 'antd';
import { Cake } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCurrentUser, UserAvatar } from '@/entities/user';
import { useProfileWishlists, usePublicProfile } from '@/entities/friend';
import { FriendActionButtons } from '@/features/friend-actions';
import { EmptyState } from '@/shared/ui';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** Профиль человека по /u/:username: имя, дата рождения (если открыта), доступные вишлисты. */
export function UserProfilePage() {
  const { username = '' } = useParams();
  const { data: me } = useCurrentUser();
  const { data: profile, isPending, isError } = usePublicProfile(username);
  const lists = useProfileWishlists(username);

  if (isPending) return <Skeleton active avatar paragraph={{ rows: 4 }} />;
  if (isError || !profile) {
    return (
      <Result
        status="404"
        title="Пользователь не найден"
        extra={
          <Link to="/search">
            <Button>Поиск</Button>
          </Link>
        }
      />
    );
  }
  const b = profile.birthday;
  const isSelf = profile.relation === 'self' || me?.id === profile.id;

  return (
    <>
      <header className="public-head">
        <UserAvatar fullName={profile.fullName} avatarKey={profile.avatarKey} size={72} />
        <div>
          <h1 className="page-title">{profile.fullName}</h1>
          <Typography.Text type="secondary">@{profile.username}</Typography.Text>
          {b && (
            <p className="muted" style={{ margin: '4px 0 0' }}>
              <Cake size={14} aria-hidden style={{ verticalAlign: -2 }} /> {b.day} {MONTHS[b.month - 1]}
              {b.year ? ` ${b.year}` : ''}
            </p>
          )}
          {profile.bio && <p className="page-header__desc">{profile.bio}</p>}
        </div>
        <div className="public-head__edit">
          {isSelf ? (
            <Link to="/profile">
              <Button>Редактировать профиль</Button>
            </Link>
          ) : (
            <FriendActionButtons
              relation={profile.relation}
              username={profile.username ?? ''}
              userId={profile.id}
              requestId={profile.requestId}
            />
          )}
        </div>
      </header>

      <h2 className="section-title">Вишлисты</h2>
      {lists.isPending && <Skeleton active paragraph={{ rows: 2 }} />}
      {lists.data && lists.data.length === 0 && (
        <EmptyState
          text={
            profile.relation === 'friend' || isSelf
              ? 'Нет вишлистов, доступных вам.'
              : 'Вишлисты видны только друзьям. Отправьте заявку, чтобы их увидеть.'
          }
        />
      )}
      {lists.data && lists.data.length > 0 && (
        <div className="wishlist-grid">
          {lists.data.map((w) => (
            <Card key={w.id} className="wishlist-card" hoverable>
              <Link to={`/w/${w.shareSlug}`} className="wishlist-card__title">
                {w.title}
              </Link>
              {w.description && (
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                  {w.description}
                </Typography.Paragraph>
              )}
              <div className="wishlist-card__meta">
                <Typography.Text type="secondary">{w.itemsCount} желаний</Typography.Text>
                {w.eventDate && (
                  <Typography.Text type="secondary">
                    {new Date(w.eventDate).toLocaleDateString('ru-RU')}
                  </Typography.Text>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
