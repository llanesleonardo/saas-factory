/**
 * Types for the **derived** order-level traceability index.
 *
 * One `TraceOrderRef` file lives per shop order at
 *   `factory/08_traceability/orders/<orderId>.json`
 * and is **rebuilt from source** by `mfg trace build` — never hand-edited.
 *
 * Source-of-truth docs (and their pointers below):
 *   • work-order folder    → `factory/01_production_planning/01_00_work_orders/<orderId>/`
 *   • phases (epics)       → `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json`
 *   • phase breakdowns     → `factory/01_production_planning/01_03_task-registry/<orderId>/`
 *   • canonical task queue → `factory/03_assembly_lines/03-registry/registry/task-queue.json` (filtered to this order)
 *   • sprint records       → `factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-NNN/`
 *   • agent prompts        → `…/sprint-NNN/prompts/<taskId>.md`
 *   • telemetry events     → `factory/telemetry/assembly-line/assembly-line-<date>.jsonl` (filtered to this order/slug)
 *   • product configs      → `configs/apps/<productId>/`
 *
 * Everything here is *pointers + status snapshots*, never copies of doc bodies.
 * Auditors / PMs follow the pointer to the live file when they need the detail.
 */

/** Status of a single task as recorded in `task-queue.json`. */
export type TraceTaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "done"
  | "blocked"
  | "skipped";

/** Status of a single phase as recorded in `order-phases.json`. */
export type TracePhaseStatus = "backlog" | "ready" | "in_progress" | "done" | "blocked";

/** Workstation row state inside a sprint record. */
export type TraceWorkstationStatus =
  | "not_started"
  | "in_progress"
  | "done"
  | "skipped"
  | "blocked";

export interface TracePhaseRef {
  id: string;
  title: string;
  status: TracePhaseStatus;
  /** Tasks in `task-queue.json` whose `order_phase_id` === this phase. */
  taskIds: string[];
  /** Material pointers carried on the phase entry (product_ir, system_ir, spec, …). */
  pointers?: Record<string, string>;
  /** Path to the per-phase breakdown proposal, if it exists. */
  breakdownPath?: string;
  /** Mirror of `depends_on` from `order-phases.json` so consumers can build a DAG. */
  dependsOn?: string[];
}

export interface TraceTaskRef {
  id: string;
  title: string;
  status: TraceTaskStatus;
  blockedReason?: string;
  phaseId?: string;
  workcenters?: string[];
  /** The `app` path stamped on the task (e.g. `apps/<slug>/<slug>-instance`). */
  app?: string;
  dependsOn?: string[];
  priority?: number;
  /** Sprint folder + prompt path, when `sprint task prompt` was used on this task. */
  promptPath?: string;
  sprintNumber?: number;
}

export interface TraceSprintWorkstationRow {
  status: TraceWorkstationStatus;
  notes?: string;
  enteredAt?: string;
  exitedAt?: string;
}

export interface TraceSprintRef {
  number: number;
  title?: string;
  goal?: string;
  /** Folder for the sprint (`…/sprint-NNN/`). */
  folder: string;
  /** Path to `sprint.json`. */
  recordPath: string;
  createdAt: string;
  updatedAt: string;
  workstations: Record<string, TraceSprintWorkstationRow>;
  /** Paths to every `prompts/*.md` under this sprint. */
  promptPaths: string[];
}

export interface TraceEventRef {
  /** ISO timestamp from the telemetry log. */
  ts: string;
  /** `command`, `step`, etc. — copied verbatim from the telemetry record. */
  kind: string;
  workstation?: string;
  command?: string;
  /** Best-effort outcome: `ok` / `error` / `skipped` — derived from the telemetry row. */
  outcome?: string;
  durationMs?: number;
  /** Either the `app` field on the event, or the slug we matched. */
  app?: string;
  /** Optional pointer to the line in the JSONL file (`<file>:<line>`) for deep linking. */
  sourceLine?: string;
}

export interface TraceCounts {
  phases: number;
  tasks: {
    total: number;
    done: number;
    in_progress: number;
    backlog: number;
    blocked: number;
  };
  sprints: number;
  events: number;
  /** How many components (real + sentinel) were selected by the composer. */
  components: number;
}

/**
 * One adapter the composer applied during scaffold. Mirrors the
 * `ScaffoldComponentVersion` shape in `scaffold-run-types.ts` plus a pointer
 * to the manifest file so auditors can drill in.
 */
export interface TraceComponentRef {
  capability: string;
  componentId: string;
  provider: string;
  version: string;
  sentinel: boolean;
  /** Repo-relative path to the adapter's manifest, when discoverable. */
  manifestPath?: string;
  applied: {
    filesWritten: number;
    filesSkipped: number;
    depsAdded: number;
    depsConflicted: number;
    envAdded: number;
  };
}

export interface TraceOrderRef {
  schemaVersion: 1;
  kind: "trace-order";
  orderId: string;
  productId: string;
  /** ISO timestamp when this index file was last rebuilt. */
  builtAt: string;

  /** Pointers (relative paths) to the source-of-truth folders we read. */
  source: {
    orderFolder?: string;
    phaseRegistry?: string;
    taskRegistry?: string;
    sprintsFolder?: string;
    productConfigs?: string;
  };

  /** Lifecycle status from `order-manifest.json` (best-effort; optional). */
  lifecycle?: {
    status?: string;
    setBy?: string;
    setAt?: string;
    reason?: string;
  };

  phases: TracePhaseRef[];
  tasks: TraceTaskRef[];
  sprints: TraceSprintRef[];
  events: TraceEventRef[];
  /** Components the composer applied during scaffold (read from
   *  `configs/apps/<productId>/scaffold-run.json`). Empty until the first
   *  scaffold runs with components enabled. */
  components: TraceComponentRef[];

  counts: TraceCounts;
}

/** Relative path (from repo root) where the per-order index file lives. */
export function traceOrderIndexRelPath(orderId: string): string {
  return `factory/08_traceability/orders/${orderId}.json`;
}
