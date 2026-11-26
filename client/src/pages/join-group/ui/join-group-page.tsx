import { App, Button, Card, Result, Skeleton, Typography } from 'antd';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { UserAvatar, useCurrentUser } from '@/entities/user';
import { formatBudget, formatDate, useInvite, useJoinGroup } from '@/entities/group';
import { toApiError } from '@/shared/api';

/** /join/:code — приглашение в игру. Гость видит описание и входит с возвратом сюда же. */
export function JoinGroupPage() {
  const { code = '' } = useParams();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { data: group, isPending, isError } = useInvite(code, user?.id);
  const join = useJoinGroup();

  if (isPending) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (isError || !group) {
    return (
      <Result
        status="404"
        title="Приглашение не найдено"
        subTitle="Ссылка устарела или организатор её перевыпустил. Попросите новую."
        extra={
          <Link to="/">
            <Button>На главную</Button>
          </Link>
        }
      />
    );
  }

  const budget = formatBudget(group.budget, group.currency);
  const state = { from: location.pathname };

  const onJoin = async () => {
    try {
      const { groupId } = await join.mutateAsync(code);
      void message.success('Вы в игре');
      navigate(`/santa/${groupId}`, { replace: true });
    } catch (e) {
      void message.error(toApiError(e).message);
    }
  };

  return (
    <Card className="form-card" style={{ marginTop: 24 }}>
      <Typography.Text type="secondary">Приглашение в «Тайный Санта»</Typography.Text>
      <h1 className="page-title" style={{ marginTop: 4 }}>
        {group.title}
      </h1>
      <div className="public-head" style={{ marginBottom: 12 }}>
        <UserAvatar fullName={group.owner.fullName} avatarKey={group.owner.avatarKey} size={44} />
        <Typography.Text>
          Приглашает <strong>{group.owner.fullName}</strong>
        </Typography.Text>
      </div>
      {group.description && <Typography.Paragraph>{group.description}</Typography.Paragraph>}
      <ul className="facts-list">
        <li>Участников: {group.membersCount}</li>
        {budget && <li>Бюджет подарка: {budget}</li>}
        {group.exchangeDate && <li>Обмен подарками: {formatDate(group.exchangeDate)}</li>}
      </ul>

      {group.status === 'drawn' && !group.joinedGroupId && (
        <Result status="warning" title="Жеребьёвка уже проведена" subTitle="Состав закрыт, вступить нельзя." />
      )}
      {group.joinedGroupId ? (
        <Link to={`/santa/${group.joinedGroupId}`}>
          <Button type="primary">Вы уже в игре — открыть</Button>
        </Link>
      ) : group.status === 'open' ? (
        user ? (
          <Button type="primary" size="large" loading={join.isPending} onClick={() => void onJoin()}>
            Вступить в игру
          </Button>
        ) : (
          <div className="reserve-actions">
            <Link to="/login" state={state}>
              <Button type="primary" size="large">
                Войти и вступить
              </Button>
            </Link>
            <Link to="/register" state={state}>
              <Button size="large">Создать аккаунт</Button>
            </Link>
          </div>
        )
      ) : null}
    </Card>
  );
}
