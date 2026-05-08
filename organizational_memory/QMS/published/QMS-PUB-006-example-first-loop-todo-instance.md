# Example: First Factory Loop (todo-instance) — Standard Work Walkthrough

## Document control
| Field | Value |
|-------|--------|
| **Document ID** | QMS-PUB-006 |
| **Revision** | 0.1 |
| **Status** | Draft |
| **Owner (role)** | Docs (with PM / Git / Quality) |
| **Source records** | `organizational_memory/QMS/inbox/2026-05-08-builder-todo-instance-scaffold.md`, `.../2026-05-08-spec-generator-todo-spec.md`, `.../2026-05-08-dev-TODO_001_storage_model.md`, `.../2026-05-08-quality-TODO_001_storage_model.md`, `.../2026-05-09-fix-ci-todoapp-api-jest-types.md`, `.../2026-05-09-fix-ci-todoapp-instance-jsx.md` |
| **Applicable roles** | Builder, Spec Generator, PM, Dev, Quality, Fix, Git, Docs |
| **Review due** | n/a |

## Purpose & scope

This document is a **worked example** of a complete SaaS Factory loop for a minimal vertical (`todo-instance`). It exists so humans and agents can copy/paste the **exact role messages** and understand the **required artifacts** and **decision gates**.

**In scope:** the end-to-end path from scaffold → spec → tasks → implement → verify → PR/merge → post-merge closure.

**Out of scope:** adding advanced features (auth, API, payments); those should start a new spec/PM loop.

## References

- `organizational_memory/FACTORY-PROCESS.md` (end-to-end flow)
- `organizational_memory/AGENTS.md` (router + message templates)
- `organizational_memory/QMS/published/QMS-PUB-005-pull-request-decision-gate.md` (PR gate + post-merge closure)

## Procedure / work instruction (example run)

### A) Builder — create the vertical shell

**Message template**:

```text
For this message only, follow the role and rules in @agents/builder-agent.md.
Vertical id: todo
Instance folder: apps/todo-instance/
Goal: scaffold the minimal runnable skeleton (placeholder UI only).
Output: list files changed + exact commands to run.
```

**Expected artifacts**:
- `apps/todo-instance/` scaffold
- `configs/todo.json` (vertical metadata)
- QMS inbox record (Builder)

### B) Spec Generator — write MVP spec

**Message template**:

```text
For this message only, follow the role and rules in @agents/spec-generator-agent.md.
Create specs/todo-spec.md for MVP (add/list/complete/delete).
Persistence is local-only for MVP (no API).
Include acceptance bullets.
```

**Expected artifacts**:
- `specs/todo-spec.md`
- QMS inbox record (Spec Generator)

### C) PM — create tasks

**Message template**:

```text
For this message only, follow the role and rules in @agents/pm-agent.md.
Input spec: @specs/todo-spec.md.
Produce ≤2h tasks with ids, depends_on, acceptance_criteria.
Output JSON suitable for factory/task-queue.json.
```

**Expected artifacts**:
- Tasks recorded in `factory/task-queue.json` (or pasted output ready to be recorded)

### D) Dev → Quality loop (per task)

**Dev message template**:

```text
For this message only, follow the role and rules in @agents/dev-agent.md.
Task id: <ID>
Implement only this task in apps/todo-instance/ per specs/todo-spec.md.
```

**Quality message template**:

```text
For this message only, follow the role and rules in @agents/quality-agent.md.
Verify task <ID> for apps/todo-instance/.
Run build/lint and any required manual checks; output structured gate JSON.
```

**Expected artifacts (minimum)**:
- Dev QMS inbox record for the task id
- Quality QMS inbox record for the task id
- CI green (or local gates + manual checks documented)

### E) Git — commit + PR + merge

**Message template**:

```text
For this message only, follow the role and rules in @agents/git-agent.md.
Task id: <ID>
Create a commit and a PR description.
```

**Gate:** PR merge per QMS-PUB-005 (CI green, Quality pass).

### F) Fix loop — CI failures (if any)

**Message template**:

```text
For this message only, follow the role and rules in @agents/fix-agent.md.
Here are the failing CI logs: <paste>.
Fix only what is needed to pass.
```

**Expected artifacts**:
- Minimal commit(s) addressing CI
- QMS inbox record (Fix)

### G) Post-merge closure (required)

After the PR is merged:
- Update `factory/task-queue.json` → completed tasks are **`status: \"done\"`**
- Ensure QMS inbox evidence exists for the completed work

This is required standard work per **QMS-PUB-005**.

## Lessons learned & best practices

- **Proven:** Build/lint gates + explicit manual checks are sufficient for tiny MVPs; add automated tests when regressions appear.
- **Proven:** Recording task completion in `factory/task-queue.json` prevents “phantom work” and drift.

## Revision history
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-05-09 | Docs | Initial publish: first-loop walkthrough for todo-instance |

