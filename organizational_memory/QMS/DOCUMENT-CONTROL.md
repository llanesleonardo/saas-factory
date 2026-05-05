# DOCUMENT CONTROL (QMS `PUBLISHED/`)

## Document IDs

- **`QMS-PUB-001` … `QMS-PUB-099`** — Reserved for cross-cutting **procedures** (how we run the factory, CI, release).
- **`QMS-PUB-1xx`** — **Vertical / product** work instructions (e.g. dentist deploy checklist).
- **`QMS-PUB-9xx`** — **Meta** (this file, templates).

Assign the next free id when **Docs Agent** creates a new controlled document. Update this table.

| Doc ID | Title | File path | Revision | Status |
|--------|-------|-----------|----------|--------|
| — | *(none yet)* | — | — | — |

## Revision rules

- **Patch** (0.0.x): typos, clarifications, no process change.
- **Minor** (0.x.0): new steps, expanded scope, new diagram reflecting agreed practice.
- **Major** (x.0.0): superseded approach; link old doc as **Superseded** in document control table.

## Approval

Until a formal approver list exists, **“Approved”** means: PR merged with reviewer + Docs Agent revision note in **Revision history**.
