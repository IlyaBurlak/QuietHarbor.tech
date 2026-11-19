import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button, Drawer, Dropdown, Grid, Layout, Menu } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { UserAvatar, useCurrentUser } from '@/entities/user';
import { useLogout } from '@/features/auth-logout';

const items = [
  { key: '/', label: <Link to="/">Главная</Link> },
  { key: '/calendar', label: <Link to="/calendar">Календарь</Link> },
];

export function AppLayout() {
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const mobile = !screens.md;
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { pathname } = useLocation();
  const selected = [pathname];

  return (
    <Layout className="app-shell">
      <Layout.Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: '1px solid #E3DFD8',
          padding: '0 16px',
        }}
      >
        {mobile && (
          <Button
            type="text"
            aria-label="Открыть меню"
            icon={<MenuOutlined />}
            onClick={() => setOpen(true)}
          />
        )}
        <Link to="/" style={{ fontWeight: 600, fontSize: 20 }}>
          Wishlist
        </Link>
        {!mobile && (
          <Menu
            mode="horizontal"
            items={items}
            selectedKeys={selected}
            style={{ flex: 1, borderBottom: 0 }}
          />
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'profile', label: <Link to="/profile">Профиль</Link> },
                { key: 'settings', label: <Link to="/settings">Настройки</Link> },
                { type: 'divider' },
                { key: 'logout', label: 'Выйти', onClick: logout },
              ],
            }}
          >
            <Button type="text" aria-label="Меню аккаунта">
              <UserAvatar
                fullName={user?.fullName ?? ''}
                avatarKey={user?.avatarKey ?? null}
                size="small"
              />
              {!mobile && <span style={{ marginLeft: 8 }}>{user?.username ?? user?.fullName}</span>}
            </Button>
          </Dropdown>
        </div>
      </Layout.Header>
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" title="Меню">
        <Menu mode="inline" items={items} selectedKeys={selected} onClick={() => setOpen(false)} />
      </Drawer>
      <Layout.Content className="app-content">
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
