# Architecture review — todo-instance (001) — 2026-05-08

## Context

`apps/todo-instance` is intentionally a **local-only** vertical (no API/auth/multi-tenant) used to exercise the factory loop (Spec → PM → Dev → Quality → Git). Phase 3 introduced:

- **Versioned persistence payload** (`schemaVersion`) + legacy array migration
- **Filters** (All/Active/Completed)
- **Bulk actions** (Toggle all / Clear completed)
- **Counts summary** and UI tests

This review focuses on **boundaries**, **future-proofing**, and **what to do next** without prematurely turning this into a full SaaS.

## What’s good (keep)

- **Clear integration mode**: stays **standalone/local-only**. No hidden backend coupling.
- **Storage adapter boundary**: `todos.storage.ts` isolates persistence concerns from UI.
- **Forward-compatibility**: persisting `{ schemaVersion, todos }` is the right direction for migrations.
- **Deterministic UX slices**: filters + bulk actions are small, verifiable features.
- **Verification is real**: UI tests cover filters and bulk actions; gates are runnable via workspace scripts.

## Risks / gaps (address next)

### 1) `App.tsx` is becoming “god component”

Right now, state + rendering + actions + controls live in one file. It’s fine for a learning vertical, but once Phase 4 introduces more UX (empty states, inline edit, undo, keyboard shortcuts), it will get hard to extend safely.

**Suggested boundary:** split into small modules but keep it simple:

- `src/todos.model.ts` (pure helpers: toggleAll logic, clearCompleted, filter helpers)
- `src/components/Filters.tsx`, `src/components/BulkActions.tsx`, `src/components/TodoList.tsx`
- `src/todos.storage.ts` stays as the persistence adapter

### 2) Storage schema versioning is in place, but migration strategy needs one more guardrail

Current behavior is:

- legacy array under `todo.todos.v1` → migrate to v1 payload and persist back
- unknown payload → empty list

That’s OK, but future schema versions should be explicit:

- Add a `default` path for `schemaVersion > current` (e.g. keep data as-is but refuse to parse; or warn and return empty). Decide once, document it.
- Consider adding a second key (`todo.todos.v2`) only when you need incompatible changes; otherwise payload versioning is enough.

### 3) Phase tracking in the queue: good idea, make it consistent

Now that tasks support an optional `phase`, keep one convention:

- **Use numeric strings**: `"phase": "3"`, `"phase": "4"` for filtering/reporting.
- Avoid mixing `"Phase 3"` and `"3"` across the queue.

## Recommendations to PM (next work)

### Option A — Phase 4 (stay local-only; polish + maintainability)

Add a Phase 4 section to `specs/todo-spec.md` and tasks such as:

- Extract UI components from `App.tsx` (no behavior changes)
- Add empty state + better copy and keyboard flows
- Inline edit title (enter/escape save/cancel)
- Optional: undo delete (short-lived in-memory buffer)

### Option B — “HTTP-integrated” evolution (only if you want to practice the boundary)

If the goal is to practice vertical ↔ API integration, treat it as a deliberate architecture change:

- Keep `apps/todo-instance` local-only, and use `apps/todoapp-instance` + `apps/todoapp-api` for the full-stack path (already scaffolded).
- Write an explicit spec section: auth (or not), API contract shape, error handling, and test strategy (MSW vs integration tests).

## Recommendations to Dev (implementation hygiene)

- Prefer **pure helper functions** for business rules (toggleAll/filtering) so UI tests don’t need to cover every branch.
- Keep `todos.storage.ts` tolerant (missing/corrupt data never crashes).
- When refactoring, keep tests focused on **user-visible behaviors** and key persistence invariants.

## Handoff

- PM: choose Phase 4 (local polish) vs full-stack path; then generate the next task batch with `phase: "4"`.
- Dev: if Phase 4, start with a small refactor task to split UI components out of `App.tsx` without behavior changes; keep gates green.

