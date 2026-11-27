import {
  CalendarDays,
  Check,
  EyeOff,
  Flame,
  Gift,
  Heart,
  House,
  PlusCircle,
  Settings,
  Sparkles,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Счётчик у пункта: сколько входящих заявок в друзья. */
  badge?: 'friendRequests';
}

export interface NavSection {
  key: string;
  label: string;
  /** Иконка и цвет в верхней панели. */
  icon: LucideIcon;
  color: string;
  to: string;
  /** Левое меню для этого раздела. */
  items: NavItem[];
  /** Какие пути относятся к разделу. */
  prefixes: string[];
}

/** Четыре раздела верхней панели. Левое меню зависит от выбранного раздела. */
export const SECTIONS: NavSection[] = [
  {
    key: 'home',
    label: 'Главная',
    icon: Flame,
    color: '#ff8a3d',
    to: '/',
    prefixes: ['/calendar'],
    items: [
      { to: '/', label: 'Главная', icon: House },
      { to: '/calendar', label: 'Календарь', icon: CalendarDays },
    ],
  },
  {
    key: 'wishes',
    label: 'Мои желания',
    icon: Heart,
    color: '#ff5a5f',
    to: '/lists',
    prefixes: ['/lists', '/gifts'],
    items: [
      { to: '/lists/new', label: 'Создать вишлист', icon: PlusCircle },
      { to: '/lists', label: 'Мои желания', icon: Heart },
      { to: '/lists/secret', label: 'Секретные', icon: EyeOff },
      { to: '/gifts', label: 'Забронировано мной', icon: Sparkles },
      { to: '/lists/done', label: 'Исполненные', icon: Check },
    ],
  },
  {
    key: 'friends',
    label: 'Друзья',
    icon: Users,
    color: '#a78bfa',
    to: '/friends',
    prefixes: ['/friends'],
    items: [
      { to: '/friends', label: 'Друзья', icon: Users },
      { to: '/friends/requests', label: 'Заявки', icon: UserCheck, badge: 'friendRequests' },
    ],
  },
  {
    key: 'santa',
    label: 'Тайный Санта',
    icon: Gift,
    color: '#ff7a66',
    to: '/santa',
    prefixes: ['/santa'],
    items: [
      { to: '/santa/new', label: 'Создать игру', icon: PlusCircle },
      { to: '/santa', label: 'Мои игры', icon: Gift },
    ],
  },
];

/** Страницы аккаунта: открываются из меню справа, в верхней панели не выделяются. */
export const ACCOUNT_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Профиль', icon: User },
  { to: '/settings', label: 'Настройки', icon: Settings },
];

export const SEARCH_PATH = '/search';

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function findSection(pathname: string): NavSection | undefined {
  if (pathname === '/') return SECTIONS[0];
  return SECTIONS.find((s) => [s.to, ...s.prefixes].some((p) => p !== '/' && isUnder(pathname, p)));
}

/**
 * Группы пунктов левого меню для текущего пути. На главной показаны все возможности, сгруппированные
 * по разделам (группы разделяет тонкая линия); внутри раздела верхней панели — только его пункты.
 */
export function sideGroups(pathname: string): NavItem[][] {
  if (ACCOUNT_ITEMS.some((i) => isUnder(pathname, i.to))) return [ACCOUNT_ITEMS];
  const section = findSection(pathname);
  if (!section) return [];
  if (section.key === 'home') {
    return [
      section.items,
      ...SECTIONS.filter((s) => s !== section).map((s) => s.items),
      ACCOUNT_ITEMS,
    ];
  }
  return [section.items];
}

export const sideItems = (pathname: string): NavItem[] => sideGroups(pathname).flat();

/** Пункт активен, если это самый длинный совпавший путь среди пунктов меню. */
export function activeItemTo(pathname: string, items: NavItem[]): string | undefined {
  return items
    .filter((i) => (i.to === '/' ? pathname === '/' : isUnder(pathname, i.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}
