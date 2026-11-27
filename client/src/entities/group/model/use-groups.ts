import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateGroupInput, ExclusionInput, UpdateGroupInput } from '@wishlist/shared';
import {
  addExclusionRequest,
  createGroupRequest,
  deleteGroupRequest,
  drawRequest,
  fetchGroup,
  fetchGroups,
  fetchInvite,
  fetchMyRecipient,
  joinGroupRequest,
  kickMemberRequest,
  leaveGroupRequest,
  regenerateInviteRequest,
  removeExclusionRequest,
  setMyWishlistRequest,
  updateGroupRequest,
} from '../api/group-api';

export const GROUPS_KEY = ['groups'] as const;

export const useGroups = () => useQuery({ queryKey: GROUPS_KEY, queryFn: fetchGroups });

export const useGroup = (id: string) =>
  useQuery({ queryKey: ['groups', id], queryFn: () => fetchGroup(id), retry: false });

export const useInvite = (code: string, userId: string | undefined) =>
  useQuery({
    queryKey: ['group-invite', code, userId ?? null],
    queryFn: () => fetchInvite(code),
    retry: false,
  });

/** Только после жеребьёвки: до неё сервер ответит 409. */
export const useMyRecipient = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ['groups', id, 'recipient'], queryFn: () => fetchMyRecipient(id), enabled });

const useRefresh = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: GROUPS_KEY });
};

export function useGroupActions(id: string) {
  const onSuccess = useRefresh();
  return {
    update: useMutation({ mutationFn: (i: UpdateGroupInput) => updateGroupRequest(id, i), onSuccess }),
    remove: useMutation({ mutationFn: () => deleteGroupRequest(id), onSuccess }),
    regenerate: useMutation({ mutationFn: () => regenerateInviteRequest(id), onSuccess }),
    kick: useMutation({ mutationFn: (userId: string) => kickMemberRequest(id, userId), onSuccess }),
    leave: useMutation({ mutationFn: () => leaveGroupRequest(id), onSuccess }),
    setWishlist: useMutation({
      mutationFn: (wishlistId: string | null) => setMyWishlistRequest(id, wishlistId),
      onSuccess,
    }),
    addExclusion: useMutation({
      mutationFn: (i: ExclusionInput) => addExclusionRequest(id, i),
      onSuccess,
    }),
    removeExclusion: useMutation({
      mutationFn: (exId: string) => removeExclusionRequest(id, exId),
      onSuccess,
    }),
    draw: useMutation({ mutationFn: () => drawRequest(id), onSuccess }),
  };
}

export function useCreateGroup() {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (i: CreateGroupInput) => createGroupRequest(i), onSuccess });
}

export function useJoinGroup() {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: joinGroupRequest, onSuccess });
}
