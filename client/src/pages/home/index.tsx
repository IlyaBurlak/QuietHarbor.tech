import { useQuery } from '@tanstack/react-query';
import { Alert, Typography } from 'antd';
import { http } from '@/shared/api';
import { useCurrentUser } from '@/entities/user';

export function HomePage() {
  const { data: user } = useCurrentUser();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => http.get('/health').then((r) => r.data),
  });
  return (
    <>
      <Typography.Title level={1} style={{ fontSize: 28 }}>
        Здравствуйте, {user?.fullName}
      </Typography.Title>
      <Alert
        type={health.isSuccess ? 'success' : health.isError ? 'error' : 'info'}
        message={
          health.isSuccess
            ? 'API и база работают'
            : health.isError
              ? 'API недоступен'
              : 'Проверка API…'
        }
      />
    </>
  );
}
