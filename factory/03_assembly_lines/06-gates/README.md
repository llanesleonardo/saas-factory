# Station: Gates + validation (single process, one folder)

**Canonical paths:**

| Subfolder | Role |
|-----------|------|
| **`gates/`** | Interactive / CLI gate scripts: brief, business needs, stack (`app-blueprint-config.ts`), negotiate, quote, verified list, spec generation, BD phase/task helpers, **delivery review** (`delivery-review.ts`). Invoked via **`npm run mfg`** → **`factory/factory_cli/mfg.ts`**. |
| **`validation/`** | `validate-*` TypeScript CLIs: registries, task queue, workflow machine, vertical config, app stack, agent output, QMS inbox, fixtures. Same **`mfg validate factory`** batch as before. |
| **`fixtures/`** | Golden / negative inputs for `*-fixtures.ts` validators. |

Gates may import validators from **`validation/`** (e.g. vertical brief checks). **Schemas** stay in **`factory/factory_schemas/`**; this station enforces them.

## Delivery gate process (tasks → tests → contract ↔ sprint → app)

This is the **human + machine** pass before treating an increment as “done”: use **validators** and **fixtures** for machine checks, **gates** for wizards and quotes, and **contracts + sprint records** for intent vs what was executed.

| Step | What to do | Fixtures / gates / validation |
|------|----------------|------------------------------|
| **1. Review tasks** | Confirm pull queue + order epics: right tasks, deps, `blocked_reason`, assigned roles vs `agent-registry`. | **`validation/validate-task-queue.ts`**, **`validate-task-queue-fixtures.ts`**; proposals under **`factory/01_production_planning/01_03_task-registry/<orderId>/`**; global **`03-registry/registry/task-queue.json`**. |
| **2. Test the work** | Run repo validators and **app** tests/lint in `apps/<product>-*`. | **`mfg validate apps`**, **`mfg stack validate -- <productId>`**; **`validation/validate-app-stack.ts`**; **`fixtures/`** for agent-output / self-heal / QMS harnesses; CI in **`.github/workflows/`**. |
| **3. Sprint vs contract** | Compare **sprint workstation narrative** (`summary` + statuses) to **contract** artifacts: vertical brief, `app.stack.json`, specs under **`configs/apps/<productId>/specs/`**, business needs if present. | Sprint: **`05-sprints/<orderId>/<productId>/sprint-<NNN>/sprint.json`** + **`mfg sprint …`**; contract shape: **`validation/validate-vertical-config.ts`**, **`validate-app-stack.ts`**; alignment helper: **`mfg gates review <orderId> <productId> [--sprint N]`**. |
| **4. Review app implementation** | Inspect real code under **`apps/<productId>-instance`**, **`apps/<productId>-api`** vs stack and security expectations. | **`mfg app quote`**, **`mfg app verified`**; optional **`mfg gates review … --run`** (runs stack validate for that product). |

**One-shot checklist (prints paths + sprint summary):**

```bash
npm run mfg -- gates review example-order-001 todo --sprint 1
npm run mfg -- gates review example-order-001 todo --run   # also runs stack validate for todo
```

## CLI (other)

```bash
npm run mfg -- app new | bn | saas | stack | negotiate | scaffold | …
npm run mfg -- validate apps
npm run mfg -- validate factory
```

Scaffold materialization: **`factory/03_assembly_lines/04-scaffold/`** (not under this folder).
