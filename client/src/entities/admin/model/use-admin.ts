import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminLoginRequest,
  adminLogoutRequest,
  blockUserRequest,
  createResetLinkRequest,
  fetchAdminMe,
  fetchAdminStats,
  fetchAdminUser,
  fetchAdminUsers,
  fetchAudit,
  fetchResetRequests,
  rejectResetRequest,
  unblockUserRequest,
  type UsersParams,
} from '../api/admin-api';

export const ADMIN_ME_KEY = ['admin', 'me'] as const;

export const useAdminMe = () =>
  useQuery({ queryKey: ADMIN_ME_KEY, queryFn: fetchAdminMe, retry: false, staleTime: 60_000 });

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { username: string; password: string }) =>
      adminLoginRequest(v.username, v.password),
    onSuccess: (user) => qc.setQueryData(ADMIN_ME_KEY, user),
  });
}

export function useAdminLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminLogoutRequest,
    onSuccess: () => {
      qc.setQueryData(ADMIN_ME_KEY, undefined);
      qc.removeQueries({ queryKey: ['admin'] });
    },
  });
}

export const useAdminStats = () => useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchAdminStats });

export const useAdminUsers = (params: UsersParams) =>
  useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => fetchAdminUsers(params),
    placeholderData: (prev) => prev,
  });

export const useAdminUser = (id: string | null) =>
  useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => fetchAdminUser(id!),
    enabled: !!id,
  });

export function useBlockActions() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['admin'] });
  return {
    block: useMutation({
      mutationFn: (v: { id: string; reason: string }) => blockUserRequest(v.id, v.reason),
      onSuccess,
    }),
    unblock: useMutation({ mutationFn: unblockUserRequest, onSuccess }),
  };
}

export const useResetRequests = (status: string) =>
  useQuery({ queryKey: ['admin', 'reset', status], queryFn: () => fetchResetRequests(status) });

export function useResetActions() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['admin'] });
  return {
    link: useMutation({ mutationFn: createResetLinkRequest }),
    reject: useMutation({ mutationFn: rejectResetRequest, onSuccess }),
    refresh: onSuccess,
  };
}

export const useAudit = (page: number, pageSize: number) =>
  useQuery({
    queryKey: ['admin', 'audit', page, pageSize],
    queryFn: () => fetchAudit(page, pageSize),
    placeholderData: (prev) => prev,
  });
