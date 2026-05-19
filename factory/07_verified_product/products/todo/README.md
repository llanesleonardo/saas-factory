# Verified product: **todo**

**Status:** reference implementation in-repo (promote via registry when your process says “verified”)  
**Slug:** `todo`  
**Instance:** `apps/todo-instance/`  
**Config:** `configs/apps/todo/`

## What this is

Minimal **vertical SaaS instance**: todo CRUD, API + Vite frontend, used as the factory’s **default worked example** for stack negotiation, scaffold, gates, and telemetry. Safe to treat as the **gold pattern** when spinning a new `*-instance` vertical.

## Repo map

| Artifact | Path |
|----------|------|
| Vertical config | `configs/apps/todo/` |
| Spec (human) | `configs/apps/todo/specs/todo-spec.md` |
| Phases / epics | `configs/apps/todo/specs/PHASES.md` |
| Generated spec prompt | `configs/apps/todo/specs/_generated/todo-SPEC-PROMPT.md` |
| Stack contract | `configs/apps/todo/app.stack.json` |
| Instance app | `apps/todo-instance/` (`src/` + `frontend/` + `backend/` per scaffold) |
| HTTP API (companion) | `apps/todo-api/` — local dev on port **4000** (see instance `README.md` / `VITE_API_TARGET`) |

## Stack & integration

- **Frontend:** Vite + React + TypeScript (from `app.stack.json` / scaffold output).  
- **Backend:** API under instance (see instance `README.md` for dev ports and `VITE_API_TARGET`).  
- **Integration:** Default factory examples assume **monorepo-integrated** patterns unless your `app.stack.json` says otherwise — align with **`factory/06_knowledge_base/architecture/ARCHITECTURE.md`**.

## Acceptance bar (typical for “verified” todo)

- [ ] `npm run check`  
- [ ] `npm run mfg -- validate factory`  
- [ ] Instance README “Dev” path runs locally; critical flows (create/list/update/delete) exercised  

Formal promotion into **`verified-apps.json`**:

```bash
npm run mfg -- app verified -- add todo
```

(Add **`--strict`** if you require `business-needs.json` for SaaS alignment.)

## Replication playbook (new vertical `acme`)

1. **`npm run mfg -- app new -- acme`** — brief + vertical config stub.  
2. **`npm run mfg -- app stack -- acme`** — mirror **todo**’s stack families where appropriate (`app.stack.json`).  
3. **`npm run mfg -- app negotiate -- acme …`** — record agreements (see **`configs/README.md`**).  
4. **`npm run mfg -- app scaffold -- acme`** — generate `apps/acme-instance/` from stack.  
5. **Specs** — use **`configs/apps/todo/specs/`** as outline; replace product nouns, routes, and NFRs for **acme**.  
6. **Gates** — `npm run mfg -- gates review <orderId> acme` when tied to a work order.  
7. **Register** — when done: **`npm run mfg -- app verified -- add acme`**.

## Changelog

| Date | Note |
|------|------|
| 2026-05-12 | Initial verified-product spec package for replication docs. |
