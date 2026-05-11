# ARCHITECTURE CHOICE — SAAS FACTORY

**Decision (locked for this repo):** verticals ship as **separate deployable apps** under **`apps/<vertical>-instance/`**, sharing code through **`packages/*`** and the shared **`apps/core-saas/`** shell — **not** a single customer-facing app where "vertical = only JSON."

## Why this path

- Clear **boundaries** per vertical (own Vercel project, own issue label `app:*`, independent cadence).
- **Shared factory** still lives in **`packages/ui`**, **`packages/db`**, **`packages/auth`**, **`packages/billing`** — new verticals **reuse** those, they do not fork unrelated stacks.
- Matches the **orchestrator + per-instance folders** already in the repo.

## What we are *not* doing (until explicitly revisited)

- One **multi-tenant** web app where industry is **only** runtime JSON (no separate `apps/dentist-instance` tree).
- Replacing instance folders with **config-only** deploys without a written ADR and team agreement.

## Responsibilities

| Area | Responsibility |
|------|----------------|
| `apps/core-saas/` | Shared engine / entry patterns other instances align with |
| `apps/*-instance/` | Vertical-specific UI, routes, domain logic, branding hooks |
| `packages/*` | Cross-vertical libraries — **prefer extending here** over duplicating across instances |
| `configs/<vertical>.json` | **Inputs** to spec generation and product metadata — not a substitute for instance code unless we add a true config runtime later |

## Builder / "clone core + apply config" (today vs future)

- **Today:** there is **no** scripted pipeline that clones `core-saas` and materializes a vertical from JSON alone. **Instantiation** = **`@agents/builder-agent.md`** (scaffold + checklist) + **`@agents/dev-agent.md`** (tasks) + **you** approving diffs. Optional: **`@agents/tooling-agent.md`** to add `npm run scaffold-vertical` later.
- **Config's role:** `configs/<vertical>.json` feeds **`generate-spec`** and the spec — it does **not** auto-generate runnable app code without Builder/Dev work.
- **Future (optional):** a small **factory script** that copies `apps/plumber-instance/` (or a `templates/instance-skeleton/`) renames paths, and registers GitHub/Vercel wiring — still reviewed via PR.

## Frontend and backend — where code lives

Today many **`apps/*-instance/`** folders are **static HTML** placeholders. As you grow real products, keep this split in mind:

| Layer | Preferred location | Notes |
|--------|--------------------|--------|
| **Frontend (UI)** | **`apps/<vertical>-instance/`** | Pages, routes, vertical branding, client bundles. |
| **Shared UI / design system** | **`packages/ui`** (create when needed) | Components reused across verticals — avoid copy-paste across instances. |
| **Backend (shared rules)** | **`packages/*`** e.g. **`db`**, **`auth`**, **`billing`** | Schema helpers, auth clients, Stripe wiring — **imported** by apps that use **monorepo-integrated** mode (below). |
| **Backend (vertical-specific)** | Same instance app (e.g. serverless / route handlers) **or** a dedicated deployable if you split API vs UI | Document the split in an ADR; **Architect** should name the boundary. |
| **Core “engine” surface** | **`apps/core-saas/`** | Reference app + eventual **canonical HTTP API** other instances call in **HTTP-integrated** mode. |

**Languages:** the repo factory uses **TypeScript**. For new product code, **TypeScript (or JavaScript)** for both UI and server is the default path of least resistance in this monorepo; other stacks are allowed if **Architect** records the decision and **CI** covers them.

## Integration with shared SaaS vs standalone

Pick **one primary mode per vertical** (mixing without documentation creates drift). **Architect** names it; **Builder** scaffolds accordingly; **Dev** implements inside those boundaries.

| Mode | When to use | How it connects |
|------|----------------|-----------------|
| **Monorepo-integrated** | Same team, shared releases, you want shared types and libraries. | `apps/<vertical>-instance` **imports** workspace **`packages/*`** (and aligns with **`apps/core-saas`** patterns). One or more Vercel projects still OK per app. |
| **HTTP-integrated** | Instance UI (or BFF) should stay **loosely coupled** to core (different cadence, clear API contract). | No requirement to import `packages/*` for the remote boundary. Configure **HTTPS base URL** (e.g. `PUBLIC_CORE_SAAS_API_URL`) per Vercel project; version the API (path or header). |
| **Standalone** | Vertical is an experiment, external codebase, or must run with **no** shared packages. | No workspace imports from `packages/*`; document exit path. Re-entering shared SaaS later needs an **ADR** + contract work. |

**Contracts (all modes that cross a boundary):** document env var **names** (not values), CORS expectations, auth (tokens vs cookies), and breaking-change policy. **Docs Agent** + **Security Agent** should see anything user-facing or PHI-adjacent.

## CI and workflows (implications)

- **`factory-parallel-ci.yml`** — today runs **root** `npm run check` and factory scripts. When an **`apps/<name>/package.json`** exists with its own `test` / `build`, add **matrix jobs** (or a workspace runner) so each app is gated without blocking unrelated apps.
- **`vercel-deploy.yml`** — one job per **`working-directory: apps/...`**. Set each Vercel project’s **environment variables** for cross-app URLs (HTTP-integrated mode) and preview vs prod values.
- **New verticals** — add `configs/<vertical>.json` and run **`npm run generate-spec -- <vertical>`** locally (or add a dedicated CI/workflow later if you want remote regeneration).

## When to reconsider

Re-open this choice if: most verticals share **identical** screens and only **labels/rules** differ **and** you have a strong **tenant + feature-flag** model. Until then, **architect** and **PM** agents should assume **this** layout.
