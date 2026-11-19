import { Button, Card, Result, Skeleton, Typography } from 'antd';
import { useProfile } from '@/entities/user';
import { ChangePasswordForm } from '@/features/change-password';
import { DeleteAccount } from '@/features/delete-account';

export function SettingsPage() {
  const { data: profile, isPending, isError, refetch } = useProfile();

  if (isPending) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError || !profile) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить настройки"
        extra={<Button onClick={() => void refetch()}>Повторить</Button>}
      />
    );
  }

  return (
    <div className="page-narrow">
      <Typography.Title level={1} style={{ fontSize: 28 }}>
        Настройки аккаунта
      </Typography.Title>
      <Card title={profile.hasPassword ? 'Смена пароля' : 'Пароль'} style={{ marginBottom: 24 }}>
        <ChangePasswordForm hasPassword={profile.hasPassword} />
      </Card>
      <Card title="Опасная зона" className="danger-card">
        <DeleteAccount hasPassword={profile.hasPassword} />
      </Card>
    </div>
  );
}
