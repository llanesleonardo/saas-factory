# ADR-0003: Workflow state enforcement for factory tasks

- **Status**: accepted
- **Date**: 2026-05-08
- **Owners**: SaaS Factory maintainers

## Context
`factory/workflow-state-machine.json` defines the intended lifecycle and forbidden transitions for factory work. Today it is conceptual: nothing checks that `task-queue.json` status usage stays consistent with this machine.

This creates drift risk: the documented process and real planning statuses diverge, undermining Quality gates and future automation.

## Decision
- Add a validator that checks:
  - `factory/workflow-state-machine.json` is internally consistent
  - every status used in `factory/task-queue.json` maps to some workflow state bucket per `task_queue_mapping`
  - “forbidden” constraints are not obviously violated by task metadata (starting with basic invariants; expand over time)
- Keep enforcement conservative and additive: do not block valid workflows by over-specifying rules prematurely.

## Consequences
- **Positive**: keeps the “operating system” coherent; safer future Phase B/C work.
- **Negative / trade-offs**: enforcement needs careful iteration to avoid false positives.
- **Follow-ups**:
  - add `npm run validate-workflow-machine` (or similar)
  - add CI gate once stable

## References
- `factory/workflow-state-machine.json`
- `factory/task-queue.json`

