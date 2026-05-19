# Purpose of `apps/core-saas` (platform SaaS slot)

**Audience:** anyone scaffolding verticals, wiring deploys, or asking why `core-saas` exists when it is still thin.

## What problem it solves

This factory ships **many deployable verticals** under `apps/<vertical>-instance/` while still needing **one coherent “platform” SaaS** — the shared concerns almost every SaaS has (identity, tenancy, billing patterns, shared APIs, admin surfaces, operational hooks). **`apps/core-saas/`** is the **reserved home for that deployable platform**: the app you deploy as **the core product**, distinct from each industry-specific instance.

It is **not** a starter template you clone to create a new vertical (that flow lives under **`*-instance`** folders and Builder/Dev scaffolding per [ARCHITECTURE.md](ARCHITECTURE.md)).

## How it relates to other parts of the repo

| Location | Role |
|----------|------|
| **`packages/*`** | **Shared libraries** — types, clients, DB/auth/billing helpers. Imported by apps; avoids copy-paste across verticals. |
| **`apps/core-saas/`** | **Deployable platform app** — reference UI and, when built, the **canonical HTTP surface** other instances call when using **HTTP-integrated** mode. One deployment boundary for “the core SaaS.” |
| **`apps/*-instance/`** | **Vertical products** — industry UI, routes, branding, and vertical-specific logic; may call **`core-saas`** over HTTPS or share **`packages/*`** directly. |

**Plain analogy:** **`packages/*`** is reusable parts; **`core-saas`** is the assembled **engine room** you ship as a service; **`*-instance`** apps are **storefronts** (and may have their own small backends where documented).

## Integration with instances (summary)

Pick **one primary mode per vertical** (see [ARCHITECTURE.md](ARCHITECTURE.md) — *Integration with shared SaaS vs standalone*):

- **Monorepo-integrated:** instances **import** `packages/*` and align with **`core-saas`** patterns; releases can move together.
- **HTTP-integrated:** instances treat **`core-saas`** as a **remote API** — configure a base URL (e.g. **`PUBLIC_CORE_SAAS_API_URL`**) per deploy, document auth and CORS.
- **Standalone:** no workspace coupling; re-entering shared SaaS needs contract work.

Cross-boundary work should document **env var names**, auth model, CORS, and breaking-change expectations — same rules as [ARCHITECTURE.md](ARCHITECTURE.md).

## Current state vs intended state

**Today:** `apps/core-saas` is intentionally minimal (e.g. placeholder static content + Vercel wiring). The **architecture slot and deploy hooks** exist so the team does not scatter “core platform” code across unrelated folders.

**Intended:** Implement the real platform here — APIs, admin, shared SaaS flows — so **`core-saas`** becomes the **live backend/service** instances integrate with (when not relying solely on in-process `packages/*` imports).

## Operations

- **Deploy:** Same pattern as other apps under **`apps/`** (e.g. **`.github/workflows/vercel-deploy.yml`** per app); set **per-project** environment variables for preview vs production and for cross-app URLs when using HTTP-integrated mode.
- **Issues / routing:** Use **`app:*`** labels per [GITHUB-PROJECTS-SETUP.md](../github/GITHUB-PROJECTS-SETUP.md) when tracking work.

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — locked layout, frontend/backend split, integration modes, CI notes.
- [GITHUB-PROJECTS-SETUP.md](../github/GITHUB-PROJECTS-SETUP.md) — Projects and labels per app.
