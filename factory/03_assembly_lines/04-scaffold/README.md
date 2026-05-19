# Station: Scaffold (materialize — **records here**, **code in `apps/`**)

This folder is **not** where vertical apps live. Each vertical product gets its own parent folder under `apps/` — **`apps/<slug>/<slug>-instance`** (frontend), **`apps/<slug>/<slug>-api`** (backend), plus any future infra services (e.g. **`apps/<slug>/<slug>-postgres`**, **`apps/<slug>/<slug>-redis`**, **`apps/<slug>/<slug>-mqtt`**). The platform shell lives at **`apps/core-saas/core-saas-instance/`**. Shared **`packages/`** hold cross-app code. **`04-scaffold/`** holds:

| Area | Purpose |
|------|---------|
| **`app-scaffold.ts`**, **`modules/`**, **`scaffold-lib.ts`** | Orchestrator — turns **`configs/apps/<slug>/app.stack.json`** into repo updates **under `apps/`** idempotently. |
| **`records/<order-id>/<slug>/`** | **Audit trail only** — same **`scaffold-run.json`** as configs/apps. **`order-id`** comes from **`--order-id`** (sanitized path segment). If you scaffold without an order, records go under **`records/_unscoped/<slug>/`**. No application runtime files. |

## Flow (intake → contract → workforce → scaffold)

1. **Intake / order** — `factory/01_production_planning/01_00_work_orders/<orderId>/`
2. **Contracts** — `configs/apps/<slug>/` (Product IR, System IR, specs)
3. **Workforce registry slice** — `factory/03_assembly_lines/03-registry/orders/<orderId>/<slug>/workforce-registry.json`
4. **Scaffold** — runs **`mfg app scaffold`**, writes **code under `apps/<slug>/`**, and writes **`scaffold-run.json`** to **`configs/apps/<slug>/`**, **`apps/<slug>/<slug>-instance/`**, and **`records/<order-id>/<slug>/`** here (or **`records/_unscoped/<slug>/`** without **`--order-id`**).

## What `scaffold-run.json` captures

- **Outputs** — repo-relative paths to the instance + API workspaces (**always under `apps/`**).
- **`materialization`** — explicit booleans for frontend/API workspaces, Docker compose, CI merge, etc.; **stack contract summary** for **database**, **redis**, **object storage**, **AI integration**, **auth**, **frontend styling** intent (exact npm deps appear under each **`apps/`** `package.json`).
- **Technologies / tooling** — full blueprint snapshot for audits.
- **Registry participation** — pointers into **`03-registry`**.

Schema: **`factory/factory_schemas/scaffold-run.schema.json`**.

## CLI

```bash
npm run mfg -- app scaffold -- <appSlug>
npm run mfg -- app scaffold -- todo --phase TODO_P2_SCAFFOLD --order-id example-order-001
npm run mfg -- app scaffold -- todo --phase-label "Phase 1 — skeleton"
```

State / logs beside config (unchanged): **`configs/apps/<slug>/scaffold-state.json`**, **`scaffold-log.jsonl`**.

See **`records/README.md`** for the station-local record tree.
