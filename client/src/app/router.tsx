import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/widgets/app-layout';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { ResetPasswordPage } from '@/pages/reset-password';
import { CalendarPage } from '@/pages/calendar';
import { ProfilePage } from '@/pages/profile';
import { SettingsPage } from '@/pages/settings';
import { NotFoundPage } from '@/pages/not-found';
import { GuestOnly, RequireAuth } from './guards';

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
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
