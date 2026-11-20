import { Button, Card, Result, Skeleton } from 'antd';
import { Cake, CalendarClock } from 'lucide-react';
import { useProfile } from '@/entities/user';
import { AvatarEditor } from '@/features/edit-avatar';
import { ProfileForm } from '@/features/edit-profile';

const formatBirthday = (iso: string, hideYear: boolean) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: hideYear ? undefined : 'numeric',
    timeZone: 'UTC',
  });

export function ProfilePage() {
  const { data: profile, isPending, isError, refetch } = useProfile();

  if (isPending) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError || !profile) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить профиль"
        extra={<Button onClick={() => void refetch()}>Повторить</Button>}
      />
    );
  }

  const since = new Date(profile.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page-split">
      <aside className="page-split__aside">
        <Card>
          <section className="profile-hero" aria-labelledby="profile-name">
            <AvatarEditor profile={profile} size={160} />
            <h1 id="profile-name" className="profile-hero__name">
              {profile.firstName} {profile.lastName}
            </h1>
            <ul className="chips">
              {profile.username && <li className="chip">@{profile.username}</li>}
              {profile.birthDate ? (
                <li className="chip">
                  <Cake size={16} aria-hidden />
                  {formatBirthday(profile.birthDate, profile.hideBirthYear)}
                </li>
              ) : (
                <li>
                  <button
                    type="button"
                    className="chip chip--action"
                    onClick={() => document.getElementById('birth-date')?.focus()}
                  >
                    <Cake size={16} aria-hidden />
                    Добавить день рождения
                  </button>
                </li>
              )}
              <li className="chip">
                <CalendarClock size={16} aria-hidden />С нами с {since}
              </li>
            </ul>
          </section>
        </Card>
      </aside>
      <Card title="Данные профиля">
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
