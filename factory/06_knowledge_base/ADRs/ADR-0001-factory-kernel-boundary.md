# ADR-0001: Factory kernel boundaries

- **Status**: accepted
- **Date**: 2026-05-08
- **Owners**: SaaS Factory maintainers

## Context
The factory has multiple “sources of truth” for how work moves: code under `factory/*`, doctrine under `factory/06_knowledge_base/*`, and role prompts under **`factory/02_workforce/02_00_agents/agent_definitions/`**. Agents execute fast; ambiguity creates drift fast.

We need a clean separation so:
- planning and validation logic stays deterministic and testable
- docs explain the process without duplicating logic
- roles reference contracts instead of re-implementing them

## Decision
Define three explicit layers:

- **Factory kernel (code)**: `factory/*`
  - deterministic algorithms (task ordering, WIP planning, dependency waves)
  - machine-checkable contracts (schemas) and validators
  - CLIs that *use* the kernel
- **Doctrine & governance (docs)**: `factory/06_knowledge_base/*`
  - how-to operate the factory (standard work)
  - architecture decisions and QMS procedures
  - ADRs that reference the kernel contracts
- **Role prompts (roles)**: `factory/02_workforce/02_00_agents/agent_definitions/*`
  - bounded responsibilities for each role
  - links to doctrine for “how” and links to kernel contracts for “what shape”

## Consequences
- **Positive**: reduced drift; Phase B (mission control) can reuse kernel logic; CI gates can validate contracts.
- **Negative / trade-offs**: initial work to add schemas/validators and keep docs linked to them.
- **Follow-ups**:
  - add `factory/factory_schemas/task-queue.schema.json`
  - strengthen `npm run validate-task-queue`
  - add a registry reference validator

## References
- `factory/task-graph.ts`
- `factory/planner.ts`
- `factory/agent-registry.json`
- `factory/06_knowledge_base/process/FACTORY-PROCESS.md`

