import { Button, Card, Result, Skeleton } from 'antd';
import { useProfile } from '@/entities/user';
import { ChangePasswordForm } from '@/features/change-password';
import { DeleteAccount } from '@/features/delete-account';
import { PageHeader } from '@/shared/ui';
import { AccountInfo } from './account-info';

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
    <>
      <PageHeader title="Настройки" description="Пароль и управление аккаунтом." />
      <div className="page-split page-split--even">
        <Card title={profile.hasPassword ? 'Смена пароля' : 'Пароль'}>
          <ChangePasswordForm hasPassword={profile.hasPassword} />
        </Card>
        <div className="page-stack">
          <AccountInfo profile={profile} />
          <Card title="Опасная зона" className="danger-card">
            <DeleteAccount hasPassword={profile.hasPassword} />
          </Card>
        </div>
      </div>
    </>
  );
}
