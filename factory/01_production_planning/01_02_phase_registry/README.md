# Phase registry (planning lens)

**Global roadmap (per app, phase granularity):** `factory/03_assembly_lines/03-registry/registry/phase-queue.json` (mirror: `factory/03_assembly_lines/03-registry/registry/phase-queue.json`). This is the **same epics** you later attach to an order.

**Per-order snapshot:** `factory/01_production_planning/01_02_phase_registry/<order-id>/order-phases.json` — created with:

```bash
npm run mfg -- app bdphase -- <order-id>
# or
npm run mfg -- order phases <order-id> init
```

That copies phases whose `app` matches the order’s **`productId`** from the global phase queue. Use `init --from-md` if you only maintain headings in `configs/apps/<slug>/specs/PHASES.md`.

**Epic metadata:** Each phase may declare **`basis`** (where requirements live: `business_needs`, `blueprint_stack`, `saas_baseline`, `delivery_surface`, …) and **`lanes`** (e.g. `frontend`, `backend`, `api` — install UI, define API, service work). Optional **`businessNeedsComponentRef`** ties an epic to a component from the business-needs bundle. **`pointers`** continue to hold repo paths (brief, stack, spec).

**Flow:** product definitions (`configs/apps/…`) → global **phase-queue** (optional) → **`order-phases.json`** here → **`npm run mfg -- order phases <orderId> breakdown <phaseId>`** writes proposed tasks under **`../01_03_task-registry/<orderId>/`** → PM merges into **`factory/03_assembly_lines/03-registry/registry/task-queue.json`**, carrying basis/lanes into task **`materials`** / **`order_phase_id`** when useful.
