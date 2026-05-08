# LESSONS LEARNED & BEST PRACTICES (ROLLING REGISTER)

**Maintainer:** Docs Agent (with humans). **Sources:** `QMS/inbox/*.md`, PR retros, support triage.

Do not delete historical bullets without archiving; prefer **strike-through** and a short “superseded by” note.

## How to use

- **Agents:** capture detail in **`inbox/`** per session or task.
- **Docs Agent:** periodically merge **non-duplicate** insights here under the right category; link to **`published/`** procedures when a lesson becomes standard work.

---

## Categories

### Build & implementation
- *(none yet)*

### Quality & verification
- **Factory planner status enum is strict**: `factory:next` rejects unknown statuses (allowed: `backlog | ready | in_progress | blocked | done`). Keep `factory/task-queue.json` aligned to avoid stopping the line.

### Security & compliance
- *(none yet)*

### Delivery & operations
- *(none yet)*

### Tooling & developer experience
- **`tsx` may require IPC permissions**: if `npm run factory:next` fails with `EPERM` on a temp pipe, rerun outside a restricted sandbox or with elevated permissions so `tsx` can create its IPC server.
- **Pin Node version to avoid fresh-clone drift**: prefer `.nvmrc` / `.node-version` plus `package.json` `engines.node` (min `>=20.19.0`, Node 22 LTS recommended) so installs/tests don’t fail due to dependency engine constraints.

### Product & scope
- *(none yet)*

---

## Revision history (this register)

| Date | Change |
|------|--------|
| 2026-05-04 | Initial empty structure for QMS-style knowledge capture. |
