import type { ReactNode } from 'react';
import { Col, Grid, Row, Typography } from 'antd';
import { Link } from 'react-router-dom';

const steps = [
  'Создайте список желаний',
  'Поделитесь ссылкой',
  'Друзья бронируют подарки втайне от вас',
];

/** Двухколоночный каркас страниц входа и регистрации: описание слева, форма справа. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const screens = Grid.useBreakpoint();
  const wide = !!screens.md;

  return (
    <main className="auth-shell">
      <Row
        gutter={[{ xs: 0, md: 48 }, 24]}
        align="middle"
        justify="center"
        style={{ maxWidth: 960, margin: '0 auto' }}
      >
        <Col xs={24} md={12}>
          <Link to="/" className="auth-brand">
            Wishlist
          </Link>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
            Списки желаний и Тайный Санта для друзей и семьи.
          </Typography.Paragraph>
          {wide && (
            <ol className="auth-steps">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
        </Col>
        <Col xs={24} md={12}>
          <section className="auth-card" aria-labelledby="auth-title">
            <Typography.Title level={1} id="auth-title" style={{ fontSize: 24, marginTop: 0 }}>
              {title}
            </Typography.Title>
            {children}
          </section>
        </Col>
      </Row>
    </main>
  );
}
