import { Button, Card, Result, Skeleton } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useGroup } from '@/entities/group';
import { GroupForm } from '@/features/group-form';
import { PageHeader } from '@/shared/ui';

/** /santa/new — создать игру, /santa/:id/edit — изменить (только организатор). */
export function SantaEditPage() {
  const { id } = useParams();
  const { data, isPending, isError } = useGroup(id ?? '');
  const editing = !!id;
  const forbidden = editing && !!data && !data.isOwner;

  return (
    <>
      <PageHeader title={editing ? 'Изменить игру' : 'Создать игру'} />
      <Card className="form-card">
        {editing && isPending && <Skeleton active />}
        {editing && (isError || forbidden) && (
          <Result
            status="404"
            title="Игра не найдена"
            extra={
              <Link to="/santa">
                <Button>К моим играм</Button>
              </Link>
            }
          />
        )}
        {!editing && <GroupForm />}
        {editing && data && !forbidden && <GroupForm group={data} />}
      </Card>
    </>
  );
}
