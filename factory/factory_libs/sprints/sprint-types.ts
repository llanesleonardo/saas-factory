/** Workstation ids — keep in sync with `factory/02_workforce/02_02_workstations/workstation-map.json` → `stations`. */
export const SPRINT_WORKSTATION_IDS = [
  "backlog_plan",
  "increment_build",
  "integrate_verify",
  "release_transition",
] as const;

export type SprintWorkstationId = (typeof SPRINT_WORKSTATION_IDS)[number];

/** Lifecycle of one workstation row within a sprint record. */
export type SprintWorkstationPass = {
  /** not_started | in_progress | done | skipped | blocked */
  status: "not_started" | "in_progress" | "done" | "skipped" | "blocked";
  notes?: string;
  enteredAt?: string;
  exitedAt?: string;
};

export type SprintRecordDoc = {
  schemaVersion: 1;
  kind: "sprint-record";
  orderId: string;
  productId: string;
  /** Monotonic per order+product (1, 2, 3, …). */
  sprintNumber: number;
  title?: string;
  goal?: string;
  createdAt: string;
  updatedAt: string;
  /** One row per workstation (Agile ↔ systems mapping). */
  workstations: Record<SprintWorkstationId, SprintWorkstationPass>;
  /** Short narrative: how the team moved through workstations this sprint (auto + editable). */
  summary: string;
};
