import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from 'antd';
import { useCurrentUser } from '@/entities/user';

function Loading() {
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }} aria-busy="true">
      <Skeleton active />
    </div>
  );
}

/** Только для вошедших; гостя отправляет на /login и запоминает, куда вернуть. */
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();
  if (isPending) return <Loading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Только для гостей (вход, регистрация); вошедшего отправляет на главную. */
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();
  if (isPending) return <Loading />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}
