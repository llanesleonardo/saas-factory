# `@saas-factory/components-auth-jwt-builtin`

Built-in HS256 JWT adapter for the **auth** capability.

## When it's selected

The composer picks this adapter when `app.stack.json` has:

- `authDetail.requirements.needsAuth === true`, and
- `authDetail.sessionModel === "stateless-jwt"`.

If either condition is false, the [`auth-none`](../auth-none/README.md) sentinel runs instead and nothing is written.

## What it materializes

Three files into `apps/<slug>/<slug>-api/`:

- `src/auth/jwt.ts` — app-local entrypoint that loads JWT options from env once.
- `src/middleware/require-auth.ts` — Express middleware attaching `AuthContext` to `req.auth`.
- `src/routes/auth.ts` — `/auth/login`, `/auth/me`, `/auth/refresh` routes.

Plus four env entries in `apps/<slug>/<slug>-api/.env.example` (between fenced `# >>> component:auth-jwt-builtin` markers):

- `JWT_SECRET` (required, ≥16 chars)
- `JWT_ISSUER` (optional)
- `JWT_AUDIENCE` (optional)
- `JWT_ACCESS_TTL_SECONDS` (optional, default 900)

And two deps in the API's `package.json`:

- `@saas-factory/auth` — the contract package
- `jose` — JWT primitives

## What it does NOT materialize

- No user store / credential check — the login route is a placeholder that issues a token for any submitted email. Wire it to a real DB after the `database` capability lands.
- No frontend UI — that comes from the `ui` capability in a later iteration.
- No refresh-token rotation — kept simple intentionally; replace with rotation once you have a session store.

## Why ship a runtime package AND copied files?

The package (`src/index.ts`) holds the parts that should never fork per-app: `signAccessToken`, `verifyAccessToken`, header parsing, env loading. A security fix here propagates to every app on the next `npm install`.

The copied files (templates) hold the parts that *should* be per-app: route handlers, middleware mount points, env entrypoint. They land in the app's repo, so devs can edit them without coordinating with the factory.

## Selecting a different auth provider later

Edit `configs/apps/<slug>/app.stack.json` (or rerun `mfg app stack -- <slug>`) and re-run `mfg app scaffold -- <slug> --force`. The composer picks the new adapter; files are overwritten with the new templates.
