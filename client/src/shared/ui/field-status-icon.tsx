import { CheckCircleFilled, LoadingOutlined, StopFilled } from '@ant-design/icons';

export type IconStatus = 'idle' | 'checking' | 'ok' | 'bad';

/** Значок в конце поля. Всегда рендерит один узел, чтобы поле не пересоздавалось (иначе теряется фокус). */
export function FieldStatusIcon({ status }: { status: IconStatus }) {
  if (status === 'ok')
    return <CheckCircleFilled className="status-icon status-icon--ok" aria-hidden />;
  if (status === 'bad') return <StopFilled className="status-icon status-icon--bad" aria-hidden />;
  if (status === 'checking') return <LoadingOutlined className="status-icon" aria-hidden />;
  return <span className="status-icon" aria-hidden />;
}
