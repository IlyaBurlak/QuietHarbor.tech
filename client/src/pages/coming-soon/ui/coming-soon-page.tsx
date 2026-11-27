import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { EmptyState, PageHeader } from '@/shared/ui';

/** Раздел из плана, который ещё не реализован. Заменяется настоящей страницей в своём эпике. */
export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState text="Этот раздел ещё в разработке и скоро появится.">
        <Link to="/">
          <Button>На главную</Button>
        </Link>
      </EmptyState>
    </>
  );
}
