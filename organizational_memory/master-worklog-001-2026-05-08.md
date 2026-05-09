# Master work log (print-friendly) — 001 — 2026-05-08

This document is a **human-friendly master summary** of the work completed in this repo during the Todo “learning vertical” loops. It consolidates **phases, tasks, agent participation, verification commands, and evidence artifacts** (QMS inbox records + specs + PR checkpoints).

## 1) Executive summary

- **Vertical/app:** `apps/todo-instance` (local-only; no API/auth/multi-tenant)
- **Repo layout:** `apps/core-saas` + `apps/todo-instance` only (other sample verticals removed from workspaces).
- **Outcome:** Completed Phases 2–**6** for todo-instance (through local export/import, deterministic ordering, tests, and factory checks); Phase **5** hardening (forward schema guardrail, task-queue phase validation); captured QMS evidence; merged changes into `main`. Factory hygiene: **Mermaid diagrams** skill added at `.cursor/skills/mermaid-diagrams/` for diagrams-as-code in specs and docs.

## 2) Integration mode / boundaries (current)

- **Integration mode:** **standalone/local-only**
- **Persistence:** browser `localStorage` via `apps/todo-instance/src/todos.storage.ts`
- **No backend:** no `/api`, no DB, no external services

## 3) Phases completed (high level)

### Phase 2 — Automated verification + testability
- Added/ran test harness and key regression tests (storage + UI “reject empty add”).
- Established repeatable quality gates (lint/build/test).

### Phase 3 — Persistence UX + filtering + bulk actions (local-only)
- Versioned persistence payload and legacy migration behavior.
- Filters: All / Active / Completed
- Bulk actions: Toggle all, Clear completed
- Counts summary and UI tests

### Phase 4 — Local-only polish + maintainability
- Refactor into small UI components + pure model helpers.
- Empty state (app starts empty by default).
- Inline edit title with Enter/Escape behavior.
- Optional undo delete with UI coverage.
- Quality gates passed (lint/build/test).

### Phase 5 — Hardening (forward schema guardrails + planning consistency)
- Spec aligned to storage payload `{ schemaVersion, todos }` and Phase 5 documented.
- Storage forward-version guardrail: explicit behavior for `schemaVersion > current` without overwrite-on-load.
- Tooling validation added to enforce numeric-string `phase` convention in `factory/task-queue.json`.
- Quality gates passed (lint/build/test/check + validate-task-queue).

### Phase 6 — Local-only export/import + ordering
- Spec Phase 6 section (local-only; no API/auth).
- Export/download and import (paste/file) for `{ schemaVersion, todos }` with resilient invalid JSON handling.
- Deterministic list order (newest-first by `createdAt` with safe fallbacks).
- Automated tests and Phase 6 quality gates (`lint` / `build` / `test` / `check` / `validate-task-queue`).

## 4) Task ledger (from `factory/task-queue.json`)

### Phase 2 (TODO_001–TODO_008)
- **Done:** TODO_001 … TODO_008

### Phase 3 (TODO_009–TODO_016, phase: "3")
- **Done:** TODO_009 … TODO_016

### Phase 4 (TODO_017–TODO_022, phase: "4")
- **Done:** TODO_017 … TODO_022

### Phase 5 (TODO_023–TODO_027, phase: "5")
- **Done:** TODO_023 … TODO_027

### Phase 6 (TODO_028–TODO_032, phase: "6")
- **Done:** TODO_028 … TODO_032

### Task definition (how tasks are defined in JSON)

The factory’s work is driven by `factory/task-queue.json`, which is an array of task objects.

**Canonical fields (from `factory/task-graph.ts`):**

```ts
export type TaskStatus = "backlog" | "ready" | "in_progress" | "blocked" | "done";

export type FactoryTask = {
  id: string;
  title: string;
  depends_on?: string[];
  status?: TaskStatus; // omitted => treated as "backlog"
  priority?: number; // higher runs first when multiple tasks are startable
  phase?: string; // optional planning/reporting marker ("3", "4", "Phase 3", etc.)
  blocked_reason?: string;
  owner?: string;
  app?: string; // e.g. "apps/todo-instance"
};
```

**Allowed `status` values (strict):** `"backlog" | "ready" | "in_progress" | "blocked" | "done"`

**Field notes (what they mean in practice):**

- **`id` (required)**: Stable identifier (used in dependencies, logs, QMS record filenames, PR/branch naming).
- **`title` (required)**: Human-readable description; usually includes phase prefix like “Phase 4: …”.
- **`app` (optional but recommended)**: Route/bucket for the work (e.g. `apps/todo-instance`).
- **`phase` (optional)**: Planning/reporting label (e.g. `"3"`, `"4"`). It does **not** change dependency logic.
- **`depends_on` (optional)**: Array of task ids that must be completed before the task is startable.
- **`status` (optional)**: If omitted, the planner treats it as `"backlog"`. The enum is strict.
- **`priority` (optional)**: Tie-breaker when multiple tasks are startable (higher runs first).
- **`blocked_reason` (optional)**: Use only when `status` is `"blocked"`; explains the blocker in plain language.
- **`owner` (optional)**: Human or agent owner (planning only).
- **`acceptance_criteria` (optional in JSON, but used heavily by PM/Quality)**: Checklist style strings used as “definition of done” and gate evidence targets.

**Example 1 — minimal task (Phase 2):**

```json
{
  "id": "TODO_001_storage_model",
  "title": "Define Todo model + storage adapter (localStorage v1)",
  "app": "apps/todo-instance",
  "priority": 1,
  "status": "done"
}
```

**Example 2 — richer task with `phase`, dependencies, and acceptance criteria (Phase 3):**

```json
{
  "id": "TODO_009_phase3_storage_schema_and_migration_plan",
  "title": "Phase 3: Define storage schema versioning + migration strategy",
  "app": "apps/todo-instance",
  "priority": 9,
  "phase": "3",
  "status": "done",
  "depends_on": ["TODO_008_quality_phase2_gates"],
  "acceptance_criteria": [
    "Storage format is explicitly versioned (either payload schemaVersion or new key) and documented in code/readme comment-free (types/consts are fine).",
    "Load path handles missing/corrupt data by returning an empty list (no throw).",
    "If an older schema is detected, data is migrated to the current in-memory shape and persisted back on next save (or immediately on load if chosen)."
  ]
}
```

**Example 3 — typical feature task (Phase 4):**

```json
{
  "id": "TODO_019_phase4_inline_edit_title",
  "title": "Phase 4: Inline edit todo title (Enter save / Escape cancel, trim, reject empty)",
  "app": "apps/todo-instance",
  "priority": 19,
  "phase": "4",
  "status": "done",
  "depends_on": ["TODO_017_phase4_refactor_split_app"],
  "acceptance_criteria": [
    "User can enter edit mode for a todo title and modify it in-place.",
    "Enter saves; Escape cancels and restores prior title.",
    "Edits are trimmed; empty/whitespace-only edits are rejected (revert/no-op).",
    "Edits persist via local storage and remain after refresh."
  ]
}
```

**Example 4 — blocked task shape (template example):**

```json
{
  "id": "EXAMPLE_blocked_task",
  "title": "Example: Waiting on external dependency",
  "app": "apps/todo-instance",
  "phase": "4",
  "status": "blocked",
  "blocked_reason": "Blocked by missing credentials / external approval / upstream PR not merged yet.",
  "depends_on": ["TODO_017_phase4_refactor_split_app"]
}
```

## 5) Agent participation (who did what)

- **Spec Generator**
  - Updated `specs/todo-spec.md` through Phase **6** (storage payload, phases 3–6 scope)
- **PM**
  - Decomposed phases into atomic tasks and kept `factory/task-queue.json` statuses in sync (`TODO_001`–`TODO_032` complete on `main`)
- **Dev**
  - Implemented storage versioning/migration, filters, bulk actions, counts, empty state, inline edit, undo delete; Phase **5** forward-schema guardrail; Phase **6** export/import and ordering; refactored into components/helpers; added tests
- **Quality**
  - Executed gates: lint/build/test; provided pass/fail evidence
- **Fix**
  - Resolved Vitest/DOM tooling failure by switching test environment to `happy-dom`
- **Git**
  - Coordinated commits/branches and push-to-PR flow; changes landed via PR merges listed below
- **Docs**
  - Wrote QMS inbox records, updated lessons learned, and captured loop narratives
- **Architect**
  - Produced architecture review memo for todo-instance evolution and next-scope recommendation
- **Tooling**
  - Task-queue validation (`npm run validate-task-queue`); factory planning scripts; optional **Mermaid diagrams-as-code** skill (`.cursor/skills/mermaid-diagrams/`) for specs and `organizational_memory/`

## 6) Verification commands used (copy/paste)

Core gates for todo-instance:

```bash
npm run lint -w apps/todo-instance
npm run build -w apps/todo-instance
npm run test -w apps/todo-instance
```

Factory planning:

```bash
npm run factory:next
```

Repo typecheck:

```bash
npm run check
```

## 6.1) Factory process diagram (agents + tools)

```mermaid
flowchart TB
  %% Artifacts
  SPEC[specs/todo-spec.md]
  TQ[factory/task-queue.json]
  QMS[organizational_memory/QMS/inbox/*.md]
  PR[Pull request]
  MAIN[main branch]

  %% Agents (roles)
  SG[Spec Generator]
  PM[PM]
  DEV[Dev]
  QUAL[Quality]
  FIX[Fix]
  GIT[Git]
  DOCS[Docs]
  ARCH[Architect]

  %% Tools / commands
  GENSPEC[npm run generate-spec]
  NEXT[npm run factory:next]
  GATES["npm run lint/build/test -w apps/todo-instance\nnpm run check\nnpm run validate-task-queue"]

  %% Flow
  ARCH -->|recommendations| SPEC
  GENSPEC --> SPEC
  SG -->|update spec| SPEC
  SPEC --> PM
  PM -->|tasks + acceptance criteria| TQ
  NEXT -->|select next ready task| TQ
  TQ --> DEV
  DEV -->|code + tests| QUAL
  QUAL -->|run gates| GATES
  GATES -->|pass| GIT
  GATES -->|fail| FIX
  FIX -->|minimal patch| QUAL
  GIT -->|branch/commit/push| PR
  PR -->|merge| MAIN
  MAIN -->|closure: mark done| TQ
  DEV -->|evidence| QMS
  QUAL -->|evidence| QMS
  FIX -->|evidence (when used)| QMS
  DOCS -->|curate worklog + lessons| QMS
```

## 7) PR / merge checkpoints (what landed on `main`)

Recent merge commits (chronological order in `git log --merges`); see `git log --oneline --merges -20` for current list.

- **PR #4 / #5:** `fix/todo-instance-vitest-happy-dom` — test env + Node pin follow-up
- **PR #6:** `feature/todo-phase3-filters-bulk-actions` — Phase 3 features + tests + queue updates
- **PR #7:** `chore/task-phase-tracking` — optional `phase` field on tasks + docs/QMS loop records
- **PR #8:** `feature/todo-phase4-polish` — Phase 4 features + tests + queue/spec updates
- **Later merges (naming may vary by fork):** `chore/prune-apps` — workspaces trimmed to `core-saas` + `todo-instance`; Phase **5**/**6** branches for forward-schema guardrail, export/import, and related QMS/queue updates; direct `main` commits for **mermaid-diagrams** skill and worklog/diagram follow-ups.

## 8) Evidence & documentation inventory (paths)

### Specs
- `specs/todo-spec.md` (MVP + Phases 2–**6**, local-only)

### Architecture memo
- `organizational_memory/architecture-review-001-2026-05-08.md`

### QMS inbox records (partial list; see `organizational_memory/QMS/inbox/` for full set)
- `organizational_memory/QMS/inbox/2026-05-08-spec-generator-todo-spec.md`
- `organizational_memory/QMS/inbox/2026-05-08-builder-todo-instance-scaffold.md`
- `organizational_memory/QMS/inbox/2026-05-08-dev-TODO_001_storage_model.md`
- `organizational_memory/QMS/inbox/2026-05-08-dev-TODO_002_ui_crud_wiring.md`
- `organizational_memory/QMS/inbox/2026-05-08-dev-TODO_003_basic_accessibility.md`
- `organizational_memory/QMS/inbox/2026-05-08-quality-TODO_001_storage_model.md`
- `organizational_memory/QMS/inbox/2026-05-08-quality-TODO_002_ui_crud_wiring.md`
- `organizational_memory/QMS/inbox/2026-05-08-quality-TODO_003_basic_accessibility.md`
- `organizational_memory/QMS/inbox/2026-05-08-quality-TODO_008_quality_phase2_gates.md`
- `organizational_memory/QMS/inbox/2026-05-08-fix-todo-instance-vitest-happy-dom.md`
- `organizational_memory/QMS/inbox/2026-05-08-docs-node-pin-and-vitest-env-loop.md`
- `organizational_memory/QMS/inbox/2026-05-08-docs-todo-phase3-loop.md`
- `organizational_memory/QMS/inbox/2026-05-08-docs-post-merge-closure-todo-phase2.md`
- `organizational_memory/QMS/inbox/2026-05-08-docs-pr-importance.md`

### Lessons learned register
- `organizational_memory/QMS/LESSONS-LEARNED.md`

## 9) Notable issues encountered (and how we handled them)

- **Node/tooling drift / engine warnings**
  - Resolved by pinning Node expectations and documenting prerequisites.
- **Planner rejected invalid task statuses**
  - Standardized on the allowed status enum (`backlog|ready|in_progress|blocked|done`) and documented it.
- **Sandbox permission issues for `tsx` IPC**
  - Workaround: rerun outside restricted sandbox for `factory:next` when EPERM occurs.

## 10) Current state

- **`main`:** todo-instance tasks **`TODO_001` through `TODO_032` are all `status: "done"`** in `factory/task-queue.json` (Phases 2–6). Post-merge closure is recorded in `organizational_memory/QMS/inbox/2026-05-08-docs-post-merge-closure-phase6-task-queue-complete.md` (QMS-PUB-005 loop).
- **Product boundary:** `apps/todo-instance` remains **local-only** (no API/auth in current spec). The **next** factory loop is **Phase 7**: choose scope with **Spec Generator** + **PM** (new task ids from `TODO_033`), after you set direction (e.g. continued local polish vs any future HTTP-integrated work—only if you explicitly change the spec).

