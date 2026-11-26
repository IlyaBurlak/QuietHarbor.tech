import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface State {
  failed: boolean;
}

/** Последняя линия защиты: если что-то в интерфейсе упало, человек видит понятное сообщение, а не пустой экран. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Result
        status="error"
        title="Что-то пошло не так"
        subTitle="Страница не смогла отобразиться. Попробуйте обновить её; если ошибка повторяется, напишите в поддержку."
        extra={[
          <Button key="reload" type="primary" onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>,
          <Button key="home" onClick={() => window.location.assign('/')}>
            На главную
          </Button>,
        ]}
        style={{ paddingTop: 80 }}
      />
    );
  }
}
