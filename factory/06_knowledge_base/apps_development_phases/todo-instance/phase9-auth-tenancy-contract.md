# todo-instance — Phase 9 auth + tenancy contract

This document is the **implementation contract** for Phase 9 (“Auth + tenancy”) of `apps/todo-instance`.

Source of truth: `configs/apps/todo/specs/todo-spec.md` → **Phase 9**.

---

## Summary

- **Tenancy model**: `Tenant` (workspace/org) + `User` + `Membership(role)`
- **Roles (Phase 9)**: `owner`, `member`
- **Auth method**: **cookie-based sessions** (httpOnly) + CSRF mitigation for state-changing requests
- **Isolation invariant**: every data access MUST be tenant-scoped and membership-verified on the server boundary

---

## Tenancy model (required)

### Entities

- **Tenant**
  - Identifies a workspace/org boundary for all data.
- **User**
  - Identifies a human user.
- **Membership**
  - `(tenantId, userId, role)` link between user and tenant.

### Roles (minimum)

- `owner`: admin-level actions (Phase 9 scope kept minimal)
- `member`: standard usage

### Tenant isolation invariants

- Every persisted todo is owned by exactly one `tenantId`.
- No endpoint may read or mutate todos without a verified `(userId, tenantId)` membership.
- Client-side state MUST NOT be treated as authoritative for tenant scope.

---

## Auth model (required)

### Sessions

- Sessions are stored server-side or signed in a way that is not accessible to browser JS.
- Auth is represented to the browser as **httpOnly cookies** (or equivalent), not localStorage tokens.

### CSRF

Because cookie sessions are used, **state-changing requests MUST be protected against CSRF**.

Phase 9 requirement is the *invariant* (“CSRF mitigation exists for mutations”), not a specific mechanism.

**`apps/todo-instance` backend (implemented):** double-submit cookie pattern — non-httpOnly cookie `sf_csrf` plus matching header `X-CSRF-Token` on `POST`/`PUT`/`PATCH`/`DELETE`. Clients obtain a token via `GET /api/csrf-token` (with credentials). Failures return **403** and `{ "ok": false, "error": "CSRF_FAILED" }`.

---

## API boundary for todo operations (Phase 9 expectation)

Todo CRUD is performed via authenticated endpoints (exact routing framework is implementation-defined). At minimum:

- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`

All routes:

- require authentication (401 if not authed)
- require tenant membership for the chosen tenant (403 if not a member)
- operate only on data for that tenant (404/403 as designed on cross-tenant attempts)

---

## Packaging boundaries (guidance)

### `packages/auth` (shared)

Recommended shared primitives:

- `requireUser(...)`
- `requireTenantMembership(...)`
- role checks (owner/member)
- session helper utilities

### `apps/todo-instance` (app wiring)

- login/logout pages or routes
- tenant selection (if user has multiple memberships)
- calling the API endpoints

---

## Verification notes (what Quality should prove)

- **Unauthenticated access is blocked** (at least one test)
- **Two-tenant isolation** is enforced (at least one test):
  - user in tenant A cannot read/write tenant B todos
- Mutations are protected by CSRF mitigation (mechanism tested or validated)

