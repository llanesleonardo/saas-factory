# Station: Intake

**Purpose:** Admit work onto the assembly line by fixing **which order** is being built and **which product(s)** that order carries. Product definitions and stack blueprints are **not** authored here — only referenced.

## Inputs

| Input | Meaning |
|--------|---------|
| **Order id** | Folder key under **`factory/01_production_planning/01_00_work_orders/<orderId>/`** |
| **Products in the order** | Declared on the manifest as **`productId`** (slug per app/vertical), resolving to **`configs/apps/<productId>/`** |

The current **`OrderManifest`** type carries one **`productId`** per order folder; a multi-product order would be modeled by extending that manifest (or one folder per line item) — **intake** still means: order id + which product(s) the factory should bind to under **`configs/apps/`**.

Canonical manifest: **`order-manifest.json`** (`orderId`, **`productId`**, **`productVersion`**, **`priority`**, optional **`planRef`**, lifecycle fields).

Validate links: **`npm run mfg -- order validate <orderId>`**

Commercial path (optional): **`mfg so`** → **`mfg wo`** — see **`factory/01_production_planning/01_00_work_orders/README.md`**.

## What lives elsewhere (do not duplicate here)

| Topic | Where |
|--------|--------|
| Vertical brief / Product IR shape | **`configs/apps/<app>/<app>.json`** · schemas **`factory/factory_schemas/vertical-config.schema.json`** |
| BMC-style definition modules | **`factory/00_product_definitions/`** (see that folder’s **`README.md`**) |
| Stack / System IR trees & wizard | **`factory/00_product_definitions/app_stack/`** · **`factory/03_assembly_lines/06-gates/gates/app-blueprint-config.ts`** |
| Persisted contracts + specs tree | Station **`../02-contracts/README.md`** |

This **`01-intake/`** folder holds **only** this README — no nested copies of product-definition or blueprint documentation.

## Next stations

**`../02-contracts/`** — persisted Product IR + System IR + specs under **`configs/apps/`**. Then **`../03-registry/`**, **`../06-gates/`**, …
