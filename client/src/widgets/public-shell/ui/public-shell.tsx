import { Anchor } from 'lucide-react';
import { Button } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { APP_NAME } from '@/shared/config';

/** Оболочка для гостя на публичных страницах: логотип и кнопки входа. */
export function PublicShell() {
  const location = useLocation();
  const state = { from: location.pathname };
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label={`${APP_NAME}, на главную`}>
          <Anchor size={28} strokeWidth={2.4} aria-hidden />
          <span className="brand__name">{APP_NAME}</span>
        </Link>
        <div className="public-shell__actions">
          <Link to="/login" state={state}>
            <Button>Войти</Button>
          </Link>
          <Link to="/register" state={state}>
            <Button type="primary">Регистрация</Button>
          </Link>
        </div>
      </header>
      <main id="main" className="shell-main public-shell__main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
