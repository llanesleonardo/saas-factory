# DOCUMENT CONTROL (QMS `PUBLISHED/`)

## Document IDs

- **`QMS-PUB-001` … `QMS-PUB-099`** — Reserved for cross-cutting **procedures** (how we run the factory, CI, release).
- **`QMS-PUB-1xx`** — **Vertical / product** work instructions (e.g. dentist deploy checklist).
- **`QMS-PUB-9xx`** — **Meta** (this file, templates).

Assign the next free id when **Docs Agent** creates a new controlled document. Update this table.

| Doc ID | Title | File path | Revision | Status |
|--------|-------|-----------|----------|--------|
| QMS-PUB-001 | System Validation Strategy | `published/QMS-PUB-001-system-validation-strategy.md` | 0.1 | Draft |
| QMS-PUB-002 | System Verification Plan (System Acceptance) | `published/QMS-PUB-002-system-verification-plan.md` | 0.1 | Draft |
| QMS-PUB-003 | Subsystem Verification Plan (Subsystem Acceptance) | `published/QMS-PUB-003-subsystem-verification-plan.md` | 0.1 | Draft |
| QMS-PUB-004 | Unit & Device Test Plan | `published/QMS-PUB-004-unit-device-test-plan.md` | 0.1 | Draft |
| QMS-PUB-005 | Pull Request Decision Gate (Standard Procedure) | `published/QMS-PUB-005-pull-request-decision-gate.md` | 0.1 | Draft |
| QMS-PUB-006 | Example: First Factory Loop (todo-instance) — Standard Work Walkthrough | `published/QMS-PUB-006-example-first-loop-todo-instance.md` | 0.1 | Draft |

## Revision rules

- **Patch** (0.0.x): typos, clarifications, no process change.
- **Minor** (0.x.0): new steps, expanded scope, new diagram reflecting agreed practice.
- **Major** (x.0.0): superseded approach; link old doc as **Superseded** in document control table.

## Approval

Until a formal approver list exists, **“Approved”** means: PR merged with reviewer + Docs Agent revision note in **Revision history**.
