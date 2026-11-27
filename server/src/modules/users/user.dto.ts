import type { User } from '@prisma/client';
import { USERNAME_CHANGE_DAYS, type Profile, type SessionUser } from '@wishlist/shared';

export const toSessionUser = (u: User): SessionUser => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  role: u.role,
  avatarKey: u.avatarKey,
});

export function usernameChangeAvailableAt(u: User): Date | null {
  if (!u.usernameChangedAt) return null;
  const at = new Date(u.usernameChangedAt.getTime() + USERNAME_CHANGE_DAYS * 24 * 60 * 60 * 1000);
  return at > new Date() ? at : null;
}

export const toProfile = (u: User): Profile => ({
  id: u.id,
  username: u.username,
  firstName: u.firstName,
  lastName: u.lastName,
  bio: u.bio,
  birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
  hideBirthYear: u.hideBirthYear,
  birthdayVisibility: u.birthdayVisibility,
  avatarKey: u.avatarKey,
  hasPassword: u.passwordHash !== null,
  createdAt: u.createdAt.toISOString(),
  usernameChangeAvailableAt: usernameChangeAvailableAt(u)?.toISOString() ?? null,
});
