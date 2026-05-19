/**
 * Typed ids for workforce routing (`agent-assignment.ts`, `tool-assignment.ts`).
 * Primary agent ids align with keys in `factory/02_workforce/02_00_agents/agent-registry.json`.
 *
 * ## Workstations = Agile + systems engineering
 *
 * Stations are **logical phases** on the software line — not hardware. Naming follows:
 * - **Agile:** iterative backlog → increment → integrated quality → release.
 * - **Systems engineering:** scope/requirements alignment → implementation → **verification**
 *   (built-right) → transition / deployment (**validation** “built the right thing” often spans PM/Support/Docs per QMS-PUB-001).
 *
 * Map tasks or prompts to **one station** to pick default lead agent + tools (`agent-assignment.ts`, `tool-assignment.ts`).
 */

/** Logical stations — Agile lifecycle × SE verification hooks. */
export type WorkforceStationId =
  | "backlog_plan"
  | "increment_build"
  | "integrate_verify"
  | "release_transition";

/** Canonical SaaS Factory agent role id — must match `agents` keys in agent-registry.json. */
export type FactoryAgentRoleId =
  | "pm"
  | "architect"
  | "dev"
  | "quality"
  | "fix"
  | "git"
  | "devops"
  | "docs"
  | "security"
  | "finops"
  | "support"
  | "tooling"
  | "spike"
  | "spec-generator"
  | "builder"
  | "broadcasting";

/** Local ids for workforce `tools/tool-definitions/*.ts` entries (not necessarily TOOL_* registry ids). */
export type WorkforceToolId =
  | "tool-search"
  | "tool-codegen"
  | "tool-docker"
  | "tool-linter"
  | "tool-test-runner"
  | "tool-ci";
