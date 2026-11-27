import type {
  AdminAuditEntry,
  AdminResetRequest,
  AdminStats,
  AdminUserCard,
  AdminUsersPage,
  SessionUser,
} from '@wishlist/shared';
import { adminHttp } from '@/shared/api';

export interface UsersParams {
  q?: string;
  status: 'all' | 'active' | 'blocked';
  sort: 'createdAt' | 'lastLoginAt';
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const adminLoginRequest = (username: string, password: string) =>
  adminHttp.post<{ user: SessionUser }>('/auth/login', { username, password }).then((r) => r.data.user);
export const adminLogoutRequest = () => adminHttp.post('/auth/logout').then(() => undefined);
export const fetchAdminMe = () =>
  adminHttp.get<{ user: SessionUser }>('/auth/me').then((r) => r.data.user);

export const fetchAdminStats = () => adminHttp.get<AdminStats>('/stats').then((r) => r.data);
export const fetchAdminUsers = (params: UsersParams) =>
  adminHttp.get<AdminUsersPage>('/users', { params }).then((r) => r.data);
export const fetchAdminUser = (id: string) =>
  adminHttp.get<{ user: AdminUserCard }>(`/users/${id}`).then((r) => r.data.user);
export const blockUserRequest = (id: string, reason: string) =>
  adminHttp.post(`/users/${id}/block`, { reason }).then(() => undefined);
export const unblockUserRequest = (id: string) =>
  adminHttp.post(`/users/${id}/unblock`).then(() => undefined);

export const fetchResetRequests = (status: string) =>
  adminHttp
    .get<{ requests: AdminResetRequest[] }>('/reset-requests', { params: { status } })
    .then((r) => r.data.requests);
export const createResetLinkRequest = (id: string) =>
  adminHttp.post<{ url: string; expiresInHours: number }>(`/reset-requests/${id}/link`).then((r) => r.data);
export const rejectResetRequest = (id: string) =>
  adminHttp.post(`/reset-requests/${id}/reject`).then(() => undefined);

export const fetchAudit = (page: number, pageSize: number) =>
  adminHttp
    .get<{ entries: AdminAuditEntry[]; total: number }>('/audit', { params: { page, pageSize } })
    .then((r) => r.data);
