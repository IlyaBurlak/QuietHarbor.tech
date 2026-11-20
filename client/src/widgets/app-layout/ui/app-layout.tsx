import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AccountDrawer } from './account-drawer';
import { SideNav } from './side-nav';
import { TopBar } from './top-bar';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // После перехода возвращаем прокрутку наверх
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      <TopBar onOpenMenu={() => setMenuOpen(true)} />
      <div className="shell-body">
        <SideNav />
        <main id="main" className="shell-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <AccountDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
