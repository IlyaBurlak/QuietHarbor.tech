import { Card, Col, Row, Skeleton, Result, Button, Typography } from 'antd';
import { useProfile } from '@/entities/user';
import { AvatarEditor } from '@/features/edit-avatar';
import { ProfileForm } from '@/features/edit-profile';

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
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page-narrow">
      <Typography.Title level={1} style={{ fontSize: 28 }}>
        Профиль
      </Typography.Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card>
            <div className="profile-summary">
              <AvatarEditor profile={profile} />
              <Typography.Title level={2} style={{ fontSize: 20, margin: '12px 0 0' }}>
                {profile.firstName} {profile.lastName}
              </Typography.Title>
              <Typography.Text type="secondary">@{profile.username}</Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                С нами с {since}
              </Typography.Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card>
            <ProfileForm profile={profile} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
