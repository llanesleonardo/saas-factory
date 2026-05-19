/**
 * Express middleware: parse a Bearer token and attach `AuthContext` to the request.
 *
 * Materialized from `@saas-factory/components-auth-jwt-builtin`. App-owned.
 *
 * Usage:
 *   import { requireAuth } from "./middleware/require-auth.ts";
 *   app.get("/me", requireAuth, (req, res) => res.json(req.auth));
 *
 * On verification failure or a missing/malformed header, responds 401 with a
 * JSON body `{ error: "UNAUTHENTICATED" }`. For public routes, simply don't
 * mount this middleware.
 */
import type { NextFunction, Request, Response } from "express";
import type { AuthContext } from "@saas-factory/auth";

import { jwtOptions, readBearer, verifyAccessToken } from "../auth/jwt.ts";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readBearer(req.header("authorization") ?? undefined);
  if (!token) {
    res.status(401).json({ error: "UNAUTHENTICATED", reason: "missing bearer token" });
    return;
  }
  try {
    const ctx = await verifyAccessToken(token, jwtOptions());
    req.auth = ctx;
    next();
  } catch (err) {
    res.status(401).json({
      error: "UNAUTHENTICATED",
      reason: err instanceof Error ? err.message : "invalid token",
    });
  }
}
