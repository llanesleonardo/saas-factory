---
title: "Dev: TODO_029 Phase 6 export/import UI (local-only)"
date: 2026-05-08
role: dev
vertical: todo-instance
task_id: TODO_029_phase6_export_import_ui
phase: "6"
evidence_paths:
  - apps/todo-instance/src/App.tsx
  - apps/todo-instance/src/todos.portable.ts
---

## Summary

Added local-only Export/Import actions for todos without introducing any API.

## What changed

- Export produces a versioned JSON payload `{ schemaVersion, todos }`.
- Import accepts both the current payload and legacy array format; invalid input is a no-op (no crash).

