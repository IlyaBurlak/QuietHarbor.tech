import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchSummary,
  markAllReadRequest,
  markReadRequest,
} from '../api/notification-api';

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const SUMMARY_KEY = ['notifications', 'summary'] as const;

/** Счётчики для значков. Опрашиваются раз в полминуты и при возврате на вкладку. */
export const useNotificationSummary = (enabled = true) =>
  useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: fetchSummary,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

export const useNotifications = () =>
  useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, refetchInterval: 30_000 });

export function useMarkRead() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  return {
    one: useMutation({ mutationFn: markReadRequest, onSuccess }),
    all: useMutation({ mutationFn: markAllReadRequest, onSuccess }),
  };
}
