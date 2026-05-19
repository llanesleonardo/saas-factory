# Assembly line (value stream — mirrored layout)

This folder **`03_assembly_lines/`** mirrors **BUILD + DELIVER** as numbered stations. Each subfolder holds a short `README.md` (and often pointers or canonical code) toward the real modules under `factory/`.

## Where this folder sits (`factory/` map)

Numbered zones define the full value stream from definition → planning → people → build → improve:

```text
factory/
  00_product_definitions/      ← WHAT to build (BMC modules & IR helpers)
  01_production_planning/      ← WHEN + HOW
  02_workforce/                ← WHO builds it
  03_assembly_lines/           ← BUILD + DELIVER (this folder)
      01-intake
      02-contracts
      03-registry              ← who & what is allowed on the line (agents, tools, queues, workflow)
      04-scaffold              ← orchestrator + station records (`records/<order-id>/<slug>/`); apps under `apps/`
      05-sprints                 ← `<orderId>/<productId>/sprint-NNN/` (`mfg sprint …`)
      06-gates                   ← gates (`mfg app …`) + validation (`mfg validate …`) + fixtures
      07-telemetry               ← measure the line (assembly-line JSONL + station README)
      08-delivery                ← ship to customer (`deploy.ts`)
  00_product_definitions/app_stack/   ← stack IR *prompt modules* for `mfg app stack` (not under 03_assembly_lines/)
  04_kaizen/                   ← ⚠️ MISSING: continuous improvement layer
```

**Rule:** Folder **`NN-` prefixes** match VSM order. Machine-readable registries for the line live under **`03-registry/registry/`** (task queue, phase queue, tools, workflow, verified apps); the agent roster is authored under **`factory/02_workforce/02_00_agents/agent-registry.json`** and mirrored beside the line as **`03-registry/registry/agent-registry.json`** when needed.

## Stations (VSM order — folder id = first column)

| Id / folder | Path | Station | Role | Canonical path |
|-------------|------|---------|------|------------------|
| `01-intake` | `01-intake/` | Intake | **Order id** + **products** on the manifest → `configs/apps/<productId>/` (no brief authoring here) | `01_00_work_orders/` + `mfg order validate` |
| `02-contracts` | `02-contracts/` | Contracts (app) | Persisted Product IR + System IR + per-app specs | `configs/apps/<app>/` |
| **`03-registry`** | **`03-registry/`** | **Registry** | **Roster for the line:** agents, tools, workflow machine, task queue, phase queue, verified apps — who may work and what state is legal | **`03-registry/registry/`** · agents also **`factory/02_workforce/02_00_agents/agent-registry.json`** |
| *(IR)* | *(see `00_product_definitions/`)* | Blueprint / stack IR | **Prompt trees** under **`factory/00_product_definitions/app_stack/`** — imported by **`06-gates/gates/app-blueprint-config.ts`**; persisted stack under **`configs/apps/<app>/app.stack.json`** | `factory/00_product_definitions/app_stack/` |
| `04-scaffold` | `04-scaffold/` | Scaffold | Orchestrator modules + **audit records** (`records/<order-id>/<slug>/scaffold-run.json`, or `_unscoped`); generated apps only under **`apps/`** | **`04-scaffold/`** (`app-scaffold.ts`, `modules/`) |
| `05-sprints` | `05-sprints/` | Sprints | Per **order + product**: **`05-sprints/<orderId>/…`** — many **`sprint-<NNN>/sprint.json`** with workstation pass-through + **`summary`** | **`05-sprints/sprint-record.ts`** + order folders under **`05-sprints/`** |
| `06-gates` | `06-gates/` | Gates + validation | Brief, stack, negotiate, quote, verified list, spec helpers **`gates/`**; registry / queue / schema validators **`validation/`**; golden files **`fixtures/`** | **`06-gates/gates/`**, **`06-gates/validation/`**, **`06-gates/fixtures/`** |
| `07-telemetry` | `07-telemetry/` | Telemetry | Assembly-line JSONL + run history hooks; CLIs via **`mfg telemetry`** | **`07-telemetry/`**, `factory/factory_internal_ops/telemetry.ts`, `factory/telemetry/` (gitignored evidence) |
| `08-delivery` | `08-delivery/` | Delivery | **`deploy.ts`** — guarded preview / staging / prod | **`08-delivery/deploy.ts`**, CI under **`.github/workflows/`** |

| — | *(outside this mirror)* | Execute | Planner / orchestrator / CLIs | `factory/01_production_planning/`, `factory/factory_cli/` |

Intake is documented only in **`01-intake/README.md`** (order + product ids). Product depth lives under **`factory/00_product_definitions/`** ( **`business_needs/`** + **`app_stack/`** ); templates under **`general_sass_specs/`**.

See each station **`README.md`** for pointers into the repo.

## What is still missing from the assembly line

Stations **`01-intake`** through **`06-gates`** cover intake → registry → scaffold → sprints → gates; **`07-telemetry`** and **`08-delivery`** add measurement and ship paths — see each station’s **`README.md`**.

**Beyond the line:** **`factory/04_kaizen/`** — continuous improvement (not wired yet).
