/**
 * Maps workforce tools to Agile / SE workstations (which automation fits which phase).
 * Complement to `agent-assignment.ts`; see **`02_02_workstations/workstation-assignment.ts`** and **`02_02_workstations/workstation-map.json`**.
 */

import type { WorkforceStationId, WorkforceToolId } from "../workforce-types.js";

export const defaultToolsByStation: Record<WorkforceStationId, WorkforceToolId[]> = {
  backlog_plan: ["tool-search"],
  increment_build: ["tool-codegen", "tool-docker", "tool-linter"],
  integrate_verify: ["tool-test-runner", "tool-linter", "tool-ci"],
  release_transition: ["tool-docker", "tool-ci"],
};

export function toolsForStation(station: WorkforceStationId): WorkforceToolId[] {
  return [...defaultToolsByStation[station]];
}
