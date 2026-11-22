import { Skeleton } from 'antd';
import { AppLayout } from '@/widgets/app-layout';
import { PublicShell } from '@/widgets/public-shell';
import { useCurrentUser } from '@/entities/user';

/** Страницы, открытые гостям: вошедший видит их в обычной оболочке, гость — в упрощённой. */
export function PublicLayout() {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <Skeleton active style={{ padding: 24 }} />;
  return user ? <AppLayout /> : <PublicShell />;
}
