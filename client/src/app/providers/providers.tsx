import { useEffect, type ReactNode } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClientProvider } from '@tanstack/react-query';
import { ME_KEY } from '@/entities/user';
import { queryClient, setUnauthorizedHandler } from '@/shared/api';
import 'dayjs/locale/ru';
import '../styles/global.css';

const theme = {
  token: {
    colorPrimary: '#1F5F7A',
    colorLink: '#1F5F7A',
    colorLinkHover: '#174B61',
    colorLinkActive: '#174B61',
    colorBgLayout: '#F7F5F1',
    colorBorder: '#E3DFD8',
    colorText: '#1D2326',
    colorTextSecondary: '#5B6469',
    colorTextPlaceholder: '#6B7479',
    borderRadius: 6,
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 16,
    controlHeight: 44,
  },
  components: {
    Layout: { headerBg: '#FFFFFF', headerColor: '#1D2326' },
  },
};

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Сессия протухла: сбрасываем пользователя, охрана маршрутов отправит на /login.
    setUnauthorizedHandler(() => queryClient.setQueryData(ME_KEY, null));
  }, []);

  return (
    <ConfigProvider locale={ruRU} theme={theme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
