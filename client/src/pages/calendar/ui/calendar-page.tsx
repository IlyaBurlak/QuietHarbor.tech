import { Button, Card, Result, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { BirthdayRow, groupByMonth, useBirthdays } from '@/entities/birthday';
import { EmptyState, PageHeader } from '@/shared/ui';

export function CalendarPage() {
  const { data, isPending, isError, refetch } = useBirthdays();

  return (
    <>
      <PageHeader
        title="Календарь"
        count={data?.length || undefined}
        description="Дни рождения друзей, ближайшие сверху. Друзья, скрывшие дату, здесь не показываются."
      />

      {isPending && <Skeleton active paragraph={{ rows: 6 }} />}
      {isError && (
        <Result
          status="error"
          title="Не удалось загрузить календарь"
          extra={<Button onClick={() => void refetch()}>Повторить</Button>}
        />
      )}
      {data && data.length === 0 && (
        <EmptyState text="Пока нет дней рождения для показа. Они появятся, когда вы добавите друзей, а они укажут дату в профиле.">
          <Link to="/profile">
            <Button>Указать свою дату</Button>
          </Link>
        </EmptyState>
      )}
      {data &&
        groupByMonth(data).map((group) => (
          <section key={group.key} aria-labelledby={`m-${group.key}`} className="calendar-group">
            <h2 id={`m-${group.key}`} className="section-title">
              {group.title}
            </h2>
            <Card styles={{ body: { padding: '0 24px' } }}>
              <ul className="birthday-list">
                {group.items.map((entry) => (
                  <BirthdayRow key={entry.userId} entry={entry} />
                ))}
              </ul>
            </Card>
          </section>
        ))}
    </>
  );
}
