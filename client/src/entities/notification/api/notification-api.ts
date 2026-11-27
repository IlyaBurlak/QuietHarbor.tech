import type { NotificationDto, NotificationSummary } from '@wishlist/shared';
import { http } from '@/shared/api';

export const fetchNotifications = () =>
  http.get<{ notifications: NotificationDto[] }>('/notifications').then((r) => r.data.notifications);
export const fetchSummary = () =>
  http.get<NotificationSummary>('/notifications/summary').then((r) => r.data);
export const markReadRequest = (id: string) =>
  http.post(`/notifications/${id}/read`).then(() => undefined);
export const markAllReadRequest = () => http.post('/notifications/read').then(() => undefined);
