import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Серое число рядом с заголовком: «Календарь 12». */
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Крупный заголовок страницы с числом, описанием и действиями справа. */
export function PageHeader({ title, count, description, actions }: Props) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1 className="page-title">
          {title}
          {count !== undefined && <span className="page-title__count">{count}</span>}
        </h1>
        {description && <p className="page-header__desc">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
