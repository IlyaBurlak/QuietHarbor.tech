import type { SessionUser } from '@wishlist/shared';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionToken?: string;
      /** Администратор, прошедший requireAdmin. */
      admin?: SessionUser;
      adminToken?: string;
    }
  }
}

export {};
