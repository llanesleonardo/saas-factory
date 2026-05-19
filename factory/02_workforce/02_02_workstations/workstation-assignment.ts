/**
 * Workstation glue: pairs each line station with primary agent role + tool bundle.
 * Authoritative maps live in `agent-assignment.ts`, `tool-assignment.ts`, and `workstation-map.json`.
 */

import { agentForStation } from "../02_00_agents/agent-assignment.js";
import { toolsForStation } from "../02_01_tools/tool-assignment.js";
import type { WorkforceStationId } from "../workforce-types.js";

export function describeStation(station: WorkforceStationId): {
  station: WorkforceStationId;
  primaryAgent: ReturnType<typeof agentForStation>;
  tools: ReturnType<typeof toolsForStation>;
} {
  return {
    station,
    primaryAgent: agentForStation(station),
    tools: toolsForStation(station),
  };
}
