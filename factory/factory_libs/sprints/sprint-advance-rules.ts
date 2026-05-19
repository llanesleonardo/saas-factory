/**
 * Pure rules for "how do the sprint's 4 workstation rows reflect what's
 * happening in the task queue right now". Used by both the renderer
 * (`mfg sprint board`) and the mutator (`mfg sprint task done`).
 *
 * Rule, per workstation (evaluated top-down; first match wins):
 *   1. Bucket tasks by their phase's workstation (see `phaseToWorkstation`).
 *   2. If the bucket has no tasks         → leave the row as-is.
 *   3. All bucket tasks `done`            → `done`.
 *   4. Any bucket task `in_progress`      → `in_progress`.
 *   5. Any bucket task `blocked`          → `blocked`.
 *   6. Any bucket task `done` (partial)   → `in_progress`.   ← progress IS work
 *   7. Otherwise (all backlog/ready)      → `not_started`.
 *
 * The function returns ONLY rows whose computed status differs from the
 * current sprint.json row, so the CLI can stamp them in-place without churn.
 */
import type { FactoryTask } from "../planning/task-graph.js";
import type { OrderPhasesDoc } from "../orders/order-phases-types.js";
import type { SprintRecordDoc, SprintWorkstationId, SprintWorkstationPass } from "./sprint-types.js";
import { SPRINT_WORKSTATION_IDS } from "./sprint-types.js";
import { effectiveStatus, phaseToWorkstation } from "./sprint-task-selection.js";

export interface WorkstationDiff {
  id: SprintWorkstationId;
  from: SprintWorkstationPass["status"];
  to: SprintWorkstationPass["status"];
}

export function computeWorkstationStatuses(
  scopedTasks: FactoryTask[],
  orderPhases: OrderPhasesDoc,
): Record<SprintWorkstationId, SprintWorkstationPass["status"]> {
  const phaseToWs = new Map<string, SprintWorkstationId>();
  for (const phase of orderPhases.phases) {
    const lane = phase.lanes?.[0];
    phaseToWs.set(phase.id, phaseToWorkstation(phase.id, lane));
  }
  const buckets: Record<SprintWorkstationId, FactoryTask[]> = {
    backlog_plan: [],
    increment_build: [],
    integrate_verify: [],
    release_transition: [],
  };
  for (const t of scopedTasks) {
    const opid = (t.order_phase_id ?? "").trim();
    if (!opid) continue;
    const ws = phaseToWs.get(opid) ?? phaseToWorkstation(opid, t.workcenters?.[0]);
    buckets[ws].push(t);
  }

  const out: Record<SprintWorkstationId, SprintWorkstationPass["status"]> = {
    backlog_plan: "not_started",
    increment_build: "not_started",
    integrate_verify: "not_started",
    release_transition: "not_started",
  };
  for (const id of SPRINT_WORKSTATION_IDS) {
    const tasks = buckets[id];
    if (tasks.length === 0) continue;
    const statuses = tasks.map(effectiveStatus);
    if (statuses.every((s) => s === "done")) out[id] = "done";
    else if (statuses.some((s) => s === "in_progress")) out[id] = "in_progress";
    else if (statuses.some((s) => s === "blocked")) out[id] = "blocked";
    else if (statuses.some((s) => s === "done")) out[id] = "in_progress";
    else out[id] = "not_started";
  }
  return out;
}

export function diffWorkstations(
  sprint: SprintRecordDoc,
  computed: Record<SprintWorkstationId, SprintWorkstationPass["status"]>,
): WorkstationDiff[] {
  const diffs: WorkstationDiff[] = [];
  for (const id of SPRINT_WORKSTATION_IDS) {
    const current = sprint.workstations[id].status;
    const next = computed[id];
    if (current !== next) diffs.push({ id, from: current, to: next });
  }
  return diffs;
}
