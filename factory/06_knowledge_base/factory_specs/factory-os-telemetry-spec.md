# Factory OS — Telemetry (spec)

## Purpose & scope

Factory OS **Telemetry** provides a durable, queryable history of “what ran” in the factory so operators can answer:

- What did we run (commands / roles / tasks), when, and what happened?
- What is our current WIP and what’s next?
- Where is the evidence for a gate pass/fail?

This spec defines:

- a minimal **event model** and required fields
- what a Phase B **dashboard** (“mission control”) must display

Out of scope:

- Implementing the store (see `FACTORY_OS_006_telemetry_run_history_store`)
- Any secret values or raw logs; only **pointers** are allowed

## Event model (minimal)

Telemetry is expressed as a sequence of **events** grouped into higher-level **runs**.

### Entities

#### Job

A **job** is an operator-initiated intent, e.g.:

- “Run factory validators on this branch”
- “Deploy todo-instance to preview”

Jobs are composed of one or more runs.

Required fields:

- `job_id` (string, stable unique id)
- `started_at_utc` (ISO string)
- `ended_at_utc` (ISO string, optional until complete)
- `trigger` (`local_cli | ci | manual`)
- `initiator` (string; may be `unknown` locally)

#### Run

A **run** is one execution attempt for a command or gate.

Required fields:

- `run_id` (string, unique)
- `job_id` (string, foreign key)
- `timestamp_utc` (ISO string) or `started_at_utc`/`ended_at_utc`
- `kind` (`command | gate | deploy`)
- `command` (string; the canonical command line, no secrets)
- `exit_code` (number)
- `outcome` (`pass | fail | aborted`)

Recommended fields:

- `git_ref` (sha)
- `branch` (string)
- `queue_path` (string; if command used `--queue`)
- `app` (string; e.g. `factory/`, `factory/06_knowledge_base/`, `apps/todo-instance`)

#### Task involvement (optional but recommended)

A run may reference one or more task ids.

Fields:

- `task_ids[]` (array of strings)
- `task_id_primary` (string, optional)

#### Role involvement (for agent work)

Where the run is an agent invocation or role step:

- `agent_role` (role id from `factory/agent-registry.json`)
- `handoff_to` (role id, optional)

#### Evidence pointers (required when available)

Telemetry must store only pointers, never secrets.

Fields:

- `evidence[]`: array of objects:
  - `type` (`artifact | file | url`)
  - `label` (string)
  - `path` (repo-relative path) or `url`

Examples:

- CI artifacts: `factory-next.json` (from `npm run mfg -- line next -- --json`)
- QMS inbox record paths

## Required dashboard views (Phase B)

The Phase B “mission control” dashboard must include:

### 1) WIP view

- list tasks with `status: in_progress`
- highlight `blocked` tasks including `blocked_reason`
- show WIP count vs cap (cap from `FACTORY_WIP_CAP` or `--wip`)

### 2) Next task view

- show `factory:next` result (task id/title/app/priority/status)
- show role-aware invocation line (`nextAgentInvocation`)

### 3) Waves view

- show dependency **waves** derived from the same graph as the planner (e.g. `computeParallelBatches` in `factory/factory_libs/planning/task-graph.ts`):
  - wave number
  - tasks per wave
  - max parallelism

### 4) Recent runs view

- last N runs:
  - timestamp
  - command/kind
  - outcome
  - referenced task id(s) (if any)
  - evidence links (artifacts, QMS inbox record pointers)

### 5) Evidence view (per task)

Given a task id, show:

- last Quality outcome (if available)
- commands_run list (from Quality output when present)
- evidence pointers (CI artifacts, QMS inbox record filenames, relevant files)

## Privacy & safety rules

- **No secrets**: never store env var values; names only.
- **No full logs by default**: store pointers to CI artifacts or file paths, not raw stdout/stderr dumps.
- **Local-first is acceptable** for the initial telemetry store (see `FACTORY_OS_006`), with optional later promotion to a shared store.

## Integration points (current repo)

Telemetry should be able to record runs for:

- `npm run factory:next -- --json` (same as `npm run mfg -- line next -- --json`)
- validator commands (`npm run validate-*`)
- deploy orchestrator (`npm run factory:deploy ...`)
- time tracking (`npm run factory:time ...`) as a related-but-separate signal

## Handoff

- Tooling: implement `FACTORY_OS_006_telemetry_run_history_store` using this event model and dashboard requirements.

