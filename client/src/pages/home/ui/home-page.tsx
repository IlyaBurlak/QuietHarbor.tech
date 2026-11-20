import { Button, Card, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { BirthdayRow, useBirthdays } from '@/entities/birthday';
import { useCurrentUser, useProfile } from '@/entities/user';
import { EmptyState, PageHeader } from '@/shared/ui';

function greeting(hour: number) {
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const UPCOMING_LIMIT = 5;

export function HomePage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const birthdays = useBirthdays();
  const name = profile?.firstName ?? user?.fullName ?? '';

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}${name ? `, ${name}` : ''}`}
        description="Ваши желания, друзья и ближайшие праздники в одном месте."
      />

      <div className="home-grid">
        <div className="home-grid__main">
          <Card title="Мои вишлисты">
            {/* Подключается в эпике 3: карточки вишлистов и кнопка «Создать первый» */}
            <EmptyState text="У вас пока нет вишлистов" />
          </Card>
          <Card title="Мои группы Тайного Санты">
            {/* Подключается в эпике 7 */}
            <EmptyState text="Вы пока не участвуете в играх" />
          </Card>
        </div>
        <Card
          title="Ближайшие даты"
          extra={
            birthdays.data && birthdays.data.length > 0 ? <Link to="/calendar">Все</Link> : null
          }
          styles={{ body: { padding: '0 24px 8px' } }}
        >
          {birthdays.isPending && <Skeleton active paragraph={{ rows: 3 }} title={false} />}
          {birthdays.isError && (
            <EmptyState text="Не удалось загрузить даты">
              <Button onClick={() => void birthdays.refetch()}>Повторить</Button>
            </EmptyState>
          )}
          {birthdays.data &&
            (birthdays.data.length === 0 ? (
              <EmptyState text="Дней рождения друзей пока нет" />
            ) : (
              <ul className="birthday-list">
                {birthdays.data.slice(0, UPCOMING_LIMIT).map((entry) => (
                  <BirthdayRow key={entry.userId} entry={entry} />
                ))}
              </ul>
            ))}
        </Card>
      </div>
    </>
  );
}
