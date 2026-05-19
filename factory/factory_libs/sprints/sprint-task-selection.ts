/**
 * Pure helpers used by `mfg sprint board` and `mfg sprint task …`.
 *
 * Filter the canonical task-queue down to one order's tasks, find the next
 * ready task (lowest priority, no incomplete deps), group by phase, and map a
 * phase to its conceptual workstation row.
 *
 * No I/O lives here — the CLI layer reads JSON and feeds it in.
 */
import type { FactoryTask, TaskStatus } from "../planning/task-graph.js";
import type { OrderPhasesDoc, OrderPhaseEntry } from "../orders/order-phases-types.js";
import { SPRINT_WORKSTATION_IDS, type SprintWorkstationId } from "./sprint-types.js";

/** Status used when a task omits `status` (defaults to "backlog" for planning). */
export function effectiveStatus(t: FactoryTask): TaskStatus {
  return (t.status ?? "backlog") as TaskStatus;
}

/**
 * Return the subset of tasks that belong to an order:
 *   1. Task's `order_phase_id` matches one of the order's phases (preferred), OR
 *   2. Task's `app` path matches the order's productId (fallback for legacy
 *      tasks that pre-date `order_phase_id`).
 */
export function filterTasksForOrder(
  tasks: FactoryTask[],
  orderPhases: OrderPhasesDoc,
  productId: string,
): FactoryTask[] {
  const phaseIds = new Set(orderPhases.phases.map((p) => p.id));
  const slug = productId.trim();
  const appCandidates = new Set([
    `apps/${slug}`,
    `apps/${slug}/${slug}-instance`,
    `apps/${slug}/${slug}-api`,
    `apps/${slug}-instance`,
    `apps/${slug}-api`,
  ]);
  return tasks.filter((t) => {
    const opid = (t.order_phase_id ?? "").trim();
    if (opid && phaseIds.has(opid)) return true;
    const app = (t.app ?? "").trim();
    if (!app) return false;
    if (appCandidates.has(app)) return true;
    if (app.startsWith(`apps/${slug}/`)) return true;
    return false;
  });
}

export function findTaskById(tasks: FactoryTask[], id: string): FactoryTask | undefined {
  const trimmed = id.trim();
  return tasks.find((t) => t.id === trimmed);
}

/**
 * The "next ready task" rule: lowest priority among tasks whose status is
 * `backlog` or `ready` and whose `depends_on` are all `done` in the **scoped**
 * task list. We scope to the order's tasks first; the queue at large may
 * contain unrelated rows.
 *
 * Ties broken by id (alphabetical) for stable ordering.
 */
export function findNextReadyTask(scopedTasks: FactoryTask[]): FactoryTask | undefined {
  const byId = new Map(scopedTasks.map((t) => [t.id, t]));
  const isComplete = (id: string): boolean => {
    const t = byId.get(id);
    if (!t) return true; // unknown dep — treat as satisfied (lives outside our scope)
    return effectiveStatus(t) === "done";
  };
  const ready = scopedTasks.filter((t) => {
    const s = effectiveStatus(t);
    if (s !== "backlog" && s !== "ready") return false;
    const deps = t.depends_on ?? [];
    return deps.every(isComplete);
  });
  ready.sort((a, b) => {
    const pa = a.priority ?? Number.POSITIVE_INFINITY;
    const pb = b.priority ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
  return ready[0];
}

export interface PhaseTaskGroup {
  phase: OrderPhaseEntry;
  tasks: FactoryTask[];
  workstationId: SprintWorkstationId;
}

/**
 * Map a phase id + lane to a workstation row. Defaults assume the built-in
 * 6-phase SaaS template (P0/P1/P3 → backlog_plan, P2/P4 → increment_build,
 * P5 → integrate_verify or release_transition by lane); falls back to
 * `increment_build` so unknown phases still show up somewhere reasonable.
 */
export function phaseToWorkstation(
  phaseId: string,
  lane: string | undefined,
): SprintWorkstationId {
  const id = phaseId.toUpperCase();
  if (/_P0_/.test(id) || /_P1_/.test(id) || /_P3_/.test(id)) return "backlog_plan";
  if (/_P2_/.test(id) || /_P4_/.test(id)) return "increment_build";
  if (/_P5_/.test(id)) {
    if (lane === "qa") return "integrate_verify";
    return "release_transition"; // infra + docs ship as release_transition
  }
  return "increment_build";
}

/** Group tasks by their `order_phase_id` in the order of `phases[]`. */
export function groupTasksByPhase(
  scopedTasks: FactoryTask[],
  orderPhases: OrderPhasesDoc,
): PhaseTaskGroup[] {
  const byPhase = new Map<string, FactoryTask[]>();
  for (const t of scopedTasks) {
    const opid = (t.order_phase_id ?? "").trim();
    if (!opid) continue;
    if (!byPhase.has(opid)) byPhase.set(opid, []);
    byPhase.get(opid)!.push(t);
  }
  const groups: PhaseTaskGroup[] = [];
  for (const phase of orderPhases.phases) {
    const tasks = byPhase.get(phase.id) ?? [];
    if (tasks.length === 0) continue;
    // workstation is computed from phase id + the majority lane of its tasks
    const firstLane = tasks[0]?.workcenters?.[0];
    groups.push({
      phase,
      tasks: tasks.slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
      workstationId: phaseToWorkstation(phase.id, firstLane),
    });
  }
  return groups;
}

export interface TaskCounts {
  total: number;
  done: number;
  in_progress: number;
  backlog: number;
  blocked: number;
}

export function countByStatus(scopedTasks: FactoryTask[]): TaskCounts {
  const c: TaskCounts = { total: 0, done: 0, in_progress: 0, backlog: 0, blocked: 0 };
  for (const t of scopedTasks) {
    c.total += 1;
    const s = effectiveStatus(t);
    if (s === "done") c.done += 1;
    else if (s === "in_progress") c.in_progress += 1;
    else if (s === "blocked") c.blocked += 1;
    else c.backlog += 1; // backlog + ready collapse for display
  }
  return c;
}

export { SPRINT_WORKSTATION_IDS };
