---
name: phase-orchestration
description: Orchestrate the next phase end-to-end: check architecture review recommendations, ensure specs are updated, add tasks to factory/task-queue.json, then run PM → Dev → Quality → Git → Docs with task status updates and QMS inbox records. Use when the user asks to "run the next phase", "orchestrate roles", or mentions /phase-orchestration.
disable-model-invocation: true
---

# Phase orchestration

## Verbatim user instruction (use as the core contract)

`/agent-pm the next one. Please check if we cover all recommendations  @organizational_memory/architecture-review-001-2026-05-08.md  and /agent-spec-generator  dont forget to create the specs, and after we have the task added in the json object, orchestrate roles (PM → Dev → Quality → Git → Docs) and keep updating statuses and QMS records.`

## Quick start checklist

1. Read **all** architecture review memos under `organizational_memory/architecture-review-*-*.md` (newest first). If the user provides a specific path, include it, but do not ignore the rest.
2. Extract recommendations from each memo, dedupe overlaps, and identify which items are not yet implemented; translate those gaps into the next phase scope.
3. Update specs first:
   - Edit `specs/<vertical>-spec.md` to add a new Phase section for the planned work (local-only vs integrated must remain consistent with the architecture doc).
4. Produce PM task JSON (use `factory/factory_schemas/pm-output.schema.json` format) and add tasks to `factory/task-queue.json`:
   - Use stable ids like `TODO_###_phaseX_<slug>`.
   - Set `phase` to a numeric string (e.g. `"5"`).
   - Set the first task to `"ready"` when it is executable; others can be `"backlog"`.
5. Orchestrate execution end-to-end and keep the user updated:
   - **PM**: ensure tasks exist, dependencies make sense, statuses reflect reality.
   - **Spec Generator**: ensure spec is updated before implementation.
   - **Dev**: implement tasks in order (one task at a time; minimal blast radius).
   - **Quality**: run gates; on failures, hand to Fix then re-run Quality.
   - **Git**: create a phase branch, commit, push, and prepare PR text. (If `gh` isn’t available, provide the GitHub “new PR” link + body.)
   - **Docs**: create QMS inbox records per task and update the master worklog.

## Status + QMS rules (non-negotiable)

- Update `factory/task-queue.json` **status** as work progresses:
  - `"in_progress"` only for the single active task.
  - `"done"` only after gates pass and the change is merged (or when the task is purely doc/spec and merged).
- For each substantive task, create one QMS inbox record under `organizational_memory/QMS/inbox/`:
  - Prefer one file per task: `YYYY-MM-DD-<role>-<task-id>.md`
  - Include: what changed, why, commands run (if any), and evidence paths.

## Gate commands (default)

Use the most relevant subset for the vertical; for `apps/todo-instance`:

```bash
npm run lint -w apps/todo-instance
npm run build -w apps/todo-instance
npm run test -w apps/todo-instance
npm run check
```

If phase metadata validation exists, run it (example):

```bash
npm run mfg -- validate task-queue
```

## Output expectations

When running this skill, produce:

- A short plan (what you’ll do next and why)
- Clear progress updates as each role handoff completes
- The exact PR link (or manual PR creation link) + a ready-to-paste PR body
- Confirmation of post-merge closure (main updated, tasks `done`, QMS present, gates green)

