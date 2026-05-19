# Verified product: `<slug>`

**Status:** verified (replication-ready)  
**Registry:** listed in `factory/03_assembly_lines/03-registry/registry/verified-apps.json` after `npm run mfg -- app verified -- add <slug>`  
**Last reviewed:** YYYY-MM-DD

## What this is

One paragraph: product purpose, who uses it, and why it is the **reference** implementation for new verticals.

## Repo map (source of truth paths)

| Artifact | Path |
|----------|------|
| Vertical config | `configs/apps/<slug>/` |
| Instance app | `apps/<slug>-instance/` |
| Spec / phases | `configs/apps/<slug>/specs/` (and `_generated/` if used) |
| App stack contract | `configs/apps/<slug>/app.stack.json` |
| Work orders / orders (if used) | `factory/01_production_planning/01_00_work_orders/…` |

## Stack & integration

- **Integration mode** (per architecture): monorepo-integrated / HTTP-integrated / standalone — and what we assumed for this vertical.
- **Auth / storage / deploy** highlights (bullets).
- **Env vars** worth documenting for replication (names only; no secrets).

## Acceptance bar (“verified” means)

- [ ] `npm run check` green on `main` at time of verification  
- [ ] `npm run mfg -- validate factory` green  
- [ ] Product-specific: e.g. E2E smoke, critical API paths, accessibility spot-check — list what was actually run  

## Replication playbook (new vertical `<new-slug>`)

Ordered steps referencing **this** vertical as the pattern (adjust names):

1. `npm run mfg -- app new -- <new-slug>` (or equivalent brief)  
2. `npm run mfg -- app stack -- <new-slug>` → align `app.stack.json` with this product’s stack choices where appropriate  
3. `npm run mfg -- app negotiate -- <new-slug> …` as needed  
4. `npm run mfg -- app scaffold -- <new-slug>`  
5. Copy/adapt spec sections from `configs/apps/<slug>/specs/` — do **not** copy secrets or customer data  
6. Run gates / `gates review` for the new order+product when applicable  

## Changelog

| Date | Note |
|------|------|
| YYYY-MM-DD | Initial verified-product spec |
