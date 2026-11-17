export interface PasswordCheck {
  id: string;
  label: string;
  required: boolean;
  passed: boolean;
}

export interface PasswordStrength {
  checks: PasswordCheck[];
  /** Сколько пунктов выполнено и сколько всего. */
  passedCount: number;
  total: number;
  /** Заполненные сегменты шкалы, 0–4. */
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const LABELS = ['', 'Слабый', 'Средний', 'Хороший', 'Надёжный'] as const;

export function evaluatePassword(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    { id: 'len8', label: 'Не короче 8 символов', required: true, passed: password.length >= 8 },
    {
      id: 'case',
      label: 'Строчные и заглавные буквы',
      required: false,
      passed: /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password),
    },
    { id: 'digit', label: 'Хотя бы одна цифра', required: false, passed: /\d/.test(password) },
    {
      id: 'symbol',
      label: 'Спецсимвол, например ! ? # $',
      required: false,
      passed: /[^\p{L}\d\s]/u.test(password),
    },
    { id: 'len12', label: '12 символов и больше', required: false, passed: password.length >= 12 },
  ];
  const passedCount = checks.filter((c) => c.passed).length;

  let level: PasswordStrength['level'] = 0;
  if (password.length > 0) {
    if (!checks[0]!.passed) level = 1;
    else level = Math.min(4, Math.max(1, passedCount - 1)) as PasswordStrength['level'];
  }
  const label = password.length > 0 && !checks[0]!.passed ? 'Слишком короткий' : LABELS[level]!;

  return { checks, passedCount, total: checks.length, level, label };
}
