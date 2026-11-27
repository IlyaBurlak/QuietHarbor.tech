import { z } from 'zod';

export const blockUserSchema = z.object({
  reason: z.string().trim().min(3, 'Укажите причину (минимум 3 символа)').max(500, 'Не длиннее 500 символов'),
});
export type BlockUserInput = z.infer<typeof blockUserSchema>;

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().toLowerCase().max(20).optional(),
  status: z.enum(['all', 'active', 'blocked']).default('all'),
  sort: z.enum(['createdAt', 'lastLoginAt']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const adminResetQuerySchema = z.object({
  status: z.enum(['new', 'done', 'rejected', 'all']).default('new'),
});

export const adminPageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export interface AdminUserRow {
  id: string;
  username: string | null;
  fullName: string;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  createdAt: string;
  lastLoginAt: string | null;
  providers: string[];
  wishlistsCount: number;
}

export interface AdminUserCard extends AdminUserRow {
  itemsCount: number;
  reservationsCount: number;
  groupsCount: number;
  resetRequestsCount: number;
  blocked: { at: string; by: string | null; reason: string | null } | null;
}

export interface AdminUsersPage {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  tables: { name: string; rows: number; bytes: number }[];
  filesBytes: number;
  registrations: { date: string; count: number }[];
  totals: { users: number; blocked: number };
}

export interface AdminResetRequest {
  id: string;
  code: string;
  username: string;
  contact: string;
  comment: string | null;
  status: 'new' | 'done' | 'rejected';
  createdAt: string;
  handledAt: string | null;
  /** Данные для решения «тот ли это человек»; null, если такого ника нет. */
  user: {
    id: string;
    registeredAt: string;
    lastLoginAt: string | null;
    providers: string[];
    wishlistsCount: number;
    blocked: boolean;
  } | null;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  admin: string | null;
  target: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}
