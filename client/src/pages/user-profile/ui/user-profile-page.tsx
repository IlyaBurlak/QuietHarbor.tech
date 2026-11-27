import { Alert, Button, Result, Skeleton } from 'antd';
import { Cake, Check, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useProfileWishlists, usePublicProfile } from '@/entities/friend';
import { UserAvatar } from '@/entities/user';
import { WishlistCard } from '@/entities/wishlist';
import { FriendActionButtons } from '@/features/friend-actions';
import { EmptyState } from '@/shared/ui';

const birthdayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

export function UserProfilePage() {
  const { username = '' } = useParams();
  const { data: profile, isPending, isError } = usePublicProfile(username);
  const lists = useProfileWishlists(username);

  if (isPending) return <Skeleton active avatar paragraph={{ rows: 4 }} />;
  if (isError || !profile) {
    return (
      <Result
        status="404"
        title="Пользователь не найден"
        extra={<Link to="/search">Перейти к поиску</Link>}
      />
    );
  }

  const isSelf = profile.relation === 'self';
  const birthday = profile.birthday;
  const birthdayLabel = birthday
    ? birthdayFormat.format(Date.UTC(birthday.year ?? 2000, birthday.month - 1, birthday.day))
    : null;

  return (
    <div className="friend-profile">
      <header className="friend-profile__hero">
        <div className="friend-profile__avatar">
          <UserAvatar
            fullName={profile.fullName}
            avatarKey={profile.avatarKey}
            size={{ xs: 88, sm: 112, lg: 136 }}
          />
        </div>

        <div className="friend-profile__identity">
          <h1 className="page-title friend-profile__name">{profile.fullName}</h1>
          <div className="friend-profile__meta">
            {profile.username && <span translate="no">@{profile.username}</span>}
            {profile.relation === 'friend' && (
              <span className="friend-profile__relationship">
                <Check size={16} aria-hidden />В друзьях
              </span>
            )}
          </div>
          {birthday && (
            <div className="friend-profile__birthday">
              <Cake size={16} aria-hidden />
              <span>
                {birthdayLabel}
                {birthday.year ? ` ${birthday.year}` : ''}
              </span>
            </div>
          )}
        </div>

        {profile.bio && <p className="friend-profile__bio">{profile.bio}</p>}

        <div className="friend-profile__actions">
          {isSelf ? (
            <Button href="/profile" icon={<Pencil size={16} aria-hidden />}>
              Редактировать профиль
            </Button>
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

      <section aria-labelledby="friend-wishlists">
        <h2 id="friend-wishlists" className="section-title friend-profile__section-title">
          Вишлисты
          {!!lists.data?.length && (
            <span className="friend-profile__count">{lists.data.length}</span>
          )}
        </h2>
        {lists.isPending && <Skeleton active paragraph={{ rows: 2 }} />}
        {lists.isError && (
          <Alert
            type="error"
            message="Не удалось загрузить вишлисты"
            action={
              <Button size="small" onClick={() => void lists.refetch()}>
                Повторить
              </Button>
            }
          />
        )}
        {lists.data && lists.data.length === 0 && (
          <EmptyState text="Нет вишлистов, доступных вам." />
        )}
        {!!lists.data?.length && (
          <div className="wishlist-grid">
            {lists.data.map((wishlist) => (
              <WishlistCard
                key={wishlist.id}
                wishlist={wishlist}
                href={`/w/${wishlist.shareSlug}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
