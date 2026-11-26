import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptRequestRequest,
  cancelRequestRequest,
  declineRequestRequest,
  fetchFriends,
  fetchProfileWishlists,
  fetchPublicProfile,
  removeFriendRequest,
  searchUsersRequest,
  sendRequestRequest,
} from '../api/friend-api';

/** Сколько символов ника нужно, чтобы начать поиск. */
export const MIN_SEARCH_LENGTH = 2;

export const FRIENDS_KEY = ['friends'] as const;

export const useFriends = () => useQuery({ queryKey: FRIENDS_KEY, queryFn: fetchFriends });

export const useUserSearch = (nick: string) =>
  useQuery({
    queryKey: ['user-search', nick],
    queryFn: () => searchUsersRequest(nick),
    enabled: nick.length >= MIN_SEARCH_LENGTH,
  });

export const usePublicProfile = (username: string) =>
  useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfile(username),
    retry: false,
  });

export const useProfileWishlists = (username: string) =>
  useQuery({
    queryKey: ['profile-wishlists', username],
    queryFn: () => fetchProfileWishlists(username),
  });

/** Любое действие с заявками обновляет списки, поиск и профили. */
function useRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: FRIENDS_KEY }),
      qc.invalidateQueries({ queryKey: ['user-search'] }),
      qc.invalidateQueries({ queryKey: ['public-profile'] }),
      qc.invalidateQueries({ queryKey: ['profile-wishlists'] }),
      qc.invalidateQueries({ queryKey: ['calendar'] }),
      // значки «Заявки» и колокольчик
      qc.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
}

export function useFriendActions() {
  const onSuccess = useRefresh();
  return {
    send: useMutation({ mutationFn: sendRequestRequest, onSuccess }),
    accept: useMutation({ mutationFn: acceptRequestRequest, onSuccess }),
    decline: useMutation({ mutationFn: declineRequestRequest, onSuccess }),
    cancel: useMutation({ mutationFn: cancelRequestRequest, onSuccess }),
    remove: useMutation({ mutationFn: removeFriendRequest, onSuccess }),
  };
}
