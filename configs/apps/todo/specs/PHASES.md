# TODO — PHASE ROADMAP (PHASES ONLY)

This file is a **phase-only roadmap** for the `todo` vertical.

- **No task breakdown here.** Each phase becomes tasks only when you are ready to execute it.
- **Source artifacts**:
  - Customer needs (Product IR): `configs/apps/todo/todo.json`
  - Tech stack (System IR): `configs/apps/todo/app.stack.json`
  - App scaffold: `npm run mfg -- app scaffold -- todo`
  - Spec: `configs/apps/todo/specs/todo-spec.md`
  - Execution plan (when ready): `factory/03_assembly_lines/03-registry/registry/task-queue.json` (phase slice only)

---

## Phase 0 — Intake + constraints (customer needs)

- Capture/confirm the customer need and constraints in `configs/apps/todo/todo.json`.
- Define “success” (acceptance) at the product level (what shipped value looks like).

Exit criteria:
- Product IR is schema-valid (`npm run mfg -- validate apps` includes brief checks; or validate the brief file against the schema in CI).

---

## Phase 1 — Stack contract (System IR)

- Generate or update `configs/apps/todo/app.stack.json` via `npm run mfg -- app stack -- todo`.
- Validate contradictions early.

Exit criteria:
- `npm run mfg -- stack validate -- --all` passes (or at minimum: this app’s stack validates).

---

## Phase 2 — Scaffold (make the contract real)

- Run `npm run mfg -- app scaffold -- todo` to materialize/update the runnable skeleton and wiring.
- Ensure repo wiring stays aligned with the stack contract.

Exit criteria:
- Scaffold re-runs idempotently with no surprising diffs.
- Baseline checks pass (`npm run check`).

---

## Phase 3 — Spec (acceptance + boundaries)

- Produce/refresh `configs/apps/todo/specs/todo-spec.md` (MVP + phased scope).
- Keep phases explicit (scope + non-goals + verification notes).

Exit criteria:
- Spec is “good enough” for PM to decompose without guessing.

---

## Phase 4 — Phase planning (PM task decomposition for *one* phase)

- Pick the next phase to execute (single slice).
- PM decomposes that phase into atomic tasks with dependencies and acceptance criteria.

Exit criteria:
- Phase slice is pasted/merged into `factory/03_assembly_lines/03-registry/registry/task-queue.json`.
- `npm run mfg -- validate task-queue` passes.
- `npm run mfg -- line next` suggests a pullable task.

---

## Phase 5 — Build + verify loop (per task)

For each task:
- Dev implements one task id.
- Quality verifies (tests/build/manual checks) and reports pass/fail.
- Fix only when failing; loop until green.

Exit criteria:
- Task is merged and marked `status: "done"` in `factory/03_assembly_lines/03-registry/registry/task-queue.json`.
- Any substantive work has a QMS inbox record (per role) when required.

---

## Phase 6 — Ship (deploy + smoke)

- Deploy the increment (preview/prod as applicable).
- Run smoke checks against the spec’s acceptance for the phase.

Exit criteria:
- Deployment is live for the intended environment(s).
- Smoke checks are recorded (manual checklist or automated gates).

---

## Phase 7 — Operate + feedback (learn)

- Capture real feedback (support, usability, operational issues).
- Feed changes back into:
  - Product IR (`configs/apps/todo/todo.json`) when customer needs/constraints changed
  - Spec (`configs/apps/todo/specs/todo-spec.md`) when acceptance/scope needs refinement
  - Stack contract (`configs/apps/todo/app.stack.json`) when architecture choices changed

Exit criteria:
- Next phase is selected and ready for Phase 4 decomposition.

