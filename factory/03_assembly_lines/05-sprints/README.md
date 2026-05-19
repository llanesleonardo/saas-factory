# Station: Sprints (manual iteration, tasks-aware)

**Role.** The sprint stage is where humans + agents actually do the work. The factory pipeline **stops here**: every step up to `sprint init` is automated, then control hands back to you. From inside the sprint folder you (a) see which tasks belong to this iteration, (b) generate a structured prompt to hand a task to an agent, and (c) mark tasks done — the four workstation rows auto-derive from the task queue so you never have to flip them manually.

Each sprint record (`sprint.json`) still stores the four **workstations** (`workstation-map.json`) — `backlog_plan`, `increment_build`, `integrate_verify`, `release_transition` — but their `status` is now a **derived view** of the tasks scoped to this sprint (queryable, overwritable, never out of sync).

## Layout

```text
factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-<NNN>/
  sprint.json            # workstation rows (auto-synced from task-queue.json)
  prompts/<taskId>.md    # written by `sprint task prompt <taskId>`
```

- **`sprint-<NNN>`** — zero-padded folder (`sprint-001`, …) so sort = time order.
- **`sprint.json`** — `kind: "sprint-record"`; schema **`factory/factory_schemas/sprint-record.schema.json`**.

## Manual workflow (the way you actually use this)

The factory pipeline ends at `sprint-handoff`, which runs `sprint board`. From that moment on, your loop looks like:

```bash
# 1. See what to work on next.
npm run mfg -- sprint board <orderId> <slug>

# 2. Pick a task; generate the agent handoff prompt.
npm run mfg -- sprint task prompt <taskId>
#   → writes sprint-NNN/prompts/<taskId>.md AND prints to stdout

# 3. Open a second Cursor window scoped to apps/<slug>/
#    Drop the .md in, or paste the stdout block, and say:
#    "please follow this task".

# 4. When the agent is done, mark the task complete.
npm run mfg -- line done <taskId>
#   (use --status blocked --reason "<why>" if it's stuck)

# 5. Re-run sprint board — workstation rows refresh from the queue.
npm run mfg -- sprint board <orderId> <slug>
```

When `sprint board` reports **`All N task(s) done`**, the sprint is shippable. Run the (now opt-in) downstream steps yourself when you're ready:

```bash
npm run mfg -- gates review <orderId> <slug>
npm run mfg -- deploy preview -- --dry-run
npm run mfg -- app verified -- add <slug>
```

## CLI reference

```bash
# Setup / records (unchanged)
npm run mfg -- sprint init   <orderId> <slug> --title "MVP slice" --goal "…"
npm run mfg -- sprint list   <orderId> <slug>
npm run mfg -- sprint show   <orderId> <slug> <sprintNumber>
npm run mfg -- sprint summary <orderId> <slug> <sprintNumber>

# New manual-flow commands
npm run mfg -- sprint board  <orderId> <slug> [--sprint N] [--no-write] [--json]
npm run mfg -- sprint task prompt <taskId> [--sprint N] [--no-write]

# Manual flip (edge cases — normally `sprint board` syncs from the queue)
npm run mfg -- sprint workstation <orderId> <slug> <n> <workstationId> <status> [--notes "…"]
```

**Workstation ids:** `backlog_plan` | `increment_build` | `integrate_verify` | `release_transition`  
**Status:** `not_started` | `in_progress` | `done` | `skipped` | `blocked`

### How rows derive from tasks

`sprint board` maps every phase to a workstation, then computes the row's status from the tasks in that workstation:

| Phase id pattern | Lane | → Workstation |
|---|---|---|
| `…_P0_…`, `…_P1_…`, `…_P3_…` | any | `backlog_plan` |
| `…_P2_…`, `…_P4_…` | any | `increment_build` |
| `…_P5_…` | `qa` | `integrate_verify` |
| `…_P5_…` | `infra` / `docs` | `release_transition` |
| anything else | — | `increment_build` (default) |

Within a workstation: all `done` → row is `done`; any `in_progress` → `in_progress`; any `blocked` → `blocked`; else `not_started`.

## Related

- Workstation definitions: **`factory/02_workforce/02_02_workstations/workstation-map.json`** + **`workstation_definitions/*.md`**
- Task queue: **`factory/03_assembly_lines/03-registry/registry/task-queue.json`**
- Order phases (source of truth for the tasks): **`factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json`**
- Order intake: **`factory/01_production_planning/01_00_work_orders/<orderId>/`**
