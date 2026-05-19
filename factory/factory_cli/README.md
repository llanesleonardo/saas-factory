# `factory/factory_cli` — automation + `mfg` (VSM lens)

These scripts are **automated actuators**: they execute repeatable factory procedures (**`mfg.ts`** is the single entry router, plus planning helpers, deploy, cost/telemetry/time utilities, self-heal, queue sync).

- **Planning runtime:** orchestrator + run-task under **`../01_production_planning/01_03_task-registry/`**; next-task planner under **`../01_production_planning/01_01_scheduling_orders/planner.ts`** — not in this folder; `mfg line next` runs **`line-next.ts`**, which imports the planner.

- **Primary VSM role:** **Automation of standard work** — not the kanban *signal*, but the machinery that carries work when a signal says “go.”
- **Secondary role:** Many CLIs **emit outputs** (logs, JSON, exit codes) that become **signals** for humans and for **`04_kaizen/`** (improvement).

**Related:**

- **Instrumentation / measurement:** evidence lands under **`factory/telemetry/`** and is summarized via **`npm run mfg -- telemetry report|assembly-line`**, **`npm run mfg -- kaizen summary`**, **`npm run mfg -- metrics collect`** (dated snapshots under **`05_metrics/snapshots/`**), plus `time-tracker.ts`. Assembly-line station code: **`03_assembly_lines/07-telemetry/`** (`assembly-line-log.ts`); `mfg` routes **`telemetry`**, **`kaizen`**, **`metrics collect`**, and matching **`line *`** aliases.

Do **not** move this folder under **`04_kaizen/`** — kaizen *uses* metrics from runs; it is not the actuator layer.
