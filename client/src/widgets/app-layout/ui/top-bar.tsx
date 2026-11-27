import { Link, useLocation } from 'react-router-dom';
import { Badge, Tooltip } from 'antd';
import { Anchor, Menu, Search } from 'lucide-react';
import type { CSSProperties } from 'react';
import { APP_NAME } from '@/shared/config';
import { useNotificationSummary } from '@/entities/notification';
import { NotificationsPopover } from './notifications-popover';
import { SEARCH_PATH, SECTIONS, findSection } from '../model/nav-config';

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const current = findSection(pathname);
  const searching = pathname === SEARCH_PATH;
  const { data: summary } = useNotificationSummary();
  const friendRequests = summary?.friendRequests ?? 0;

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label={`${APP_NAME}, на главную`}>
        <Anchor size={28} strokeWidth={2.4} aria-hidden />
        <span className="brand__name">{APP_NAME}</span>
      </Link>

      <div className="topbar__center">
        <nav className="pill-nav" aria-label="Разделы">
          {SECTIONS.map(({ key, label, icon: Icon, color, to }) => {
            const active = current?.key === key && !searching;
            return (
              <Tooltip key={key} title={label} mouseEnterDelay={0.4}>
                <Link
                  to={to}
                  className="pill-nav__item"
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  style={{ '--tab-color': color } as CSSProperties}
                >
                  <Badge count={key === 'friends' ? friendRequests : 0} size="small" offset={[4, -2]}>
                    <Icon size={24} fill={active ? 'currentColor' : 'none'} aria-hidden />
                  </Badge>
                </Link>
              </Tooltip>
            );
          })}
        </nav>
        <Tooltip title="Поиск" mouseEnterDelay={0.4}>
          <Link
            to={SEARCH_PATH}
            className="circle-btn circle-btn--search"
            aria-label="Поиск"
            aria-current={searching ? 'page' : undefined}
          >
            <Search size={22} aria-hidden />
          </Link>
        </Tooltip>
      </div>

      <div className="topbar__end">
        <NotificationsPopover />
        <button type="button" className="circle-btn" aria-label="Меню" onClick={onOpenMenu}>
          <Menu size={22} aria-hidden />
        </button>
      </div>
    </header>
  );
}
