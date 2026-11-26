import { Card, Input, Skeleton } from 'antd';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { MIN_SEARCH_LENGTH, PersonRow, useUserSearch } from '@/entities/friend';
import { FriendActionButtons } from '@/features/friend-actions';
import { useDebouncedValue } from '@/shared/lib';
import { EmptyState, PageHeader } from '@/shared/ui';

/**
 * Общий поиск. Запрос, начинающийся с «@», ищет людей по нику: достаточно двух первых букв.
 * Запрос хранится в адресе (?q=), поэтому им можно поделиться и вернуться назад.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const value = params.get('q') ?? '';
  const isUser = value.trimStart().startsWith('@');
  const nick = useDebouncedValue(
    isUser ? value.trim().slice(1).toLowerCase() : '',
    250,
  );
  const ready = isUser && nick.length >= MIN_SEARCH_LENGTH;
  const { data, isFetching, isError } = useUserSearch(ready ? nick : '');

  return (
    <>
      <PageHeader title="Поиск" description="Начните с @, чтобы найти человека по нику." />
      <Input
        size="large"
        autoFocus
        prefix={<Search size={18} aria-hidden />}
        placeholder="@anna"
        value={value}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        aria-label="Поиск"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        allowClear
        style={{ maxWidth: 520, marginBottom: 20 }}
      />

      {!value && <p className="muted">Например, «@anna» найдёт пользователей, чей ник начинается с anna.</p>}
      {value && !isUser && (
        <p className="muted">Чтобы искать людей, начните запрос с «@», например «@anna».</p>
      )}
      {isUser && !ready && (
        <p className="muted">Введите ещё {MIN_SEARCH_LENGTH - nick.length} симв. ника после «@».</p>
      )}
      {ready && isFetching && <Skeleton active paragraph={{ rows: 2 }} />}
      {ready && isError && <p role="alert">Не удалось выполнить поиск. Попробуйте ещё раз.</p>}
      {ready && !isFetching && data && data.length === 0 && (
        <EmptyState text={`Никого не нашли по «@${nick}». Проверьте ник.`} />
      )}
      {ready && data && data.length > 0 && (
        <Card styles={{ body: { padding: '0 24px' } }}>
          <ul className="person-list">
            {data.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                actions={
                  <FriendActionButtons
                    relation={u.relation}
                    username={u.username ?? ''}
                    userId={u.id}
                    requestId={u.requestId}
                    size="small"
                  />
                }
              />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
