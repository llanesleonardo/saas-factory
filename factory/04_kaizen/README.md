# Kaizen — after the assembly line

**Kaizen** (改善) here means **closing the learning loop**: once work has flowed through **`03_assembly_lines/`** (and optionally shipped via **`08-delivery/`**), you deliberately turn **signals** into **smaller, safer changes** to definitions, planning, workforce, gates, or tooling.

This folder is **process + artifacts**, not automation. It **consumes** telemetry and validation output; it does **not** replace **`factory/factory_cli/`**, **`factory/telemetry/`**, or **`03_assembly_lines/07-telemetry/`**.

---

## What belongs here

| Artifact | Purpose |
|----------|---------|
| **`kaizen-cli.ts`** | Invoked as **`npm run mfg -- kaizen …`** — **`new`** scaffolds **`backlog/`** from the template; **`summary`** reads JSONL for a UTC day (slowest dispatches, failure samples, run-history counts). No factory validators added. |
| **`SIGNALS.md`** | Where to look after a run (logs, validators, CI) — the “sense” step. |
| **`templates/`** | Copy/paste starters for improvement items and short retros. |
| **`backlog/`** | Optional dated markdown items (experiments, standard-work tweaks) before they become **`task-queue.json`** tasks. |

## Commands (`mfg`)

| Command | Purpose |
|---------|---------|
| **`npm run mfg -- kaizen new [--slug <id>] [--title "…"] [--force]`** | Writes **`backlog/YYYY-MM-DD-<slug>.md`** from **`templates/improvement-item.template.md`** (prefills today’s UTC date in the template). |
| **`npm run mfg -- kaizen summary [--day YYYY-MM-DD] [--top N] [--json]`** | Parses **`factory/telemetry/assembly-line/assembly-line-<day>.jsonl`** + **`run-history-<day>.jsonl`** (if present): event/workstation counts, failure samples, slowest **`cli_dispatch_end`** rows, run-history rollups. **`--json`** for machines / dashboards. |
| **`npm run mfg -- line kaizen -- …`** | Same pass-through as top-level **`kaizen`** (matches other **`line *`** aliases). |

---

## What does **not** belong here

- **CLIs and scripts** that *execute* the line → **`factory/factory_cli/`** (`mfg`, deploy, validators).
- **Raw telemetry streams** → **`factory/telemetry/`** (gitignored) + **`07-telemetry/`** (schema/code).
- **Product or app source code** → **`apps/`**, **`configs/apps/`**, **`00_product_definitions/`**.

**Exception:** **`kaizen-cli.ts`** lives in this folder but only **reads** telemetry JSONL and **writes** **`backlog/*.md`**; it is still invoked via **`npm run mfg -- kaizen …`** (dispatcher in **`factory_cli/mfg.ts`**).

## Minimal loop (post–assembly line)

1. **Sense** — Read **`SIGNALS.md`**, or run **`npm run mfg -- kaizen summary`** for the UTC day you care about. Pick one recurring failure class or slow dispatch.
2. **Decide** — One hypothesis (“if we tighten X, Y improves”). Prefer **one** change per cycle (see **`../06_knowledge_base/process/LEAN-MANUFACTURING.md`** §8 Kaizen).
3. **Act** — Open a PR: update agent markdown, a gate, **`tool-registry.json`**, a fixture, **`mfg` help**, or a README. Large behavior changes get a **`task-queue.json`** id first (PM).
4. **Verify** — **`npm run check`**, **`npm run mfg -- validate factory`**, and (if you touched product paths) app CI.
5. **Record** — QMS-style evidence under **`../06_knowledge_base/qms_docs/inbox/`** when a role gate expects it; link the PR and the signal path (log file + day UTC).

---

## Handoffs back “up” the value stream

| If the improvement touches… | Prefer updating… |
|-----------------------------|-------------------|
| Slugs, BMC slices, stack prompts | **`00_product_definitions/`**, **`configs/apps/`** |
| Orders, phases, tasks | **`01_production_planning/`**, **`03-registry/registry/task-queue.json`** |
| Agents, tools, workstations | **`02_workforce/`**, **`03-registry/registry/*.json`** |
| Validators, fixtures, `mfg` | **`03_assembly_lines/06-gates/`**, **`factory_cli/`** |

---

## Related reading

- **Lean in this repo:** `factory/06_knowledge_base/process/LEAN-MANUFACTURING.md`
- **Sales ↔ line overview:** `factory/06_knowledge_base/go_to_market/SALES-AND-ASSEMBLY-LINE-GUIDE.md`
- **Telemetry:** start with **`npm run mfg -- kaizen summary`** (Kaizen-oriented digest: failures + slow **`mfg`** dispatches + run history). For raw counts only, use **`npm run mfg -- telemetry assembly-line`** / **`telemetry report`**.

Start with **`SIGNALS.md`** or **`npm run mfg -- kaizen summary`**, then **`npm run mfg -- kaizen new --slug …`** (or copy **`templates/improvement-item.template.md`**) when you are not ready to open a **`task-queue.json`** task yet.
