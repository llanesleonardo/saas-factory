---
title: "Tooling: TODO_026 Phase 5 validate task-queue phase convention"
date: 2026-05-08
role: tooling
vertical: factory
task_id: TODO_026_phase5_tooling_enforce_phase_convention
phase: "5"
evidence_paths:
  - factory/validate-task-queue.ts
  - package.json
  - factory/06_knowledge_base/process/FACTORY-PROCESS.md
---

## Summary

Added a validation step to enforce the recommended convention that `factory/task-queue.json` task `phase` values are **numeric strings** (e.g. `"5"`).

## What changed

- Added `factory/validate-task-queue.ts` to validate `phase` format and emit a task-id-targeted error message when invalid.
- Added `npm run validate-task-queue` to the root `package.json`.
- Updated `factory/06_knowledge_base/process/FACTORY-PROCESS.md` to document the convention and how to run the validation.

## Verification

- `npm run validate-task-queue` returns OK when the queue is consistent.
- `npm run check` (typecheck) passes with the new script.

