export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU') : '—';

export const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'не входил';

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

export const PROVIDER_LABEL: Record<string, string> = {
  password: 'Пароль',
  telegram: 'Telegram',
  google: 'Google',
  github: 'GitHub',
};

export const AUDIT_LABEL: Record<string, string> = {
  'admin.login': 'Вход администратора',
  'reset.link': 'Создана ссылка сброса пароля',
  'reset.reject': 'Заявка на сброс отклонена',
  'user.block': 'Пользователь заблокирован',
  'user.unblock': 'Пользователь разблокирован',
};
