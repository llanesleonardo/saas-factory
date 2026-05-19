/**
 * Auth routes — login + me + refresh.
 *
 * Materialized from `@saas-factory/components-auth-jwt-builtin`. App-owned;
 * customize freely.
 *
 * Out of the box the login route is a placeholder that issues a token for
 * any submitted email — **replace this with a real credential check** before
 * exposing the app. The point of this template is to give you the wiring
 * (token shape, response envelope, route mounts), not a production login.
 */
import { Router, type Request, type Response } from "express";

import { requireAuth } from "../middleware/require-auth.ts";
import { jwtOptions, signAccessToken } from "../auth/jwt.ts";

export const authRouter = Router();

interface LoginBody {
  email: string;
  password: string;
}

authRouter.post("/login", async (req: Request, res: Response) => {
  const body = req.body as Partial<LoginBody> | undefined;
  if (!body?.email || !body?.password) {
    res.status(400).json({ error: "BAD_REQUEST", reason: "email + password required" });
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REPLACE THIS BLOCK with a real user lookup + password verification.
  // Suggested contract: lookup user by email → bcrypt-compare password →
  // fetch tenant memberships from your DB. The scaffold deliberately does NOT
  // pick a user store for you; that's a separate `database` capability.
  // ─────────────────────────────────────────────────────────────────────────
  const stubUserId = `user-${Buffer.from(body.email).toString("hex").slice(0, 12)}`;

  const token = await signAccessToken(
    { sub: stubUserId, m: [] },
    jwtOptions(),
  );
  res.json({ accessToken: token, tokenType: "Bearer" });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ auth: req.auth });
});

authRouter.post("/refresh", requireAuth, async (req, res) => {
  if (!req.auth?.user) {
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return;
  }
  const token = await signAccessToken(
    { sub: req.auth.user.userId, m: req.auth.memberships },
    jwtOptions(),
  );
  res.json({ accessToken: token, tokenType: "Bearer" });
});
