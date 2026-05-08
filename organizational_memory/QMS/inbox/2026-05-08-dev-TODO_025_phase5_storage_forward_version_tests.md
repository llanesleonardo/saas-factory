---
title: "Dev: TODO_025 Phase 5 tests for storage forward-version guardrail"
date: 2026-05-08
role: dev
vertical: todo-instance
task_id: TODO_025_phase5_storage_forward_version_tests
phase: "5"
evidence_paths:
  - apps/todo-instance/src/__tests__/todos.storage.test.ts
---

## Summary

Added automated tests to lock the expected behavior when local storage contains a payload with `schemaVersion > current`.

## What changed

- Added a test asserting `loadTodos()` returns `[]` for a forward schema payload.
- Added an assertion that the original stored payload remains unchanged after `loadTodos()` (no overwrite-on-load).

## Verification

- `npm run test -w apps/todo-instance` passes.

