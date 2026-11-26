import { Button, Card, Skeleton, Tag, Typography } from 'antd';
import { Cake, CalendarHeart, Gift, Heart, Plus, Search, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useBirthdays } from '@/entities/birthday';
import { useFriends } from '@/entities/friend';
import { formatBudget, useGroups } from '@/entities/group';
import { useCurrentUser, useHomeSettings, useProfile } from '@/entities/user';
import type { HomeWidgetId } from '@wishlist/shared';
import { HomeSettingsButton } from '@/features/home-settings';
import { useMyReservations, useWishlists, WishlistCard } from '@/entities/wishlist';
import { EmptyState, PageHeader } from '@/shared/ui';
import { buildEvents, whenLabel, type UpcomingEvent } from '../lib/events';

function greeting(hour: number) {
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const EVENT_ICON: Record<UpcomingEvent['kind'], ReactNode> = {
  birthday: <Cake size={18} aria-hidden />,
  wishlist: <Heart size={18} aria-hidden />,
  draw: <Gift size={18} aria-hidden />,
  exchange: <Gift size={18} aria-hidden />,
};

function Stat({ to, icon, value, label }: { to: string; icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <Link to={to} className="stat-tile">
      <span className="stat-tile__icon">{icon}</span>
      <span className="stat-tile__value">{value}</span>
      <span className="stat-tile__label">{label}</span>
    </Link>
  );
}

export function HomePage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile();
  const wishlists = useWishlists();
  const groups = useGroups();
  const friends = useFriends();
  const birthdays = useBirthdays();
  const reservations = useMyReservations();
  const settings = useHomeSettings();
  const hidden = settings.data?.hidden ?? [];
  const show = (id: HomeWidgetId) => !hidden.includes(id);
  const name = profile?.firstName ?? user?.fullName ?? '';
  const showMain = show('wishlists') || show('groups');
  const showSide = show('events') || show('quickActions');
  const nothingShown = !show('stats') && !show('friendRequests') && !showMain && !showSide;

  const lists = wishlists.data ?? [];
  const wishesCount = lists.reduce((sum, w) => sum + w.itemsCount, 0);
  const reservedCount = reservations.data?.groups.reduce((s, g) => s + g.items.length, 0);
  const incoming = friends.data?.incoming.length ?? 0;
  const events = buildEvents(birthdays.data ?? [], lists, groups.data ?? []).slice(0, 6);
  const eventsLoading = birthdays.isPending || wishlists.isPending || groups.isPending;

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}${name ? `, ${name}` : ''}`}
        description="Ваши желания, друзья и ближайшие праздники в одном месте."
        actions={
          <>
            <HomeSettingsButton />
            <Link to="/lists/new">
              <Button type="primary" icon={<Plus size={16} aria-hidden />}>
                Создать вишлист
              </Button>
            </Link>
          </>
        }
      />

      {show('stats') && (
      <div className="stat-row">
        <Stat to="/lists" icon={<Heart size={20} aria-hidden />} value={wishlists.data ? lists.length : '…'} label="вишлистов" />
        <Stat to="/lists" icon={<Gift size={20} aria-hidden />} value={wishlists.data ? wishesCount : '…'} label="желаний" />
        <Stat to="/friends" icon={<Users size={20} aria-hidden />} value={friends.data ? friends.data.friends.length : '…'} label="друзей" />
        <Stat to="/gifts" icon={<CalendarHeart size={20} aria-hidden />} value={reservedCount ?? '…'} label="забронировано мной" />
      </div>
      )}

      {show('friendRequests') && incoming > 0 && (
        <Link to="/friends/requests" className="home-alert">
          <Users size={18} aria-hidden />
          <span>
            {incoming === 1 ? 'У вас 1 новая заявка в друзья' : `Новых заявок в друзья: ${incoming}`}
          </span>
          <span className="home-alert__go">Посмотреть</span>
        </Link>
      )}

      <div className={`home-grid${showSide ? '' : ' home-grid--single'}`}>
        {showMain && (
        <div className="home-grid__main">
          {show('wishlists') && (
          <Card
            title="Мои вишлисты"
            extra={lists.length > 0 ? <Link to="/lists">Все</Link> : null}
          >
            {wishlists.isPending && <Skeleton active paragraph={{ rows: 3 }} title={false} />}
            {wishlists.data && lists.length === 0 && (
              <EmptyState text="У вас пока нет вишлистов. Создайте первый и добавьте в него желания.">
                <Link to="/lists/new">
                  <Button type="primary">Создать вишлист</Button>
                </Link>
              </EmptyState>
            )}
            {lists.length > 0 && (
              <div className="home-lists">
                {lists.slice(0, 4).map((w) => (
                  <WishlistCard key={w.id} wishlist={w} />
                ))}
              </div>
            )}
          </Card>
          )}

          {show('groups') && (
          <Card
            title="Мои игры Тайный Санта"
            extra={groups.data && groups.data.length > 0 ? <Link to="/santa">Все</Link> : null}
          >
            {groups.isPending && <Skeleton active paragraph={{ rows: 2 }} title={false} />}
            {groups.data && groups.data.length === 0 && (
              <EmptyState text="Вы пока не участвуете в играх. Создайте свою или откройте приглашение.">
                <Link to="/santa/new">
                  <Button>Создать игру</Button>
                </Link>
              </EmptyState>
            )}
            {groups.data && groups.data.length > 0 && (
              <ul className="mini-list">
                {groups.data.slice(0, 3).map((g) => (
                  <li key={g.id}>
                    <Link to={`/santa/${g.id}`} className="mini-row">
                      <span className="mini-row__main">
                        <Typography.Text strong>{g.title}</Typography.Text>
                        <Typography.Text type="secondary">
                          {g.membersCount} участн.
                          {formatBudget(g.budget, g.currency) ? ` · бюджет ${formatBudget(g.budget, g.currency)}` : ''}
                        </Typography.Text>
                      </span>
                      <Tag color={g.status === 'drawn' ? 'green' : 'blue'} bordered={false}>
                        {g.status === 'drawn' ? 'Жеребьёвка проведена' : 'Набор участников'}
                      </Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}
        </div>
        )}

        {showSide && (
        <div className="home-grid__side">
          {show('events') && (
          <Card
            title="Ближайшие праздники"
            extra={<Link to="/calendar">Календарь</Link>}
            styles={{ body: { padding: '0 24px 8px' } }}
          >
            {eventsLoading && <Skeleton active paragraph={{ rows: 3 }} title={false} />}
            {!eventsLoading && events.length === 0 && (
              <EmptyState text="Пока нет ближайших дат. Укажите дату в вишлисте или добавьте друзей." />
            )}
            {!eventsLoading && events.length > 0 && (
              <ul className="mini-list">
                {events.map((e) => (
                  <li key={e.key}>
                    <Link to={e.to} className="mini-row">
                      <span className="mini-row__icon">{EVENT_ICON[e.kind]}</span>
                      <span className="mini-row__main">
                        <Typography.Text strong>{e.title}</Typography.Text>
                        <Typography.Text type="secondary">{e.subtitle}</Typography.Text>
                      </span>
                      <span className="mini-row__when">
                        <span>{new Date(`${e.date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                        <Tag color={e.daysUntil <= 1 ? 'green' : 'blue'} bordered={false}>
                          {whenLabel(e.daysUntil)}
                        </Tag>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}

          {show('quickActions') && (
          <Card title="Быстрые действия">
            <div className="quick-actions">
              <Link to="/lists/new"><Button block icon={<Heart size={16} aria-hidden />}>Новый вишлист</Button></Link>
              <Link to="/search"><Button block icon={<Search size={16} aria-hidden />}>Найти человека</Button></Link>
              <Link to="/santa/new"><Button block icon={<Gift size={16} aria-hidden />}>Создать игру Санты</Button></Link>
            </div>
          </Card>
          )}
        </div>
        )}
      </div>
      {nothingShown && (
        <EmptyState text="Все блоки скрыты. Откройте «Настроить» и включите нужные.">
          <HomeSettingsButton />
        </EmptyState>
      )}
    </>
  );
}
