import type { ReactNode } from 'react';
import { CheckOutlined, ExclamationOutlined } from '@ant-design/icons';

/** Компактное сообщение о результате: маленький значок, заголовок, одна строка пояснения. */
export function StatusMessage({
  kind,
  title,
  text,
  children,
}: {
  kind: 'success' | 'warning';
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="status-message">
      <span className={`status-message__icon status-message__icon--${kind}`} aria-hidden>
        {kind === 'success' ? <CheckOutlined /> : <ExclamationOutlined />}
      </span>
      <h2 className="status-message__title">{title}</h2>
      {text && <p className="status-message__text">{text}</p>}
      {children}
    </div>
  );
}
