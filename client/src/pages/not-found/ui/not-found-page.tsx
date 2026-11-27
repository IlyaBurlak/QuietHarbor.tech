import { Link } from 'react-router-dom';
import { Button, Result } from 'antd';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Страница не найдена"
      subTitle="Возможно, ссылка устарела или в ней опечатка."
      extra={
        <Link to="/">
          <Button type="primary">На главную</Button>
        </Link>
      }
    />
  );
}
