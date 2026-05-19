# 08 — Traceability (derived order-level index)

**Role.** Answer the question "for one shop order, what is the full chain — from the customer brief to the deployed app — and where do I look for each step?" All the underlying docs already exist in the factory (briefs, manifests, phases, tasks, sprints, telemetry, prompts). This stage just **joins** them into one queryable index per order.

**The index is derived. Never hand-edit anything in this folder.** If a file looks wrong, rebuild it:

```bash
npm run mfg -- trace build <orderId>
```

The rebuild reads only source-of-truth files (listed below) — it never invents data.

## Layout

```text
factory/08_traceability/
  README.md                       # this file
  orders/<orderId>.json           # one TraceOrderRef per shop order
  index-build.log.jsonl           # append-only log of every rebuild
```

## What's in an order index

Each `orders/<orderId>.json` carries `kind: "trace-order"` and includes:

- **Source pointers** — repo-relative paths to every folder the index drew from (work-order folder, phase registry, task registry, sprint folders, product configs). Auditors follow the pointer to read the actual doc.
- **Lifecycle** — current status from `order-manifest.json` (best-effort).
- **`phases[]`** — every entry from `order-phases.json`, plus the `breakdownPath` for the per-phase proposal and a `taskIds[]` list.
- **`tasks[]`** — every task in `task-queue.json` scoped to this order (by `order_phase_id` or by the app-path fallback). Each task carries its `status`, `blockedReason`, lane, dependencies, and (when present) the path to the agent handoff prompt + the sprint number that owns it.
- **`sprints[]`** — every `sprint-NNN/sprint.json` plus the list of `prompts/*.md` written under it.
- **`events[]`** — every telemetry row (from `factory/telemetry/assembly-line/*.jsonl`) whose `mfg_argv_tail` / `command` / `app` mentions this order id or this productId.
- **`counts`** — quick rollup (phases, tasks split by status, sprints, events).

## Sources read on every rebuild

| Stage | File / folder |
|---|---|
| Work order | `factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json` |
| Phases | `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json` |
| Phase breakdowns | `factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-*.json` |
| Tasks (canonical) | `factory/03_assembly_lines/03-registry/registry/task-queue.json` (filtered) |
| Sprints + prompts | `factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-NNN/{sprint.json, prompts/*.md}` |
| Telemetry | `factory/telemetry/assembly-line/assembly-line-*.jsonl` (filtered to this order/slug) |
| Product configs (pointer only) | `configs/apps/<productId>/` |

## CLI

```bash
# Rebuild one order's index
npm run mfg -- trace build <orderId> [--product <productId>] [--json]

# Rebuild every order discovered under work-orders/ or phase-registry/
npm run mfg -- trace build --all

# Print the chain for one order (human-readable; --json dumps the full record)
npm run mfg -- trace order <orderId> [--rebuild] [--json] [--events N]
```

`trace build` is also the last step of `mfg pipeline run`, so the index is always fresh when you reach the sprint hand-off.

## When the index drifts

If a task gets manually edited in `task-queue.json` or a sprint gets edited by hand, the index will lag until the next rebuild. Two ways to stay current:

1. **Implicit** — re-run `mfg pipeline run … --only trace-build` (or just let the pipeline re-run end-to-end).
2. **Explicit** — `mfg trace order <orderId> --rebuild` regenerates and prints in one shot. Use this after a `line done <taskId>` if you want both the queue update **and** the index refreshed.

## Why this folder instead of a database

We considered moving every event to SQLite (or building a separate `traceability/` folder containing copies of the docs). We picked an index because:

- The data is already structured JSON in known places — there's nothing to migrate, just to **join**.
- The index is a function of the source files; deleting it and rebuilding costs ~1 second.
- Git diffs stay reviewable. Auditors can `git log -- factory/08_traceability/orders/<orderId>.json` to see how the chain evolved.
- If we later need cross-order queries (e.g., "show every blocked task across orders this month"), we add a `mfg trace audit --to sqlite` exporter on top. The index is shaped to load directly into a relational schema.

See **`factory/06_knowledge_base/go_to_market/SALES-AND-ASSEMBLY-LINE-GUIDE.md`** for how `trace order` fits into the day-to-day factory loop.
