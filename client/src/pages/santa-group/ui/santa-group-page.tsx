import { App, Button, Dropdown, Result, Skeleton, Tag, Typography } from 'antd';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/entities/user';
import { formatBudget, formatDate, useGroup, useGroupActions } from '@/entities/group';
import { PageHeader } from '@/shared/ui';
import { GroupLobby } from '@/widgets/group-lobby';
import { GroupResult } from '@/widgets/group-result';

export function SantaGroupPage() {
  const { id = '' } = useParams();
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: group, isPending, isError } = useGroup(id);
  const actions = useGroupActions(id);

  if (isPending) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (isError || !group || !user) {
    return (
      <Result
        status="404"
        title="Игра не найдена"
        extra={
          <Link to="/santa">
            <Button>К моим играм</Button>
          </Link>
        }
      />
    );
  }

  const confirmDelete = () =>
    modal.confirm({
      title: `Удалить игру «${group.title}»?`,
      content: 'Участники и результаты жеребьёвки будут удалены. Это нельзя отменить.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await actions.remove.mutateAsync();
        void message.success('Игра удалена');
        navigate('/santa', { replace: true });
      },
    });

  const budget = formatBudget(group.budget, group.currency);
  return (
    <>
      <PageHeader
        title={group.title}
        description={
          <>
            <Tag color={group.status === 'drawn' ? 'green' : 'blue'} bordered={false}>
              {group.status === 'drawn' ? 'Жеребьёвка проведена' : 'Набор участников'}
            </Tag>
            {[
              budget && `Бюджет ${budget}`,
              group.drawDate && `Жеребьёвка ${formatDate(group.drawDate)}`,
              group.exchangeDate && `Обмен ${formatDate(group.exchangeDate)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
            {group.description && (
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                {group.description}
              </Typography.Paragraph>
            )}
          </>
        }
        actions={
          group.isOwner && (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'edit', icon: <Pencil size={14} />, label: 'Изменить' },
                  { key: 'delete', icon: <Trash2 size={14} />, label: 'Удалить', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'edit') navigate(`/santa/${group.id}/edit`);
                  if (key === 'delete') confirmDelete();
                },
              }}
            >
              <Button icon={<MoreHorizontal size={16} aria-hidden />} aria-label="Действия с игрой" />
            </Dropdown>
          )
        }
      />
      {group.status === 'open' ? (
        <GroupLobby group={group} currentUserId={user.id} />
      ) : (
        <GroupResult group={group} />
      )}
    </>
  );
}
