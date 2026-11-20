import { CheckCircleFilled, MinusCircleOutlined } from '@ant-design/icons';
import { evaluatePassword } from './evaluate-password';

const LEVEL_COLORS = ['rgba(255,255,255,0.16)', '#ff6b61', '#ffb74d', '#3ddc84', '#7aa2ff'];

/** Шкала надёжности и список условий; обновляется при каждом символе. */
export function PasswordStrength({ password }: { password: string }) {
  const s = evaluatePassword(password);
  const color = LEVEL_COLORS[s.level]!;
  const tooShort = password.length > 0 && s.level === 1 && !s.checks[0]!.passed;

  return (
    <div className="pw-strength">
      <div className="pw-strength__head">
        <span id="pw-strength-label" className="pw-strength__label" style={{ color }}>
          {password ? s.label : 'Надёжность пароля'}
        </span>
        <span className="pw-strength__count">
          Выполнено {s.passedCount} из {s.total}
        </span>
      </div>
      <div
        className="pw-strength__bar"
        role="progressbar"
        aria-labelledby="pw-strength-label"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={s.level}
      >
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="pw-strength__seg"
            style={{ background: i <= s.level ? color : undefined }}
          />
        ))}
      </div>
      <ul className="pw-strength__list" aria-live="polite">
        {s.checks.map((c) => (
          <li key={c.id} className={c.passed ? 'is-ok' : undefined}>
            {c.passed ? <CheckCircleFilled aria-hidden /> : <MinusCircleOutlined aria-hidden />}
            <span>
              {c.label}
              {!c.required && ' (рекомендуется)'}
              <span className="sr-only">{c.passed ? ' — выполнено' : ' — не выполнено'}</span>
            </span>
          </li>
        ))}
      </ul>
      {tooShort && (
        <span className="sr-only" role="alert">
          Пароль слишком короткий
        </span>
      )}
    </div>
  );
}
