# Agent action record

## Document metadata

- **Date (UTC):** 2026-05-05
- **Agent role:** tooling (factory process / agent definitions)
- **Task id / issue:** n/a — merge Testing + QA roles per user request
- **Spec / PR refs:** `agents/quality-agent.md`; redirects `agents/testing-agent.md`, `agents/qa-agent.md`; `factory/planner.ts`, `factory/plan-next.ts`, `factory/orchestrator.ts`; `organizational_memory/AGENTS.md`, `FACTORY-PROCESS.md`; `.cursor/rules/saas-factory.mdc`; cross-links in PM/Dev/Fix/Support/DevOps/README/LEAN-MANUFACTURING/agent-record-for-qms

## Actions performed

- Introduced **`agents/quality-agent.md`** combining harness ownership and verification gates (`status` / `errors` JSON).
- Replaced **`testing-agent.md`** and **`qa-agent.md`** bodies with pointers to **`quality-agent.md`**.
- Renamed planner JSON field to **`qualityAgentInvocation`** (replacing **`testingAgentInvocation`**).
- Updated factory runbook and documentation to **Dev → Quality → Fix → Git**.

## Evidence

- `npm run check` passed.
- `npm run factory:next -- --json` emits **`qualityAgentInvocation`** pointing at **`@agents/quality-agent.md`**.

## Handoff

- **Docs Agent:** optional consolidation if **`published/`** references old two-role split.
- Humans/scripts parsing **`factory:next --json`:** migrate from **`testingAgentInvocation`** to **`qualityAgentInvocation`**.
