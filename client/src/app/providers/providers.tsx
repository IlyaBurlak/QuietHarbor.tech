import { useEffect, type ReactNode } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClientProvider } from '@tanstack/react-query';
import { ME_KEY } from '@/entities/user';
import { appTheme } from './theme';
import { queryClient, setUnauthorizedHandler } from '@/shared/api';
import '@fontsource-variable/onest/index.css';
import 'dayjs/locale/ru';
import '../styles/global.css';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Сессия протухла: сбрасываем пользователя, охрана маршрутов отправит на /login.
    setUnauthorizedHandler(() => queryClient.setQueryData(ME_KEY, null));
  }, []);

  return (
    <ConfigProvider locale={ruRU} theme={appTheme} variant="filled">
      <AntApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
