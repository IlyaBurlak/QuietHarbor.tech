import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/widgets/app-layout';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
