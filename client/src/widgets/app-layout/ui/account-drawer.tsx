import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Drawer, Grid } from 'antd';
import { LogOut, Search } from 'lucide-react';
import { UserAvatar, useCurrentUser } from '@/entities/user';
import { useLogout } from '@/features/auth-logout';
import { ACCOUNT_ITEMS, SEARCH_PATH, sideGroups } from '../model/nav-config';
import { NavList, SupportLink } from './side-nav';

/** Меню справа: профиль, настройки, выход. На телефоне здесь же пункты текущего раздела. */
export function AccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.lg;
  // Профиль и настройки показаны в нижнем блоке меню, поэтому из групп раздела их убираем
  const groups = mobile
    ? sideGroups(pathname)
        .map((g) => g.filter((i) => !ACCOUNT_ITEMS.includes(i)))
        .filter((g) => g.length > 0)
    : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={340}
      title="Меню"
      className="glass-drawer"
      closeIcon={undefined}
    >
      {user && (
        <Link to="/profile" className="account-card" onClick={onClose}>
          <UserAvatar fullName={user.fullName} avatarKey={user.avatarKey} size={52} />
          <span className="account-card__text">
            <strong>{user.fullName}</strong>
            {user.username && <span>@{user.username}</span>}
          </span>
        </Link>
      )}

      {mobile && (
        <>
          <Link to={SEARCH_PATH} className="side-link" onClick={onClose}>
            <Search size={22} aria-hidden />
            <span>Поиск</span>
          </Link>
          {groups.map((items) => (
            <Fragment key={items[0]!.to}>
              <hr className="side-divider" />
              <NavList items={items} onNavigate={onClose} />
            </Fragment>
          ))}
          <hr className="drawer-divider" />
        </>
      )}

      <NavList items={ACCOUNT_ITEMS} onNavigate={onClose} />
      <button type="button" className="side-link side-link--button" onClick={logout}>
        <LogOut size={22} aria-hidden />
        <span>Выйти</span>
      </button>
      <hr className="drawer-divider" />
      <SupportLink />
    </Drawer>
  );
}
