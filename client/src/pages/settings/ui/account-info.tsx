import { Link } from 'react-router-dom';
import { Card } from 'antd';
import type { Profile } from '@wishlist/shared';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/** Краткие сведения об аккаунте: только то, что пользователь и так знает о себе. */
export function AccountInfo({ profile }: { profile: Profile }) {
  return (
    <Card title="Аккаунт">
      <dl className="info-list">
        <div className="info-row">
          <dt>Имя пользователя</dt>
          <dd>{profile.username ? `@${profile.username}` : 'не выбрано'}</dd>
        </div>
        <div className="info-row">
          <dt>Регистрация</dt>
          <dd>{formatDate(profile.createdAt)}</dd>
        </div>
        <div className="info-row">
          <dt>Вход по паролю</dt>
          <dd>{profile.hasPassword ? 'включён' : 'не задан'}</dd>
        </div>
      </dl>
      <Link to="/profile">Изменить данные профиля</Link>
    </Card>
  );
}
