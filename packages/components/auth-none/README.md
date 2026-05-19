# `@saas-factory/components-auth-none`

Sentinel adapter for the **auth** capability.

Selected by the composer when:

- `blueprint.authDetail` is absent, **or**
- `blueprint.authDetail.requirements.needsAuth === false`

Materializes **nothing** — no files, no deps, no env entries. Its only purpose is to keep the composer's "exactly one adapter per capability" invariant when an app explicitly does not want auth.

You never depend on this package at runtime. Apps either depend on `@saas-factory/auth` (and get a real adapter scaffolded), or they don't have auth at all.

See `factory/factory_libs/components/README.md` for the broader model.
