/**
 * `@saas-factory/components-auth-jwt-builtin`
 *
 * Implementation of the auth contract from `@saas-factory/auth` for the
 * "stateless JWT (HS256)" session model. This module is consumed by the
 * **template files** that the composer copies into the target app's API
 * workspace (see `template/api/src/auth/jwt.ts` — it imports the helpers
 * exported here).
 *
 * The factory itself never imports this package at runtime; only the
 * scaffolded apps do, transitively through their copied templates.
 *
 * Why ship runtime helpers as a package (instead of inlining them in the
 * template):
 *   • A bug fix in JWT verification can be released by bumping this package
 *     and re-running `npm install` in the target app — no re-scaffold needed.
 *   • The template stays small and idiomatic; only the parts a typical app
 *     might want to customize (route handlers) live in copied files.
 */

import type { AuthContext, AuthUser, TenantMembership } from "@saas-factory/auth";
import { SignJWT, jwtVerify } from "jose";

/** Issuing options. */
export interface JwtIssueOptions {
  secret: Uint8Array;
  issuer?: string;
  audience?: string;
  /** Seconds. Default 900. */
  accessTtlSeconds?: number;
}

/** What we put inside every access token. */
export interface AccessTokenPayload {
  sub: string;
  /** Memberships flattened for fast guard checks. */
  m?: TenantMembership[];
}

/** Sign a short-lived access token. */
export async function signAccessToken(
  payload: AccessTokenPayload,
  opts: JwtIssueOptions,
): Promise<string> {
  const ttl = opts.accessTtlSeconds ?? 900;
  const jwt = new SignJWT({ m: payload.m })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl);
  if (opts.issuer) jwt.setIssuer(opts.issuer);
  if (opts.audience) jwt.setAudience(opts.audience);
  return jwt.sign(opts.secret);
}

/**
 * Verify a bearer token and return an `AuthContext`.
 *
 * Throws on any verification failure; the caller (middleware) catches and
 * turns it into a 401 response.
 */
export async function verifyAccessToken(
  token: string,
  opts: JwtIssueOptions,
): Promise<AuthContext> {
  const { payload } = await jwtVerify(token, opts.secret, {
    issuer: opts.issuer,
    audience: opts.audience,
  });
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("token missing sub");
  }
  const user: AuthUser = { userId: payload.sub };
  const memberships =
    Array.isArray((payload as { m?: unknown }).m) ?
      ((payload as { m: TenantMembership[] }).m) :
      [];
  return { user, memberships };
}

/**
 * Extract a bearer token from an Authorization header.
 *
 * Returns `undefined` for an absent or malformed header; the middleware
 * decides whether that's a 401 or a public route.
 */
export function readBearer(headerValue: string | undefined): string | undefined {
  if (!headerValue) return undefined;
  const [scheme, value] = headerValue.split(" ", 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !value) return undefined;
  return value.trim();
}

/** Load the HS256 secret from env, with a clear error if it's missing/short. */
export function loadJwtSecretFromEnv(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const raw = env.JWT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error(
      "JWT_SECRET is missing or too short (need 16+ chars). See .env.example.",
    );
  }
  return new TextEncoder().encode(raw);
}

/** Load full JwtIssueOptions from env in one call (typical app usage). */
export function loadJwtOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): JwtIssueOptions {
  return {
    secret: loadJwtSecretFromEnv(env),
    issuer: env.JWT_ISSUER || undefined,
    audience: env.JWT_AUDIENCE || undefined,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS
      ? Number.parseInt(env.JWT_ACCESS_TTL_SECONDS, 10)
      : undefined,
  };
}
