# Factory schemas (`factory/factory_schemas/`)

**What this is:** JSON Schema files that define **allowed shapes** for factory and agent artifacts. They are **contracts expressed as schema**, not runtime code.

**Canonical operating process:** **`factory/06_knowledge_base/go_to_market/SALES-AND-ASSEMBLY-LINE-GUIDE.md`** — sales → intake → planning → build/check → delivery, with optional telemetry / Kaizen / metrics. This README maps **each schema** to that guide (diagram blocks **1–5**, checklist **A–F**).

**Where it lives:** **`factory/factory_schemas/`** — used by **`06-gates`** validators, intake, registry, and optional **`$schema`** hints on JSON files under **`configs/`** and **`01_00_work_orders/`**.

---

## Process map (schemas ↔ guide)

| Guide step | Checklist | Schemas involved |
|------------|-----------|-------------------|
| **1 — Sales** (commercial) | Sales checklist, **`so`** / **`wo`** | **`sales-order.schema.json`**, **`work-order.schema.json`**, **`app-quote.schema.json`** (quote before **`so`**) |
| **2 — Intake** | **A** — **`order validate`** | **`order-manifest.schema.json`**, **`vertical-config.schema.json`**, **`business-needs.schema.json`**, **`app-quote.schema.json`** (artifacts on disk) |
| **3 — Planning** | **B** — lifecycle, schedule, phases, tasks | **`order-phases.schema.json`**, **`order-schedule-calendar.schema.json`**, **`task-queue.schema.json`**, **`pm-output.schema.json`** (structured tasks before merge) |
| **4 — Build / line** | **C** + **D** — app pipeline, scaffold, sprints, **`check`**, **`validate factory`**, **`gates review`** | **`vertical-config.schema.json`**, **`business-needs.schema.json`**, **`scaffold-run.schema.json`**, **`sprint-record.schema.json`**, **`agent-registry.schema.json`**, **`workflow-state-machine.schema.json`**, **`tool-registry.schema.json`**, **`verified-apps.schema.json`**, **`dev-output.schema.json`**, **`quality-output.schema.json`**, **`qms-inbox-record.schema.json`** |
| **5 — Delivery** | **F** — deploy tiers | No dedicated deploy-output schema yet; gates use **`check`** + **`validate factory`** (schemas above). |

**Optional loop (guide §E):** telemetry, Kaizen, metrics — **no** JSON Schema in this folder yet (evidence lives under **`factory/telemetry/`**, **`factory/04_kaizen/`**, **`factory/05_metrics/`**).

---

## File index (every `*.schema.json`)

| Schema | Primary artifact(s) | Guide |
|--------|---------------------|--------|
| **`order-manifest.schema.json`** | `factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json` | Intake **2**, checklist **A** |
| **`sales-order.schema.json`** | `…/01_00_work_orders/<orderId>/sales-order.json` (`mfg so`) | Sales **1** |
| **`work-order.schema.json`** | `…/01_00_work_orders/<orderId>/work-order.json` (`mfg wo`) | Sales **1** |
| **`app-quote.schema.json`** | Quote bundle from **`mfg app quote`** (inputs to **`so`**) | Sales **1** (shape offer) |
| **`vertical-config.schema.json`** | `configs/apps/<slug>/<slug>.json` | Intake **2**, build **4** |
| **`business-needs.schema.json`** | `configs/apps/<slug>/business-needs.json` | Intake **2**, build **4** |
| **`order-phases.schema.json`** | `…/01_02_phase_registry/<orderId>/order-phases.json` | Planning **3**, **B** |
| **`order-schedule-calendar.schema.json`** | Order schedule calendar JSON (`mfg order schedule`) | Planning **3**, **B** |
| **`task-queue.schema.json`** | `factory/03_assembly_lines/03-registry/registry/task-queue.json` (or override via **`--queue=`**) | Planning **3**, **B** |
| **`scaffold-run.schema.json`** | `scaffold-run.json` under `configs/apps/`, `apps/<slug>-instance/`, scaffold `records/` | Build **4**, **C** |
| **`sprint-record.schema.json`** | `…/05-sprints/<orderId>/<productId>/sprint-<NNN>/sprint.json` | Build **4**, **C** |
| **`pm-output.schema.json`**, **`dev-output.schema.json`**, **`quality-output.schema.json`** | Structured agent handoffs (registry **`output_schema`** pointers) | Line **4** — human-in-the-loop work; **`validate factory`** exercises fixtures |
| **`agent-registry.schema.json`** | `factory/02_workforce/02_00_agents/agent-registry.json` (+ mirrors) | **D** — `validate factory` |
| **`workflow-state-machine.schema.json`** | `…/03-registry/registry/workflow-state-machine.json` | **D** |
| **`tool-registry.schema.json`** | `…/03-registry/registry/tool-registry.json` | **D**; cheat sheet in guide |
| **`verified-apps.schema.json`** | `…/03-registry/registry/verified-apps.json` | **4** — verified manufacturing list (`mfg app verified`) |
| **`qms-inbox-record.schema.json`** | Optional companion JSON for QMS inbox markdown under **`factory/06_knowledge_base/qms_docs/inbox/`** | **D** — `validate factory` |

**`$schema` pointers:** Re-exported constants for manifests and configs live in **`factory/factory_libs/paths/app-config-paths.ts`** (`VERTICAL_BRIEF_SCHEMA_REF`, **`ORDER_MANIFEST_SCHEMA_REF`**, **`SALES_ORDER_SCHEMA_REF`**, **`WORK_ORDER_SCHEMA_REF`**, …).

---

## Not on the sales diagram, still part of the factory

These schemas support **agent discipline** and **CI**, not a single box in the mermaid sales chart:

- **`pm-output` / `dev-output` / `quality-output`** — machine-checkable handoffs between roles.
- **`qms-inbox-record`** — optional structured fields alongside QMS inbox markdown.
- **`agent-registry` / `workflow-state-machine` / `tool-registry` / `verified-apps`** — who may run what, workflow edges, CLI roster, promoted apps.

They are exercised by **`npm run mfg -- validate factory`** and align with guide **§D** (automated spine).

---

## Validate agent JSON (examples)

```bash
npx tsx factory/03_assembly_lines/06-gates/validation/validate-agent-output.ts pm path/to/pm-output.json
npx tsx factory/03_assembly_lines/06-gates/validation/validate-agent-output.ts dev path/to/dev-output.json
npx tsx factory/03_assembly_lines/06-gates/validation/validate-agent-output.ts quality path/to/quality-output.json
```

Or stdin:

```bash
cat pm-output.json | npx tsx factory/03_assembly_lines/06-gates/validation/validate-agent-output.ts pm
```

---

## Legacy note

Human-authored **`task-queue.json`** may omit optional PM-shaped fields (`description`, `acceptance_criteria`, …); the loader in **`factory_libs/planning/task-graph.ts`** stays permissive. **`task-queue.schema.json`** documents the stricter envelope when you want full validation.
