# Agent action record

## Document metadata
- **Date (UTC):** 2026-05-08
- **Agent role:** docs
- **Task id / issue:** n/a (setup friction loop #2: Node/DOM tooling compatibility)
- **Spec / PR refs:** Node pin PR (merged to `main`); related fix record `2026-05-08-fix-todo-instance-vitest-happy-dom.md`
- **Depends on (optional):** n/a
- **Related inbox records (optional):** `2026-05-08-fix-todo-instance-vitest-happy-dom.md`

## Actions performed
- Captured and resolved a fresh-clone test failure path where DOM/tooling deps required newer Node patch versions, causing `EBADENGINE` warnings and Vitest worker startup errors (`ERR_REQUIRE_ESM` via jsdom/html-encoding-sniffer/@exodus/bytes).
- Documented and enforced supported Node versions repo-wide to prevent recurrence on new machines.

## Evidence
- **Repo Node version pin (merged):**
  - `.nvmrc` and `.node-version` (Node 22 LTS line)
  - root `package.json` `engines.node` set to `>=20.19.0`
  - root `README.md` prerequisite notes (Node 22 LTS recommended; min `>=20.19.0`)
- **Verification guidance:**
  - `npm install`
  - `npm run check`
  - App gates (when relevant): `npm run lint -w apps/todo-instance`, `npm run build -w apps/todo-instance`, `npm run test -w apps/todo-instance`

## Lessons learned & cautions (optional)
- Treat Node patch-level constraints as real: modern DOM/tooling deps may require `>=20.19` or Node 22 LTS even if install “works” with warnings.

## Handoff
- Keep Node pins updated when upgrading major deps (Vitest/jsdom, Vite, ESLint).
- If CI uses a Node matrix, ensure at least one job runs on the pinned LTS line.

