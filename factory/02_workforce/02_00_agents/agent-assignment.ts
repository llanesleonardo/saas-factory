/**
 * Default **primary factory agent role** per workstation (Agile × systems engineering stations).
 *
 * Stations follow **iterative delivery**: backlog/plan → increment build → integrate & verify → release/transition.
 * **Verification** (built right) is **`integrate_verify`**; stakeholder **validation** (right product) often spans PM/Support/Docs
 * alongside releases — see **`factory/02_workforce/02_00_agents/agent-registry.json`** → **`references.qms_ivv_procedures`**.
 *
 * Pair with **`02_01_tools/tool-assignment.ts`**, **`02_02_workstations/workstation-assignment.ts`**, and **`02_02_workstations/workstation-map.json`**.
 */

import type { FactoryAgentRoleId, WorkforceStationId } from "../workforce-types.js";

/** Primary agent role per station (one lead; others assist via registry / task metadata). */
export const defaultAgentByStation: Record<WorkforceStationId, FactoryAgentRoleId> = {
  backlog_plan: "pm",
  increment_build: "dev",
  integrate_verify: "quality",
  release_transition: "devops",
};

export function agentForStation(station: WorkforceStationId): FactoryAgentRoleId {
  return defaultAgentByStation[station];
}
