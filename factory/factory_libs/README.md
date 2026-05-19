# `factory/factory_libs`

Shared **library** modules used by factory CLIs, gates, and generators. Import-only: **no CLI side effects** when loaded.

Guidelines:
- Prefer **stable exports**; keep public shapes aligned with JSON under `configs/` and `factory/01_production_planning/` where applicable.
- **Types** (`*-types.ts`) mirror persisted documents; **logic** modules (`*.ts` without `-types`) implement pure transforms or path helpers.
- Place new modules under the **subfolder that matches the concern** (see below). Avoid dumping files at `factory_libs/` root.

## Layout (by concern)

| Folder | Responsibility | Modules |
|--------|----------------|---------|
| **`paths/`** | Repo-relative paths for configs, orders, phases | **`app-config-paths.ts`** — `configs/apps/<slug>/…`, **`orderPhasesPath`**, phase-breakdown paths, etc. |
| **`product/`** | Vertical brief / product IR and derived stack hints | **`vertical-config-types.ts`**, **`business-needs-types.ts`**, **`product-ir-compiler.ts`** |
| **`commerce/`** | Quotes and sales / work order documents | **`app-quote-types.ts`**, **`sales-work-order-types.ts`** |
| **`orders/`** | Shop-order roadmap and manufacturing schedule | **`order-phases-types.ts`**, **`order-schedule-calendar-types.ts`** |
| **`planning/`** | Task queue graph and MRP-style helpers | **`task-graph.ts`** — **`FactoryTask`**, **`loadTaskQueue`**, **`computeParallelBatches`**, **`orderTasks`**, … |
| **`sprints/`** | Sprint records under **`05-sprints`** | **`sprint-types.ts`**, **`sprint-paths.ts`** |
| **`scaffold/`** | Scaffold audit artifacts | **`scaffold-run-types.ts`**, **`scaffold-run-manifest.ts`** |

## Consumers (typical)

- **`factory/factory_cli/`** — `mfg` line commands import **`planning/task-graph`**, **`paths/app-config-paths`**, …
- **`factory/03_assembly_lines/06-gates/`** — validators and app gates use **`paths/`**, **`product/`**, …
- **`factory/01_production_planning/`** — orchestrator, order phases, schedule, work orders share **`planning/`**, **`orders/`**, **`commerce/`**.

When adding a new persisted JSON contract, prefer **a `*-types.ts` file in the matching folder** plus a validator under **`06-gates/validation/`**, then wire **`mfg`** or a gate to read/write it.
