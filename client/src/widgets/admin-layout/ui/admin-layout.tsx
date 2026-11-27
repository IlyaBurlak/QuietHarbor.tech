import { useState } from 'react';
import { Button, Drawer, Grid, Menu, Skeleton } from 'antd';
import { Anchor, BarChart3, KeyRound, LogOut, Menu as MenuIcon, ScrollText, Users } from 'lucide-react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminLogout, useAdminMe } from '@/entities/admin';

const ITEMS = [
  { key: '/admin', label: 'Статистика', icon: <BarChart3 size={18} aria-hidden /> },
  { key: '/admin/requests', label: 'Заявки', icon: <KeyRound size={18} aria-hidden /> },
  { key: '/admin/users', label: 'Пользователи', icon: <Users size={18} aria-hidden /> },
  { key: '/admin/audit', label: 'Журнал', icon: <ScrollText size={18} aria-hidden /> },
];

/** Оболочка админки + защита маршрутов /admin/*: без админской сессии — на /admin/login. */
export function AdminLayout() {
  const { data: admin, isPending, isError } = useAdminMe();
  const logout = useAdminLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const desktop = !!screens.lg;

  if (isPending) return <Skeleton active style={{ padding: 24 }} />;
  if (isError || !admin) return <Navigate to="/admin/login" replace />;

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      items={ITEMS}
      onClick={({ key }) => {
        setOpen(false);
        navigate(key);
      }}
      style={{ background: 'transparent', border: 0 }}
    />
  );

  return (
    <div className="admin-shell">
      <header className="admin-top">
        {!desktop && (
          <Button
            type="text"
            aria-label="Открыть меню"
            icon={<MenuIcon size={20} aria-hidden />}
            onClick={() => setOpen(true)}
          />
        )}
        <span className="admin-brand">
          <Anchor size={22} aria-hidden /> Админка
        </span>
        <span className="admin-top__who">{admin.username}</span>
        <Button
          icon={<LogOut size={16} aria-hidden />}
          loading={logout.isPending}
          onClick={async () => {
            await logout.mutateAsync();
            navigate('/admin/login', { replace: true });
          }}
        >
          Выйти
        </Button>
      </header>
      <div className="admin-body">
        {desktop && <aside className="admin-side">{menu}</aside>}
        <main id="main" className="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <Drawer open={open && !desktop} onClose={() => setOpen(false)} placement="left" width={260} title="Разделы">
        {menu}
      </Drawer>
    </div>
  );
}
