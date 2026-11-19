import { Button, Card, Col, Empty, Row, Skeleton, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { BirthdayRow, useBirthdays } from '@/entities/birthday';
import { useCurrentUser, useProfile } from '@/entities/user';

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
    <div className="page-wide">
      <Typography.Title level={1} style={{ fontSize: 28 }}>
        {greeting(new Date().getHours())}
        {name ? `, ${name}` : ''}
      </Typography.Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Мои вишлисты" style={{ marginBottom: 24 }}>
            {/* Подключается в эпике 3: список карточек и кнопка «Создать первый» */}
            <Empty description="У вас пока нет вишлистов" />
          </Card>
          <Card title="Мои группы Тайного Санты">
            {/* Подключается в эпике 7 */}
            <Empty description="Вы пока не участвуете в группах" />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Ближайшие даты"
            extra={
              birthdays.data && birthdays.data.length > 0 ? <Link to="/calendar">Все</Link> : null
            }
            styles={{ body: { padding: '4px 16px' } }}
          >
            {birthdays.isPending && <Skeleton active paragraph={{ rows: 3 }} title={false} />}
            {birthdays.isError && (
              <div style={{ padding: '12px 0' }}>
                <Typography.Paragraph type="secondary">
                  Не удалось загрузить даты
                </Typography.Paragraph>
                <Button onClick={() => void birthdays.refetch()}>Повторить</Button>
              </div>
            )}
            {birthdays.data &&
              (birthdays.data.length === 0 ? (
                <Empty description="Дней рождения друзей пока нет" style={{ padding: '16px 0' }} />
              ) : (
                <ul className="birthday-list">
                  {birthdays.data.slice(0, UPCOMING_LIMIT).map((entry) => (
                    <BirthdayRow key={entry.userId} entry={entry} />
                  ))}
                </ul>
              ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
