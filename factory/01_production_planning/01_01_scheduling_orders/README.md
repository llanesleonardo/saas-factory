# Scheduling

## JSON (plans / Heijunka)

| File | Purpose |
|------|---------|
| `production-schedule.json` | Ordered queue of **active** plans (Heijunka-style board). |
| `wip-limits.json` | Max concurrent plans **per phase** (or per lane). |
| `priority-matrix.json` | **Takt** / priority × risk × dependency order. |

## TypeScript

| File | Purpose |
|------|---------|
| `planner.ts` | Next pullable factory task + WIP cap (`planNext`, prompt helpers). Used by **`factory/factory_cli/line-next.ts`** (`mfg line next`). |
