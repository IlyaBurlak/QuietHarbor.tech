import type {
  FriendsResponse,
  ProfileWishlist,
  PublicProfile,
  SearchResult,
} from '@wishlist/shared';
import { http } from '@/shared/api';

export const searchUsersRequest = (nick: string) =>
  http
    .get<{ users: SearchResult[] }>('/users/search', { params: { nick } })
    .then((r) => r.data.users);

export const fetchFriends = () => http.get<FriendsResponse>('/friends').then((r) => r.data);

export const sendRequestRequest = (username: string) =>
  http
    .post<{ status: 'pending' | 'accepted' }>('/friends/requests', { username })
    .then((r) => r.data);

export const acceptRequestRequest = (id: string) =>
  http.post(`/friends/requests/${id}/accept`).then(() => undefined);
export const declineRequestRequest = (id: string) =>
  http.post(`/friends/requests/${id}/decline`).then(() => undefined);
export const cancelRequestRequest = (id: string) =>
  http.delete(`/friends/requests/${id}`).then(() => undefined);
export const removeFriendRequest = (userId: string) =>
  http.delete(`/friends/${userId}`).then(() => undefined);

export const fetchPublicProfile = (username: string) =>
  http.get<{ profile: PublicProfile }>(`/users/${username}`).then((r) => r.data.profile);

export const fetchProfileWishlists = (username: string) =>
  http
    .get<{ wishlists: ProfileWishlist[] }>(`/users/${username}/wishlists`)
    .then((r) => r.data.wishlists);
