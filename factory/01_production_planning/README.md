# Production planning

**Goal:** one shop order → recorded lifecycle → calendar schedule → **phase/epic roadmap** for that order → (later) atomic tasks in `task-queue.json`.

## Folder map (numbered)

| Path | What |
|------|------|
| **`01_00_work_orders/<order-id>/`** | **`order-manifest.json`** (product link + optional **`lifecycleStatus`**), **`sales-order.json`** / **`work-order.json`**, **`order-schedule-calendar.json`**, **`order-events.jsonl`**. |
| **`01_01_scheduling_orders/`** | Heijunka JSON (`production-schedule.json`, `wip-limits.json`, `priority-matrix.json`) + **`planner.ts`** for **`mfg line next`**. |
| **`01_02_phase_registry/<order-id>/`** | Per-order **`order-phases.json`** (epic roadmap from **`mfg order phases init`**). |
| **`01_03_task-registry/`** | **`phase-breakdown-*.json`** proposals (per order) + **`orchestrator.ts`** / **`run-task.ts`**. Output of **`order phases … breakdown`** / **`app bdtask`**. |
| **`plans/<product>-<version>/`** | Optional deep product plan (markdown / helpers). Linked by **`planRef`** on the manifest when used. |
| **`runtime/`** | Redirect **`README.md`** only (scripts moved to **`01_03`** / **`01_01`**). |

Product IR / business needs live under **`../00_product_definitions/`** and **`configs/apps/<productId>/`** — not duplicated here.

## Recommended sequence

1. **Create / validate order** — folder under **`01_00_work_orders/`** with **`order-manifest.json`**; `npm run mfg -- order validate <id>`.
2. **Commercial path (optional)** — `npm run mfg -- so` → `npm run mfg -- wo` (quote, confirm → work order).
3. **Record factory lifecycle** — `npm run mfg -- order lifecycle <id> set scheduled` (writes **`order-events.jsonl`**).
4. **Schedule manufacturing window** — `npm run mfg -- order schedule <id> --start …` → **`order-schedule-calendar.json`**.
5. **Phases (epics) for this order** — `npm run mfg -- app bdphase -- <id>` (or **`order phases <id> init`**) → **`01_02_phase_registry/<id>/order-phases.json`**. Each epic has optional **`basis`** (business needs vs blueprint vs SaaS vs delivery) and **`lanes`** (frontend, backend, api, …). Refine with **`order phases … annotate`**. Adjust status with **`set-status`**.
6. **Tasks** — `npm run mfg -- app bdtask -- <id> <phaseId>` proposes lane-shaped tasks under **`01_03_task-registry/<id>/`**; merge into **`factory/03_assembly_lines/03-registry/registry/task-queue.json`**, then **`npm run mfg -- validate task-queue`**. Pull work with **`mfg line next`**.

**Legacy:** Ignore stray empty **`orders/`** paths (see repo **`.gitignore`**).
