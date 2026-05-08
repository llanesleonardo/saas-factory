---
title: "PM: Todo-instance Phase 5 plan (forward schema guardrail + phase convention)"
date: 2026-05-08
role: pm
vertical: todo-instance
phase: "5"
tasks: ["TODO_023_phase5_spec_update_storage_and_phase5", "TODO_024_phase5_storage_forward_version_guardrail", "TODO_025_phase5_storage_forward_version_tests", "TODO_026_phase5_tooling_enforce_phase_convention", "TODO_027_phase5_quality_gates"]
evidence_paths:
  - factory/task-queue.json
  - specs/todo-spec.md
---

## What changed / why

The architecture review identified two remaining hardening gaps after Phase 4:

- **Forward schema guardrail**: explicitly define and test behavior when persisted storage contains a **future** `schemaVersion` (greater than the current supported version), ensuring the app does not crash and does not overwrite unreadable data.
- **Planning consistency**: enforce a single convention for `phase` in the task queue (numeric strings like `"5"`), and add validation to prevent drift.

## Actions taken (PM)

- Added **Phase 5 tasks** (`TODO_023`–`TODO_027`) to `factory/task-queue.json` with `phase: "5"`.
- Updated `specs/todo-spec.md` to:
  - Align MVP storage description with the actual persisted payload `{ schemaVersion, todos }`
  - Add a **Phase 5** section defining forward-version guardrail behavior and phase convention expectations.

## Verification notes

- Planning artifacts updated; implementation and gates to be executed by Dev → Quality.

