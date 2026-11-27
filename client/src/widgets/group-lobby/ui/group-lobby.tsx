import { useState } from 'react';
import { App, Button, Card, Input, Popconfirm, Select, Tag, Typography } from 'antd';
import { Copy, UserMinus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MIN_GROUP_MEMBERS, type GroupDetail } from '@wishlist/shared';
import { inviteUrl, useGroupActions } from '@/entities/group';
import { PersonRow } from '@/entities/friend';
import { MyWishlistSelect } from '@/features/group-my-wishlist';
import { toApiError } from '@/shared/api';

/** Страница группы до жеребьёвки: участники, приглашение, свой вишлист, для организатора — исключения и жеребьёвка. */
export function GroupLobby({ group, currentUserId }: { group: GroupDetail; currentUserId: string }) {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const actions = useGroupActions(group.id);
  const [pairA, setPairA] = useState<string>();
  const [pairB, setPairB] = useState<string>();
  const url = inviteUrl(group.inviteCode);
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.fullName ?? '—';
  const enough = group.members.length >= MIN_GROUP_MEMBERS;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) void message.success(ok);
    } catch (e) {
      void message.error(toApiError(e).message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      void message.success('Ссылка скопирована');
    } catch {
      void message.error('Не удалось скопировать — выделите ссылку вручную');
    }
  };

  const confirmDraw = () =>
    modal.confirm({
      title: 'Провести жеребьёвку?',
      content:
        'Дальше состав не меняется: никого нельзя будет добавить или убрать. Пары увидит только сам даритель.',
      okText: 'Провести',
      cancelText: 'Отмена',
      onOk: () => run(() => actions.draw.mutateAsync(), 'Жеребьёвка проведена'),
    });

  return (
    <div className="group-sections">
      <Card title="Пригласить участников">
        <p className="muted" style={{ marginTop: 0 }}>
          Отправьте ссылку тем, кто будет играть. Вступить можно до жеребьёвки.
        </p>
        <div className="copy-row">
          <Input readOnly value={url} aria-label="Ссылка-приглашение" onFocus={(e) => e.target.select()} />
          <Button icon={<Copy size={16} aria-hidden />} onClick={() => void copy()} aria-label="Скопировать ссылку" />
        </div>
        {group.isOwner && (
          <Popconfirm
            title="Перевыпустить ссылку?"
            description="Старая ссылка перестанет работать."
            okText="Перевыпустить"
            cancelText="Отмена"
            onConfirm={() => run(() => actions.regenerate.mutateAsync(), 'Ссылка обновлена')}
          >
            <Button type="link" style={{ paddingLeft: 0, marginTop: 8 }}>
              Перевыпустить ссылку
            </Button>
          </Popconfirm>
        )}
      </Card>

      <Card title={`Участники · ${group.members.length}`}>
        <ul className="person-list">
          {group.members.map((m) => (
            <PersonRow
              key={m.id}
              user={m}
              actions={
                <>
                  {m.isOwner && <Tag bordered={false}>Организатор</Tag>}
                  {m.hasWishlist && <Tag bordered={false}>Вишлист есть</Tag>}
                  {group.isOwner && m.id !== currentUserId && (
                    <Popconfirm
                      title={`Убрать ${m.fullName}?`}
                      okText="Убрать"
                      cancelText="Отмена"
                      onConfirm={() => run(() => actions.kick.mutateAsync(m.id), 'Участник убран')}
                    >
                      <Button
                        type="text"
                        aria-label={`Убрать ${m.fullName}`}
                        icon={<UserMinus size={16} aria-hidden />}
                      />
                    </Popconfirm>
                  )}
                </>
              }
            />
          ))}
        </ul>
      </Card>

      <Card title="Мой вишлист">
        <p className="muted" style={{ marginTop: 0 }}>
          Тот, кто будет дарить вам подарок, увидит этот вишлист. Выберите его, даже если он «только я»:
          в игре его увидит лишь ваш Санта.
        </p>
        <MyWishlistSelect groupId={group.id} value={group.myWishlistId} />
      </Card>

      {group.isOwner && (
        <Card title="Исключения">
          <p className="muted" style={{ marginTop: 0 }}>
            Пары, которые не должны выпасть друг другу (супруги, братья). Правило действует в обе стороны.
          </p>
          {group.exclusions.length > 0 && (
            <ul className="chip-list">
              {group.exclusions.map((e) => (
                <li key={e.id}>
                  <Tag
                    closable
                    closeIcon={<X size={12} aria-label="Убрать исключение" />}
                    onClose={(ev) => {
                      ev.preventDefault();
                      void run(() => actions.removeExclusion.mutateAsync(e.id));
                    }}
                  >
                    {nameOf(e.userAId)} ↔ {nameOf(e.userBId)}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
          <div className="pair-row">
            <Select
              placeholder="Первый"
              value={pairA}
              onChange={setPairA}
              options={group.members.map((m) => ({ value: m.id, label: m.fullName }))}
              aria-label="Первый участник"
            />
            <Select
              placeholder="Второй"
              value={pairB}
              onChange={setPairB}
              options={group.members
                .filter((m) => m.id !== pairA)
                .map((m) => ({ value: m.id, label: m.fullName }))}
              aria-label="Второй участник"
            />
            <Button
              disabled={!pairA || !pairB}
              loading={actions.addExclusion.isPending}
              onClick={() =>
                run(async () => {
                  await actions.addExclusion.mutateAsync({ userAId: pairA!, userBId: pairB! });
                  setPairA(undefined);
                  setPairB(undefined);
                }, 'Исключение добавлено')
              }
            >
              Добавить
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {group.isOwner ? (
          <>
            <Typography.Paragraph>
              {enough
                ? 'Когда все в сборе, проведите жеребьёвку. Каждый узнает только своего получателя, даже вы не увидите чужие пары.'
                : `Для жеребьёвки нужно минимум ${MIN_GROUP_MEMBERS} участника. Сейчас ${group.members.length}.`}
            </Typography.Paragraph>
            <Button type="primary" size="large" disabled={!enough} loading={actions.draw.isPending} onClick={confirmDraw}>
              Провести жеребьёвку
            </Button>
          </>
        ) : (
          <>
            <Typography.Paragraph>Организатор проведёт жеребьёвку, когда все соберутся.</Typography.Paragraph>
            <Popconfirm
              title="Выйти из игры?"
              okText="Выйти"
              cancelText="Отмена"
              onConfirm={() =>
                run(async () => {
                  await actions.leave.mutateAsync();
                  navigate('/santa');
                }, 'Вы вышли из игры')
              }
            >
              <Button danger>Выйти из игры</Button>
            </Popconfirm>
          </>
        )}
      </Card>
    </div>
  );
}
