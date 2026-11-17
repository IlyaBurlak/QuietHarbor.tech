import type { SessionUser } from '@wishlist/shared';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionToken?: string;
    }
  }
}

export {};
