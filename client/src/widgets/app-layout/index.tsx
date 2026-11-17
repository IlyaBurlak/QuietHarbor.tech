import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button, Drawer, Grid, Layout, Menu } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

const items = [{ key: '/', label: <Link to="/">Главная</Link> }];

export function AppLayout() {
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const mobile = !screens.md;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {mobile && (
          <Button type="text" icon={<MenuOutlined style={{ color: '#fff' }} />} onClick={() => setOpen(true)} />
        )}
        <Link to="/" style={{ color: '#fff', fontWeight: 600 }}>
          Wishlist
        </Link>
        {!mobile && <Menu theme="dark" mode="horizontal" items={items} style={{ flex: 1 }} />}
      </Layout.Header>
      <Drawer open={open} onClose={() => setOpen(false)} placement="left">
        <Menu mode="inline" items={items} onClick={() => setOpen(false)} />
      </Drawer>
      <Layout.Content style={{ padding: 24 }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
