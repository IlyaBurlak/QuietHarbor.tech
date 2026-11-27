import { Button, Card, Result, Skeleton, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PersonRow, useFriends } from '@/entities/friend';
import { FriendActionButtons } from '@/features/friend-actions';
import { EmptyState, PageHeader } from '@/shared/ui';

export type FriendsView = 'list' | 'requests';

const TITLES: Record<FriendsView, string> = {
  list: 'Друзья',
  requests: 'Заявки',
};
const PATHS: Record<FriendsView, string> = {
  list: '/friends',
  requests: '/friends/requests',
};

function ListView() {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useFriends();
  if (isPending) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (isError) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить друзей"
        extra={<Button onClick={() => void refetch()}>Повторить</Button>}
      />
    );
  }
  return data.friends.length === 0 ? (
    <EmptyState text="Пока нет друзей. Найдите человека по нику и отправьте заявку.">
      <Button type="primary" onClick={() => navigate('/search')}>
        Найти друзей
      </Button>
    </EmptyState>
  ) : (
    <Card styles={{ body: { padding: '0 24px' } }}>
      <ul className="person-list">
        {data.friends.map((u) => (
          <PersonRow
            key={u.id}
            user={u}
            actions={
              <FriendActionButtons
                relation="friend"
                username={u.username ?? ''}
                userId={u.id}
                requestId={null}
                size="small"
              />
            }
          />
        ))}
      </ul>
    </Card>
  );
}

function RequestsView() {
  const { data, isPending, isError, refetch } = useFriends();
  if (isPending) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (isError) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить заявки"
        extra={<Button onClick={() => void refetch()}>Повторить</Button>}
      />
    );
  }
  const none = data.incoming.length === 0 && data.outgoing.length === 0;
  return (
    <>
      {none && <EmptyState text="Заявок нет. Здесь появятся входящие и отправленные вами." />}
      {data.incoming.length > 0 && (
        <section className="calendar-group" aria-labelledby="req-in">
          <h2 id="req-in" className="section-title">
            Входящие
          </h2>
          <Card styles={{ body: { padding: '0 24px' } }}>
            <ul className="person-list">
              {data.incoming.map((r) => (
                <PersonRow
                  key={r.id}
                  user={r.user}
                  actions={
                    <FriendActionButtons
                      relation="incoming"
                      username={r.user.username ?? ''}
                      userId={r.user.id}
                      requestId={r.id}
                      size="small"
                    />
                  }
                />
              ))}
            </ul>
          </Card>
        </section>
      )}
      {data.outgoing.length > 0 && (
        <section className="calendar-group" aria-labelledby="req-out">
          <h2 id="req-out" className="section-title">
            Отправленные
          </h2>
          <Card styles={{ body: { padding: '0 24px' } }}>
            <ul className="person-list">
              {data.outgoing.map((r) => (
                <PersonRow
                  key={r.id}
                  user={r.user}
                  actions={
                    <FriendActionButtons
                      relation="outgoing"
                      username={r.user.username ?? ''}
                      userId={r.user.id}
                      requestId={r.id}
                      size="small"
                    />
                  }
                />
              ))}
            </ul>
          </Card>
        </section>
      )}
    </>
  );
}

export function FriendsPage({ view }: { view: FriendsView }) {
  const navigate = useNavigate();
  const { data } = useFriends();
  return (
    <>
      <PageHeader
        title={TITLES[view]}
        count={view === 'list' ? data?.friends.length || undefined : undefined}
        description={
          view === 'requests'
            ? 'Кто хочет дружить с вами и кому вы отправили заявку.'
            : 'Друзья видят ваши вишлисты «для друзей» и дату рождения.'
        }
      />
      <Tabs
        activeKey={view}
        onChange={(k) => navigate(PATHS[k as FriendsView])}
        items={[
          { key: 'list', label: 'Друзья' },
          { key: 'requests', label: data?.incoming.length ? `Заявки (${data.incoming.length})` : 'Заявки' },
        ]}
      />
      {view === 'list' && <ListView />}
      {view === 'requests' && <RequestsView />}
    </>
  );
}
