import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: string;
  }
}

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Verify the current role from the DB rather than trusting the session,
  // so a demoted admin loses access immediately instead of at session expiry.
  void (async () => {
    try {
      const [user] = await db
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user) {
        req.session.destroy(() => undefined);
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (user.role !== "admin") {
        // Keep the session's role in sync with the DB.
        req.session.role = user.role;
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      req.session.role = user.role;
      next();
    } catch (err) {
      next(err);
    }
  })();
};
