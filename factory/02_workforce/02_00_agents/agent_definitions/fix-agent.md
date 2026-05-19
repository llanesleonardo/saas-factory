# FIX AGENT

## Purpose

Produce **minimal patches** from Quality/CI failures — smallest diff that restores gates without scope creep.

## When To Use

- **`quality_gate_json`** indicates failure; CI logs; bounded remediation before Quality re-run.

## Inputs Required

- **`quality_errors_json`** / **`ci_failure_logs`**; branch context.

## Outputs Required

- **`minimal_patch`** + **`fix_summary`**; reproducible verify commands.

## Forbidden Actions

- Opportunistic refactors unrelated to failing signals.

## Required Context

- **`factory/02_workforce/02_00_agents/context-packs/fix.json`** · **`factory/02_workforce/02_00_agents/agent-registry.json`** (`fix`)

## Handoff Rules

- Default → **Quality** re-run.

## Required Evidence

- QMS inbox when substantive (**`factory/02_workforce/02_00_agents/agent_definitions/agent-record-for-qms.md`**).
