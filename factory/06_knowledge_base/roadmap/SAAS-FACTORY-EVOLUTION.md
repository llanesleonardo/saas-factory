# SaaS Factory evolution roadmap (implemented baseline)

This document maps the **evolution plan** to repository artifacts. Phases **not** listed as done remain iterative improvements.

## Phase 1 — Standard agent architecture

- Normative checklist: **`../agents_docs/AGENT-FILE-STANDARD.md`**
- Role prompts updated incrementally so each agent includes Purpose → Output Format sections aligned with that checklist.

## Phase 2 — Agent registry

- **`factory/agent-registry.json`** — identity, category (**execution** vs **advisory**), inputs/outputs hints, **`next_agents`**, **`context_pack`** links.
- JSON Schema: **`factory/factory_schemas/agent-registry.schema.json`**.

## Phase 3 — Output schemas + validation

- **`factory/factory_schemas/pm-output.schema.json`** — extended task shape (compatible with minimal **`factory/task-queue.json`** rows).
- **`factory/factory_schemas/dev-output.schema.json`**, **`factory/factory_schemas/quality-output.schema.json`**
- CLI: **`npm run validate-agent-output`** → **`factory/validate-agent-output.ts`**

## Phase 4 — Workflow state machine

- **`factory/workflow-state-machine.json`** — conceptual states + allowed transitions + mapping notes to **`task-queue.json`** statuses.
- Full enforcement (per-task `workflow_state` field, unauthorized transition rejects) is a future **`factory/`** increment.

## Phase 5 — Quality gate system

- Quality structured output schema embeds **evidence** fields (`commands_run`, `test_results`, `coverage_summary`, …).
- Loop **`quality → fix → quality`** documented in registry **`quality_gate_loop`**.

## Phase 6 — Context packs

- **`factory/context-packs/*.json`** — minimal path bundles per agent.

## Phase 7 — Mission control

- Operational UI prototype: **`apps/mission-control-instance/`**
- Consolidated orchestration hub placeholder: **`apps/mission-control/README.md`** (links + Phase B scope).

## Phase 8 — Invocation UX

- Cursor slash commands: **`.cursor/commands/agent-*.md`** — shorthand prompts wrapping **`agents/*-agent.md`**.

## Phase 9 — Parallel execution

- **`factory/factory_libs/planning/task-graph.ts`** (`computeParallelBatches`) for wave geometry; optional UI/API wraps the same function.
- Future: annotate registry with parallel-safe groups.

## Phase 10 — Product templates

- **`templates/README.md`** — template index (expand with CRM/marketplace starters over time).
- Today: **`templates/vertical-saas-spec.template.md`** + **`npm run mfg -- app new`** (brief) + **`npm run mfg -- app stack`** (stack) + **`npm run mfg -- app scaffold`**.

## Phase 11 — Organizational memory

- **`factory/06_knowledge_base/`** — architecture, process, QMS, lean. Agents `@` these paths per **`factory/02_workforce/02_00_agents/context-packs`**.

## Phase 12 — Metrics

- **`factory/metrics/README.md`** — placeholder metrics contracts (velocity, QA fail rate, deploy frequency).

---

## Target operator loop (north star)

```text
Human → Mission Control (future) → Agent Registry → Workflow machine → Agents → Schemas/Quality gates → Deploy
```
