import type { ReactNode } from 'react';

/** Пустое состояние: короткая фраза и одно действие. */
export function EmptyState({ text, children }: { text: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      {children}
    </div>
  );
}
