import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/widgets/app-layout';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { ResetPasswordPage } from '@/pages/reset-password';
import { ComingSoonPage } from '@/pages/coming-soon';
import { CalendarPage } from '@/pages/calendar';
import { ProfilePage } from '@/pages/profile';
import { SettingsPage } from '@/pages/settings';
import { NotFoundPage } from '@/pages/not-found';
import { GuestOnly, RequireAuth } from './guards';

/** Разделы из плана, которые появятся в своих эпиках. Пока показывают заглушку, чтобы навигация была целой. */
const SOON: { path: string; title: string; description?: string }[] = [
  { path: '/lists', title: 'Мои желания', description: 'Ваши вишлисты и желания.' },
  { path: '/lists/new', title: 'Создать вишлист' },
  { path: '/lists/secret', title: 'Секретные', description: 'Вишлисты, которые видите только вы.' },
  { path: '/lists/done', title: 'Исполненные', description: 'Желания, которые уже сбылись.' },
  {
    path: '/gifts',
    title: 'Забронировано мной',
    description: 'Подарки, которые вы выбрали друзьям.',
  },
  { path: '/friends', title: 'Друзья' },
  { path: '/friends/requests', title: 'Заявки' },
  { path: '/friends/find', title: 'Найти друзей', description: 'Поиск по имени пользователя.' },
  { path: '/santa', title: 'Тайный Санта', description: 'Ваши игры.' },
  { path: '/santa/new', title: 'Создать игру' },
  { path: '/search', title: 'Поиск' },
];

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset/:token" element={<ResetPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            {SOON.map(({ path, title, description }) => (
              <Route
                key={path}
                path={path}
                element={<ComingSoonPage title={title} description={description} />}
              />
            ))}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
