import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePublicConfig } from '@/shared/api';
import { APP_NAME } from '@/shared/config';
import { LifeBuoy } from 'lucide-react';
import { Badge } from 'antd';
import { useNotificationSummary } from '@/entities/notification';
import { activeItemTo, sideGroups, type NavItem } from '../model/nav-config';

/** Список ссылок бокового меню; используется и на десктопе, и в выезжающем меню на телефоне. */
export function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const active = activeItemTo(pathname, items);
  const { data: summary } = useNotificationSummary();
  return (
    <ul className="side-list">
      {items.map(({ to, label, icon: Icon, badge }) => {
        const isActive = to === active;
        const count = badge ? (summary?.[badge] ?? 0) : 0;
        return (
          <li key={to}>
            <Link
              to={to}
              className="side-link"
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
            >
              <Icon size={22} fill={isActive ? 'currentColor' : 'none'} aria-hidden />
              <span>{label}</span>
              {count > 0 && (
                <Badge count={count} className="side-link__badge" aria-label={`Новых: ${count}`} />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SupportLink() {
  const { data } = usePublicConfig();
  if (!data?.supportContactUrl) return null;
  return (
    <a
      className="side-link side-link--small"
      href={data.supportContactUrl}
      target="_blank"
      rel="noreferrer"
    >
      <LifeBuoy size={18} aria-hidden />
      <span>Поддержка</span>
    </a>
  );
}

/** Левое меню на широких экранах: пункты зависят от раздела, внизу — служебные ссылки. */
export function SideNav() {
  const { pathname } = useLocation();
  const groups = sideGroups(pathname);
  return (
    <aside className="sidebar" aria-label="Меню раздела">
      {groups.length > 0 && (
        <nav>
          {groups.map((items, i) => (
            <Fragment key={items[0]!.to}>
              {i > 0 && <hr className="side-divider" />}
              <NavList items={items} />
            </Fragment>
          ))}
        </nav>
      )}
      <div className="sidebar__footer">
        <SupportLink />
        <p className="sidebar__copy">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </aside>
  );
}
