/**
 * Pure index builder for one order.
 *
 * Take the outputs of the source loaders (`read-sources.ts`) and compose them
 * into a single `TraceOrderRef` document. No I/O lives here — the CLI does
 * the file reads/writes and feeds inputs into `buildOrderTraceIndex`.
 */
import type { FactoryTask } from "../planning/task-graph.js";
import type { OrderPhasesDoc } from "../orders/order-phases-types.js";
import { filterTasksForOrder } from "../sprints/sprint-task-selection.js";

import type {
  OrderManifest,
  SprintFolder,
  TelemetryRow,
} from "./read-sources.js";
import type {
  TraceComponentRef,
  TraceCounts,
  TraceEventRef,
  TraceOrderRef,
  TracePhaseRef,
  TracePhaseStatus,
  TraceSprintRef,
  TraceSprintWorkstationRow,
  TraceTaskRef,
  TraceTaskStatus,
} from "./trace-types.js";

export interface BuildOrderIndexInput {
  orderId: string;
  productId: string;
  manifest: OrderManifest | null;
  phasesDoc: OrderPhasesDoc | null;
  breakdownPathsByPhaseId: Record<string, string>;
  allTasks: FactoryTask[];
  sprints: SprintFolder[];
  telemetry: TelemetryRow[];
  /** Components captured in `configs/apps/<productId>/scaffold-run.json` (may be empty). */
  components: TraceComponentRef[];
  /** Repo-relative source pointers (orderFolder, phaseRegistry, …). */
  source: TraceOrderRef["source"];
  builtAt?: string;
}

/** Coerce arbitrary status strings onto our enums, defaulting where unknown. */
function asTaskStatus(s: string | undefined): TraceTaskStatus {
  switch ((s ?? "backlog").trim()) {
    case "ready":
    case "in_progress":
    case "done":
    case "blocked":
    case "skipped":
      return s as TraceTaskStatus;
    case "backlog":
    default:
      return "backlog";
  }
}
function asPhaseStatus(s: string | undefined): TracePhaseStatus {
  switch ((s ?? "backlog").trim()) {
    case "ready":
    case "in_progress":
    case "done":
    case "blocked":
      return s as TracePhaseStatus;
    case "backlog":
    default:
      return "backlog";
  }
}

function countTasks(tasks: TraceTaskRef[]): TraceCounts["tasks"] {
  const c = { total: tasks.length, done: 0, in_progress: 0, backlog: 0, blocked: 0 };
  for (const t of tasks) {
    if (t.status === "done") c.done += 1;
    else if (t.status === "in_progress") c.in_progress += 1;
    else if (t.status === "blocked") c.blocked += 1;
    else c.backlog += 1; // ready + backlog + skipped collapse for the headline count
  }
  return c;
}

/**
 * Compose the index. Pure: deterministic given the same inputs.
 */
export function buildOrderTraceIndex(input: BuildOrderIndexInput): TraceOrderRef {
  const {
    orderId,
    productId,
    manifest,
    phasesDoc,
    breakdownPathsByPhaseId,
    allTasks,
    sprints,
    telemetry,
    components,
    source,
  } = input;
  const builtAt = input.builtAt ?? new Date().toISOString();

  // ── 1. Scope tasks to this order ──────────────────────────────────────────
  // If we have a phases doc, scope by `order_phase_id` membership (preferred).
  // Otherwise fall back to the app-path filter via `filterTasksForOrder` which
  // already handles both nested (`apps/<slug>/<slug>-instance`) and flat
  // (`apps/<slug>-instance`) layouts.
  const scoped: FactoryTask[] = phasesDoc
    ? filterTasksForOrder(allTasks, phasesDoc, productId)
    : allTasks.filter((t) => {
        const app = (t.app ?? "").trim();
        return (
          app === `apps/${productId}` ||
          app === `apps/${productId}-instance` ||
          app === `apps/${productId}-api` ||
          app === `apps/${productId}/${productId}-instance` ||
          app === `apps/${productId}/${productId}-api` ||
          app.startsWith(`apps/${productId}/`)
        );
      });

  // ── 2. Index sprint metadata for each task (prompt path + sprint number) ──
  const promptByTask = new Map<string, { sprintNumber: number; rel: string }>();
  for (const sp of sprints) {
    for (const [taskId, rel] of Object.entries(sp.promptByTaskId)) {
      // Keep the latest sprint's prompt if the same id appears in multiple
      // sprints (rare; the agent re-ran the prompt for a later iteration).
      const existing = promptByTask.get(taskId);
      if (!existing || sp.number > existing.sprintNumber) {
        promptByTask.set(taskId, { sprintNumber: sp.number, rel });
      }
    }
  }

  // ── 3. Phases array (preserve order from order-phases.json) ───────────────
  const phases: TracePhaseRef[] = (phasesDoc?.phases ?? []).map((p) => {
    const taskIds = scoped
      .filter((t) => (t.order_phase_id ?? "").trim() === p.id)
      .map((t) => t.id);
    const ref: TracePhaseRef = {
      id: p.id,
      title: p.title,
      status: asPhaseStatus(p.status),
      taskIds,
    };
    if (p.pointers) ref.pointers = { ...p.pointers };
    if (p.depends_on?.length) ref.dependsOn = [...p.depends_on];
    const bp = breakdownPathsByPhaseId[p.id];
    if (bp) ref.breakdownPath = bp;
    return ref;
  });

  // ── 4. Tasks array ────────────────────────────────────────────────────────
  const tasks: TraceTaskRef[] = scoped.map((t) => {
    const ref: TraceTaskRef = {
      id: t.id,
      title: t.title,
      status: asTaskStatus(t.status as string | undefined),
    };
    if (t.blocked_reason) ref.blockedReason = t.blocked_reason;
    const opid = (t.order_phase_id ?? "").trim();
    if (opid) ref.phaseId = opid;
    if (t.workcenters?.length) ref.workcenters = [...t.workcenters];
    if (t.app) ref.app = t.app;
    if (t.depends_on?.length) ref.dependsOn = [...t.depends_on];
    if (typeof t.priority === "number") ref.priority = t.priority;
    const prompt = promptByTask.get(t.id);
    if (prompt) {
      ref.promptPath = prompt.rel;
      ref.sprintNumber = prompt.sprintNumber;
    }
    return ref;
  });

  // ── 5. Sprints array ──────────────────────────────────────────────────────
  const sprintRefs: TraceSprintRef[] = sprints.map((sp) => {
    const workstations: Record<string, TraceSprintWorkstationRow> = {};
    for (const [id, row] of Object.entries(sp.record.workstations)) {
      workstations[id] = {
        status: row.status,
        notes: row.notes,
        enteredAt: row.enteredAt,
        exitedAt: row.exitedAt,
      };
    }
    return {
      number: sp.number,
      title: sp.record.title,
      goal: sp.record.goal,
      folder: sp.folderRel,
      recordPath: sp.recordPathRel,
      createdAt: sp.record.createdAt,
      updatedAt: sp.record.updatedAt,
      workstations,
      promptPaths: [...sp.promptPathsRel].sort((a, b) => a.localeCompare(b)),
    };
  });

  // ── 6. Telemetry events ───────────────────────────────────────────────────
  const events: TraceEventRef[] = telemetry.map((row) => {
    const ev: TraceEventRef = {
      ts: row.timestamp_utc ?? "",
      kind: row.event_kind ?? "unknown",
    };
    if (row.workstation) ev.workstation = row.workstation;
    if (row.command) ev.command = row.command;
    if (row.outcome) ev.outcome = row.outcome;
    if (typeof row.duration_ms === "number") ev.durationMs = row.duration_ms;
    if (row.app) ev.app = row.app;
    if (row._sourceLine) ev.sourceLine = row._sourceLine;
    return ev;
  });

  // ── 7. Lifecycle (best-effort, optional in manifest) ──────────────────────
  const lifecycle = manifest?.lifecycle
    ? {
        status: manifest.lifecycle.status,
        setBy: manifest.lifecycle.setBy,
        setAt: manifest.lifecycle.setAt,
        reason: manifest.lifecycle.reason,
      }
    : undefined;

  const out: TraceOrderRef = {
    schemaVersion: 1,
    kind: "trace-order",
    orderId,
    productId,
    builtAt,
    source,
    phases,
    tasks,
    sprints: sprintRefs,
    events,
    components,
    counts: {
      phases: phases.length,
      tasks: countTasks(tasks),
      sprints: sprintRefs.length,
      events: events.length,
      components: components.length,
    },
  };
  if (lifecycle) out.lifecycle = lifecycle;
  return out;
}
