# `packages/components/` — reusable SaaS components

Each subfolder is an **adapter package**: one provider (Stripe, Auth0, S3, …) implementing one capability (auth, billing, storage, …) for the SaaS factory.

Every adapter package contains:

| File | Purpose |
|---|---|
| `package.json` | Workspace package metadata (name = `@saas-factory/components-<id>`). |
| `manifest.json` | The composer reads this to decide selection + what to apply. |
| `src/index.ts` _(optional)_ | Runtime helpers imported by templates. Sentinel packages have no `src/`. |
| `template/` _(optional)_ | Files copied into target apps during `mfg app scaffold`. |
| `README.md` | When the adapter is selected, what it does, what it does not. |

## How adapters get selected

The composer (`factory/factory_libs/components/composer.ts`) walks every adapter's `appliesWhen` clause against the app's `app.stack.json` and picks **exactly one** adapter per capability. To support "this capability is off", every capability also ships a **sentinel** adapter (e.g. `auth-none`) whose `appliesWhen.sentinel: true` matches when the detail is absent or `requirements.needsX === false`.

If two adapters match the same blueprint, the composer fails the scaffold with an explicit error — manifests must be mutually exclusive.

## Authoring a new adapter (cheat sheet)

1. `packages/components/<capability>-<provider>/package.json` — name = `@saas-factory/components-<capability>-<provider>`, `private: true`, depends on the contract package (`@saas-factory/auth`, `@saas-factory/billing`, …).
2. `manifest.json` matching the schema in `factory/factory_libs/components/component-manifest-types.ts`.
3. `src/index.ts` for runtime helpers used by templates (skip for sentinels).
4. `template/<target>/...` for files to copy (skip for sentinels). `target` is `api`, `instance`, or `root`.
5. `README.md` describing selection conditions and what gets written.
6. Run `npm run test:components` — it includes a live-manifest check that will fail if your manifest is malformed.

## Naming + capability list

`<capability>-<provider>`:

- `auth` — `jwt-builtin`, `auth0`, `clerk`, …
- `billing` — `stripe`, `paddle`, …
- `database` — `prisma-postgres`, `prisma-sqlite`, …
- `storage` — `s3`, `azure-blob`, `local-fs`, …
- `email` — `sendgrid`, `postmark`, `smtp-dev`, …
- `observability` — `pino-stdout`, `otlp`, …
- `jobs` — `bullmq-redis`, `in-memory-dev`, …
- `ai`, `search`, `networking`, `infra` — same pattern.

Every capability ships a `<capability>-none` sentinel.

## Why adapters are workspace packages (not just folders)

- npm workspaces resolve `@saas-factory/components-*` automatically; no extra build step.
- Runtime helpers can be imported by the **templates copied into apps**, so a bug fix in `src/index.ts` propagates via `npm install` without re-scaffolding.
- `package.json` is the canonical way for npm to know about the deps the adapter itself needs.

## Why we still copy `template/` files into apps (not import them)

- Apps own the route handlers, middleware, and migrations after scaffold. They can edit freely without coordinating with the factory.
- Re-scaffold (`mfg app scaffold -- <slug> --force`) overwrites copied files when the adapter changes, so apps can opt into upgrades.
