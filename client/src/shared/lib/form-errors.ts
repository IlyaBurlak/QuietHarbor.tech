import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toApiError } from '@/shared/api';

/**
 * Раскладывает ошибку API по полям формы.
 * Возвращает общее сообщение, если ошибка не относится к конкретным полям.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null {
  const api = toApiError(error);
  let matched = false;
  for (const [name, message] of Object.entries(api.fields ?? {})) {
    if (knownFields.includes(name)) {
      setError(name as Path<T>, { type: 'server', message });
      matched = true;
    }
  }
  return matched ? null : api.message;
}
