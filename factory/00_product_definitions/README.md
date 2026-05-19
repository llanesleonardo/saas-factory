# Product definitions — WHAT to build

Upstream **definitions**: what the factory is allowed to sell / build before scheduling and staffing.

**See also:**

- **BMC / business slices:** `business_needs/README.md` (and numbered `*.ts` modules there)
- **Stack IR prompt trees (System IR authoring):** `app_stack/` — imported by `factory/03_assembly_lines/06-gates/gates/app-blueprint-config.ts` for **`mfg app stack`**
- **Spec templates:** `general_sass_specs/README.md`
- Per-app persisted contracts: `configs/apps/<app>/` (`<app>.json`, `app.stack.json`, `specs/`)

This folder (`00_product_definitions/`) establishes ordering next to `01_production_planning/` and `02_workforce/`; subfolders above hold the reusable definition modules.

## How this ties to `configs/` and planning

| Step | Where | npm / action |
|------|--------|----------------|
| 1. Customer needs | `configs/apps/<slug>/<slug>.json` (+ stack) | **`npm run mfg -- …`** — see **`configs/README.md`** (`app new`, `validate apps`, **`app stack`**, `spec generate`, …) |
| 2. Definitions alignment | This folder (`00_product_definitions/`) | Human / PM: confirm **slug** and offering match IR + brief + templates |
| 3. Shop order | `factory/01_production_planning/01_00_work_orders/<order-id>/order-manifest.json` — **`productId`** = **`<slug>`** | `npm run mfg -- order validate <order-id>` |
| 4. Plan + phases | `factory/01_production_planning/plans/<planRef>/` + registries | See **`factory/01_production_planning/README.md`** |

Smoke from repo root: **`npm run mfg -- pipeline order`** ( **`mfg validate apps`** + example order **`example-order-001`**).
