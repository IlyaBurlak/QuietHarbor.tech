import { BrowserRouter, Route, Routes, useSearchParams } from 'react-router-dom';
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
import { SearchPage } from '@/pages/search';
import { FriendsPage } from '@/pages/friends';
import { UserProfilePage } from '@/pages/user-profile';
import { SantaListPage } from '@/pages/santa-list';
import { SantaEditPage } from '@/pages/santa-edit';
import { SantaGroupPage } from '@/pages/santa-group';
import { JoinGroupPage } from '@/pages/join-group';
import { AdminLayout } from '@/widgets/admin-layout';
import { AdminLoginPage } from '@/pages/admin-login';
import { AdminStatsPage } from '@/pages/admin-stats';
import { AdminUsersPage } from '@/pages/admin-users';
import { AdminRequestsPage } from '@/pages/admin-requests';
import { AdminAuditPage } from '@/pages/admin-audit';
import { NotFoundPage } from '@/pages/not-found';
import { GuestOnly, RequireAuth } from './guards';
import { PublicLayout } from './public-layout';

/** Разделы из плана, которые появятся в своих эпиках. Пока показывают заглушку, чтобы навигация была целой. */
const SOON: { path: string; title: string; description?: string }[] = [
  { path: '/lists/secret', title: 'Секретные', description: 'Вишлисты, которые видите только вы.' },
  { path: '/lists/done', title: 'Исполненные', description: 'Желания, которые уже сбылись.' },
];

/** Из заявки можно открыть карточку: /admin/users?open=<id>. */
function AdminUsersRoute() {
  const [params] = useSearchParams();
  return <AdminUsersPage key={params.get('open') ?? 'list'} initialUserId={params.get('open') ?? undefined} />;
}

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
          <Route path="/join/:code" element={<JoinGroupPage />} />
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
            <Route path="/friends" element={<FriendsPage view="list" />} />
            <Route path="/friends/requests" element={<FriendsPage view="requests" />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/u/:username" element={<UserProfilePage />} />
            <Route path="/santa" element={<SantaListPage />} />
            <Route path="/santa/new" element={<SantaEditPage />} />
            <Route path="/santa/:id" element={<SantaGroupPage />} />
            <Route path="/santa/:id/edit" element={<SantaEditPage />} />
            <Route path="/lists/:id/edit" element={<WishlistEditPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminStatsPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="users" element={<AdminUsersRoute />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
