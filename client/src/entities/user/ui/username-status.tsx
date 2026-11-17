import { FieldStatusIcon, type IconStatus } from '@/shared/ui';
import type { UsernameStatus } from '../model/use-username-availability';

export type FieldStatus = UsernameStatus | 'invalid';

const TEXT: Record<FieldStatus, string> = {
  idle: '',
  checking: 'Проверяем…',
  available: 'Имя свободно',
  taken: 'Это имя уже занято',
  invalid: '',
};

const ICON: Record<FieldStatus, IconStatus> = {
  idle: 'idle',
  checking: 'checking',
  available: 'ok',
  taken: 'bad',
  invalid: 'bad',
};

export function UsernameStatusIcon({ status }: { status: FieldStatus }) {
  return <FieldStatusIcon status={ICON[status]} />;
}

/** Статус и подпись для Form.Item по ошибке валидации и результату проверки занятости. */
export function usernameFieldState(errorMessage: string | undefined, availability: UsernameStatus) {
  const status: FieldStatus = errorMessage ? 'invalid' : availability;
  const bad = status === 'invalid' || status === 'taken';
  const message = errorMessage ?? TEXT[status];
  return {
    status,
    bad,
    validateStatus: bad
      ? ('error' as const)
      : status === 'available'
        ? ('success' as const)
        : undefined,
    message,
    hintClass: `field-hint field-hint--${bad ? 'bad' : status}`,
  };
}
