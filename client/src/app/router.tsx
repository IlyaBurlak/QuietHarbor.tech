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
import { WishlistsPage } from '@/pages/wishlists';
import { WishlistEditPage } from '@/pages/wishlist-edit';
import { WishlistViewPage } from '@/pages/wishlist-view';
import { ItemEditPage } from '@/pages/item-edit';
import { ItemViewPage } from '@/pages/item-view';
import { PublicWishlistPage } from '@/pages/public-wishlist';
import { GiftsPage } from '@/pages/gifts';
import { NotFoundPage } from '@/pages/not-found';
import { GuestOnly, RequireAuth } from './guards';
import { PublicLayout } from './public-layout';

/** Разделы из плана, которые появятся в своих эпиках. Пока показывают заглушку, чтобы навигация была целой. */
const SOON: { path: string; title: string; description?: string }[] = [
  { path: '/lists/secret', title: 'Секретные', description: 'Вишлисты, которые видите только вы.' },
  { path: '/lists/done', title: 'Исполненные', description: 'Желания, которые уже сбылись.' },
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
        <Route element={<PublicLayout />}>
          <Route path="/w/:slug" element={<PublicWishlistPage />} />
        </Route>
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
            <Route path="/lists" element={<WishlistsPage />} />
            <Route path="/lists/new" element={<WishlistEditPage />} />
            <Route path="/lists/:id" element={<WishlistViewPage />} />
            <Route path="/lists/:id/items/new" element={<ItemEditPage />} />
            <Route path="/lists/:id/items/:itemId" element={<ItemViewPage />} />
            <Route path="/lists/:id/items/:itemId/edit" element={<ItemEditPage />} />
            <Route path="/gifts" element={<GiftsPage />} />
            <Route path="/lists/:id/edit" element={<WishlistEditPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
