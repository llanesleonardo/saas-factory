---
title: "Dev: TODO_024 Phase 5 storage forward-version guardrail"
date: 2026-05-08
role: dev
vertical: todo-instance
task_id: TODO_024_phase5_storage_forward_version_guardrail
phase: "5"
evidence_paths:
  - apps/todo-instance/src/todos.storage.ts
---

## Summary

Implemented explicit handling for **future** persisted storage payloads where `schemaVersion > TODOS_SCHEMA_VERSION`.

## What changed

- Updated `parseTodosPayload` to detect `schemaVersion` values greater than the current supported version and return a safe fallback (`[]`) without throwing.
- Ensured we **do not** set `shouldPersist` in this forward-version case to avoid overwriting unknown data with an empty save.

## Verification

- Follow-up task `TODO_025_phase5_storage_forward_version_tests` added automated coverage.

