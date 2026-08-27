import type { JwtPayload } from "../lib/jwt.js";
import type { AuthenticatedUser } from "../types/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tokenPayload?: JwtPayload;
    }
  }
}

export {};
