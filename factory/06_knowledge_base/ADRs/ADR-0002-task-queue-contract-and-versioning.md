# ADR-0002: Task queue contract and versioning

- **Status**: accepted
- **Date**: 2026-05-08
- **Owners**: SaaS Factory maintainers

## Context
`factory/task-queue.json` is the canonical inventory for planning (`factory:next` / `mfg line next`) and for human orchestration. Historically, validation was partial, leaving room for silent drift (bad statuses, missing fields, unknown dependencies, inconsistent conventions).

We need a task queue contract that is:
- machine-validated
- compatible with current queue shape (array or `{ tasks: [...] }`)
- stable for future tooling (Phase B mission control UI, Phase C worker)

## Decision
- Introduce a first-class JSON Schema: `factory/factory_schemas/task-queue.schema.json`.
- Strengthen validation to enforce:
  - allowed status enum
  - dependency integrity (unknown deps, self deps, cycles)
  - required fields and types
  - conditional requirements (e.g. `blocked_reason` when `status=blocked`)
  - phase convention (numeric string) remains enforced
- Treat the schema as the authoritative “API surface” for the queue.

## Consequences
- **Positive**: deterministic planning inputs; fewer broken PRs; stable consumer contract.
- **Negative / trade-offs**: schema evolution must be handled carefully (migrations or backward compatible changes).
- **Follow-ups**:
  - CI gate `npm run validate-task-queue` on pull requests
  - docs section describing queue conventions and closure expectations

## References
- `factory/task-queue.json`
- `factory/task-graph.ts`
- `factory/validate-task-queue.ts`
- `factory/workflow-state-machine.json`

