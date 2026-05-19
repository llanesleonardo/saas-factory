# Work orders (`01_00_work_orders/<order-id>/`)

Each **order** is a folder keyed by **`orderId`**.

| File | Purpose |
|------|---------|
| `order-manifest.json` | **Apps on this order:** legacy single line (**`productId`**, **`productVersion`**, **`priority`**) **or** **`products`** array (`{ productId, productVersion?, priority? }[]`). Links each app → **`configs/apps/<productId>/`**. Optional **`planRef`** → **`../plans/`**; optional **`lifecycleStatus`** / **`lastLifecycleEventAt`**. Optional **`$schema`** → **`factory/factory_schemas/order-manifest.schema.json`**. |
| `contracts/<productId>/contract.json` | Per-app **pointers** to Product IR, System IR, specs dir, business-needs — written by **`mfg order validate`** / **`mfg order contracts`** (assembly line **contracts** mirror under this order folder). |
| *(generated)* **`factory/03_assembly_lines/03-registry/orders/<orderId>/<productId>/workforce-registry.json`** | Same commands — **registry station** slice: global roster paths + workstation map stations for workforce planning next to the contract. |
| `order-events.jsonl` | Append-only audit when you run **`order lifecycle`** (factory-side status changes). |
| `sales-order.json` / `work-order.json` | **`mfg so`** / **`mfg wo`** (commercial → manufacturing gate). Optional **`$schema`**: **`sales-order.schema.json`** / **`work-order.schema.json`** in **`factory/factory_schemas/`**. |
| `order-schedule-calendar.json` | Manufacturing window for calendars — **`mfg order schedule`**. |

Epic roadmap (**`order-phases.json`**) lives under **`../01_02_phase_registry/<order-id>/`** — see **`../01_02_phase_registry/README.md`**.

| Command | Purpose |
|---------|---------|
| **`mfg order validate <id>`** | Validates manifest + links to **`configs/`** and optional **`plans/`**; writes **`contracts/<productId>/contract.json`** for each app line. |
| **`mfg order contracts <id>`** | Re-run contract JSON only (same validation rules). |
| **`mfg order lifecycle <id> set <status>`** | Updates **`lifecycleStatus`** + **`order-events.jsonl`**. |
| **`mfg order phases <id> init \| show \| set-status \| annotate \| breakdown …`** | **`01_02_phase_registry/<id>/order-phases.json`** from phase-queue / **`PHASES.md`**; **`breakdown`** writes proposals under **`01_03_task-registry/<id>/`**. |
| **`mfg order schedule <id> --start …`** | **`order-schedule-calendar.json`**. |
| **`mfg so` / `mfg wo`** | Sales order → confirmed → work order. |

**Imports:** `order-intake.ts` re-exports **`validate-manifest.ts`**.

**Multi-app example** (`order-manifest.json`):

```json
{
  "orderId": "shop-2026-001",
  "products": [
    { "productId": "todo", "productVersion": "1.0.0", "priority": 1 },
    { "productId": "core-saas", "productVersion": "2.0.0", "priority": 2 }
  ],
  "notes": "Each product gets contracts/<productId>/contract.json"
}
```

See **`../README.md`** (sequence: order → lifecycle → schedule → phases → task queue).
