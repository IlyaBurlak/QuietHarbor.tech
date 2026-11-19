import { Button, Card, Empty, Result, Skeleton, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { BirthdayRow, groupByMonth, useBirthdays } from '@/entities/birthday';

export function CalendarPage() {
  const { data, isPending, isError, refetch } = useBirthdays();

  return (
    <div className="page-narrow">
      <Typography.Title level={1} style={{ fontSize: 28 }}>
        Календарь
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Дни рождения друзей. Ближайшие — сверху. Друзья, которые скрыли дату, здесь не показываются.
      </Typography.Paragraph>

      {isPending && <Skeleton active paragraph={{ rows: 6 }} />}
      {isError && (
        <Result
          status="error"
          title="Не удалось загрузить календарь"
          extra={<Button onClick={() => void refetch()}>Повторить</Button>}
        />
      )}
      {data && data.length === 0 && (
        <Card>
          <Empty
            description={
              <>
                Пока нет дней рождения для показа.
                <br />
                Они появятся, когда вы добавите друзей, а они укажут дату в профиле.
              </>
            }
          >
            <Link to="/profile">
              <Button>Указать свою дату в профиле</Button>
            </Link>
          </Empty>
        </Card>
      )}
      {data &&
        groupByMonth(data).map((group) => (
          <section key={group.key} aria-labelledby={`m-${group.key}`} className="calendar-group">
            <Typography.Title level={2} id={`m-${group.key}`} style={{ fontSize: 18 }}>
              {group.title}
            </Typography.Title>
            <Card styles={{ body: { padding: '4px 16px' } }}>
              <ul className="birthday-list">
                {group.items.map((entry) => (
                  <BirthdayRow key={entry.userId} entry={entry} />
                ))}
              </ul>
            </Card>
          </section>
        ))}
    </div>
  );
}
