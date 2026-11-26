import type {
  CreateGroupInput,
  ExclusionInput,
  GroupDetail,
  GroupPreview,
  GroupSummary,
  MyRecipient,
  UpdateGroupInput,
} from '@wishlist/shared';
import { http } from '@/shared/api';

export const fetchGroups = () =>
  http.get<{ groups: GroupSummary[] }>('/groups').then((r) => r.data.groups);
export const fetchGroup = (id: string) =>
  http.get<{ group: GroupDetail }>(`/groups/${id}`).then((r) => r.data.group);
export const createGroupRequest = (input: CreateGroupInput) =>
  http.post<{ group: GroupSummary }>('/groups', input).then((r) => r.data.group);
export const updateGroupRequest = (id: string, input: UpdateGroupInput) =>
  http.patch<{ group: GroupSummary }>(`/groups/${id}`, input).then((r) => r.data.group);
export const deleteGroupRequest = (id: string) =>
  http.delete(`/groups/${id}`).then(() => undefined);
export const regenerateInviteRequest = (id: string) =>
  http.post<{ inviteCode: string }>(`/groups/${id}/regenerate-invite`).then((r) => r.data);

export const fetchInvite = (code: string) =>
  http.get<{ group: GroupPreview }>(`/groups/join/${code}`).then((r) => r.data.group);
export const joinGroupRequest = (code: string) =>
  http.post<{ groupId: string }>(`/groups/join/${code}`).then((r) => r.data);

export const kickMemberRequest = (id: string, userId: string) =>
  http.delete(`/groups/${id}/members/${userId}`).then(() => undefined);
export const leaveGroupRequest = (id: string) =>
  http.post(`/groups/${id}/leave`).then(() => undefined);
export const setMyWishlistRequest = (id: string, wishlistId: string | null) =>
  http.put(`/groups/${id}/my-wishlist`, { wishlistId }).then(() => undefined);

export const addExclusionRequest = (id: string, input: ExclusionInput) =>
  http.post(`/groups/${id}/exclusions`, input).then(() => undefined);
export const removeExclusionRequest = (id: string, exclusionId: string) =>
  http.delete(`/groups/${id}/exclusions/${exclusionId}`).then(() => undefined);

export const drawRequest = (id: string) => http.post(`/groups/${id}/draw`).then(() => undefined);
export const fetchMyRecipient = (id: string) =>
  http.get<MyRecipient>(`/groups/${id}/my-recipient`).then((r) => r.data);
