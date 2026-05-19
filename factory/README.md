# Factory (`factory/`)

Numbered zones describe **what → when → who → build → improve**. Several folders are **cross-cutting**: they support every zone without replacing them.

## Numbered value-stream zones

```text
factory/
  00_product_definitions/      ← WHAT to build
  01_production_planning/       ← WHEN + HOW
  02_workforce/                 ← WHO builds it
  03_assembly_lines/            ← BUILD + DELIVER (stations 01-intake … 08-delivery)
  04_kaizen/                    ← continuous improvement (process), not automation code — **`04_kaizen/README.md`**
  05_metrics/                   ← human pulse snapshots — **`05_metrics/README.md`** (`mfg metrics collect`)
  06_knowledge_base/            ← doctrine, QMS, architecture narratives — start at **`06_knowledge_base/docs/README.md`** (no `.md` at folder root; see **`06_knowledge_base/INDEX.txt`**)
  07_verified_product/          ← verified vertical specs + replication playbooks — **`07_verified_product/README.md`** (`products/<slug>/`, registry: **`03-registry/registry/verified-apps.json`**)
```

**Kaizen hub:** after the line runs, use **`factory/04_kaizen/`** (`SIGNALS.md`, templates, optional backlog) to close the learning loop — see **`04_kaizen/README.md`**.

**Metrics pulse:** weekly or milestone **`npm run mfg -- metrics collect`** → dated **`05_metrics/snapshots/factory-metrics-*/metrics.json`** (probes + prompts) — see **`05_metrics/README.md`**.

**Verified products (replicate):** curated specs under **`factory/07_verified_product/products/<slug>/`**; machine list via **`npm run mfg -- app verified`** → **`factory/03_assembly_lines/03-registry/registry/verified-apps.json`**.

*(Folder name is `03_assembly_lines` in this repo.)*

## Cross-cutting: automation + instrumentation (where to put them)

| Idea | Put it here | VSM role |
|------|-------------|----------|
| **Automated actuators** — scripts that *run* standard work (configure, scaffold, deploy, validate helpers) | **`factory/factory_cli/`** (`mfg.ts`, deploy, telemetry, …) | Automation of standard work; invokes gates/scaffold/planning runtime across stations |
| **Instrumentation + evidence** — run history, timing, cost signals | **`factory/telemetry/`**, **`factory/metrics/`** (if present), relevant **`factory/factory_cli/*`** entrypoints | Measurement layer; pairs with assembly-line station **`03_assembly_lines/07-telemetry/`** (event schema + docs) |
| **Orchestration / dispatch (planning)** | **`factory/01_production_planning/01_03_task-registry/`** (+ **`01_01_scheduling_orders/planner.ts`**) | Orchestrator / run-task + next-task planner — ties planning + registry to execution |
| **Fixtures** — golden inputs/outputs for validators & harnesses | **`factory/03_assembly_lines/06-gates/fixtures/`** (`factory/fixtures` → symlink for compatibility); app tests under `apps/…` | Controlled evidence for **`06-gates`** validators |
| **Schemas (JSON Schema)** — machine-checkable **contract shapes** | **`factory/factory_schemas/`** | Cross-cutting **standard work for data**: what a vertical brief, PM output, task queue, registry, QMS record, *etc.* must look like; **`06-gates/validation`** enforces them; **`00_product_definitions/`** and **`configs/apps/`** (contracts) *reference* them via `$schema` on disk |

So: **do not** fold CLIs into **`04_kaizen/`**. Kaizen is *how you improve the system*; **`cli/`** is *how the system runs*. **`04_kaizen/`** should *consume* signals from telemetry and incidents and propose changes — it does not replace **`cli/`** or **`telemetry/`**.

**Signals** (schedules, queues, priorities) live mainly in **`01_production_planning/`** and **`03_assembly_lines/03-registry/registry/`** (task queue, phase queue, workflow machine, tool roster on the line) plus **`02_workforce/02_00_agents/agent-registry.json`** — CLIs and telemetry **read/write** those artifacts but are not the signals themselves.

**Delivery (where the app runs):** `npm run mfg -- deploy preview | staging | prod` — preview for visual/smoke, staging for thorough testing (you can stop there), prod when ready. Details: **`factory/03_assembly_lines/08-delivery/README.md`**, orchestrator: **`factory/03_assembly_lines/08-delivery/deploy.ts`**.

## Bulk search / replace (paths, renames)

Use **POSIX `grep -rl`** to list files for `sed` / `perl` / `xargs` — **do not assume `rg` (ripgrep)** is installed in every environment.

```bash
# Example: list TypeScript + Markdown files matching a path segment (exclude node_modules)
grep -rl '03_assembly_lines/06-gates' --include='*.ts' --include='*.md' . 2>/dev/null | grep -v node_modules
```

Pipe that list into your editor or `perl -pi -e '…'` inside a `while read -r f` loop as needed.
