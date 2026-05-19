/**
 * App-local JWT entrypoint.
 *
 * This file was materialized by the scaffold from
 * `@saas-factory/components-auth-jwt-builtin`. Edit freely — it belongs to
 * this app now. If you want to swap to a different auth adapter, run
 * `npm run mfg -- app scaffold -- <slug> --force` after changing `app.stack.json`.
 *
 * Heavy lifting lives in `@saas-factory/components-auth-jwt-builtin`; this
 * file just composes the options the app wants to use.
 */
import {
  loadJwtOptionsFromEnv,
  signAccessToken,
  verifyAccessToken,
  readBearer,
  type JwtIssueOptions,
  type AccessTokenPayload,
} from "@saas-factory/components-auth-jwt-builtin";

/** Lazily-initialized — first call reads env. */
let cached: JwtIssueOptions | undefined;
export function jwtOptions(): JwtIssueOptions {
  if (!cached) cached = loadJwtOptionsFromEnv();
  return cached;
}

/** Convenience re-exports so callers only import from this one file. */
export { signAccessToken, verifyAccessToken, readBearer };
export type { AccessTokenPayload };
