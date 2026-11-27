import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Anchor } from 'lucide-react';
import { APP_NAME } from '@/shared/config';

const steps = [
  'Создайте список желаний',
  'Поделитесь ссылкой',
  'Друзья бронируют подарки втайне от вас',
];

function Brand() {
  return (
    <Link to="/" className="brand" aria-label={`${APP_NAME}, на главную`}>
      <Anchor size={28} strokeWidth={2.4} aria-hidden />
      <span className="brand__name">{APP_NAME}</span>
    </Link>
  );
}

/** Каркас входа и регистрации: слева карточка с обещанием, справа тёмная панель с формой. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-modal">
        <aside className="auth-art">
          <Brand />
          <div className="auth-art__bottom">
            <p className="auth-art__tagline">Желания сбываются, когда о них знают друзья</p>
            <ol className="auth-steps">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </aside>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card__brand">
            <Brand />
          </div>
          <h1 id="auth-title" className="auth-card__title">
            {title}
          </h1>
          {children}
        </section>
      </div>
    </main>
  );
}
