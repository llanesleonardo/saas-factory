# Task registry (`01_03_task-registry/`)

## TypeScript (`mfg line …`)

| File | Role |
|------|------|
| `orchestrator.ts` | Human runbook over `factory/03_assembly_lines/03-registry/registry/task-queue.json` (`mfg line orchestrate`). |
| `run-task.ts` | Thin wrapper → orchestrator (`mfg line run`). |

## Canonical queue + planning

**Source of truth for tasks:** `factory/03_assembly_lines/03-registry/registry/task-queue.json`.

Use **`npm run mfg -- line next`**, **`line queue`**, and **`line done`** against that file (optional **`--queue=<path>`** for a different JSON file, e.g. fixtures).

## Phase → task proposals (under `<orderId>/`)

Two entry points produce the per-phase `phase-breakdown-<phaseId>.json` files under `01_03_task-registry/<orderId>/`:

| Command | Scope | Merges into `task-queue.json`? | Use case |
|---------|-------|--------------------------------|----------|
| `npm run mfg -- app bdtask -- <orderId> <phaseId>` (alias of `order phases … breakdown`) | One phase | No — writes proposal only; review then merge by hand | PM-led manual review of a single epic |
| `npm run mfg -- app build-tasks -- <orderId>` | All phases in `order-phases.json` | Yes (auto, status="backlog") — pass `--no-merge` to opt out | Pipeline default: new apps come out with a populated queue |

`build-tasks` is wired into `mfg pipeline run` immediately after `bdphase`. To go back to the manual single-phase flow for a given pipeline run, pass `--no-auto-tasks` to `pipeline run` (or `--skip build-tasks`).

Flags shared by `build-tasks`:
- `--no-merge`  — write per-phase files; don't touch `task-queue.json`
- `--dry-run`   — print the plan; don't write anything
- `--json`      — single JSON summary at the end (suppresses progress lines)

Task ids follow `<PRODUCT_PREFIX>_<seq>_<phaseSlug>_<lane>` (e.g. `HELLO_TASKS_007_HELLO_TASKS_P4_BUILD_frontend`); seq/priority are bumped against the existing queue + everything proposed earlier in the same `build-tasks` run, so two phases never collide. Tasks land with `status="backlog"` and the originating `order_phase_id` so `mfg line next` can trace each task back to its epic.
