---
title: "Dev: TODO_030 Phase 6 deterministic ordering (newest-first)"
date: 2026-05-08
role: dev
vertical: todo-instance
task_id: TODO_030_phase6_deterministic_ordering
phase: "6"
evidence_paths:
  - apps/todo-instance/src/todos.model.ts
  - apps/todo-instance/src/todos.storage.ts
  - apps/todo-instance/src/todos.portable.ts
---

## Summary

Made todo ordering deterministic (newest-first by `createdAt` with safe fallback), including imported todos and legacy persisted data.

