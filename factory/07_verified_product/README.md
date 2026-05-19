# Verified product (`factory/07_verified_product/`)

**Purpose:** hold **human-readable specs and replication notes** for products that are **already built, gated, and safe to clone as a pattern** — distinct from:

| Zone | Role |
|------|------|
| **`factory/00_product_definitions/`** | **Templates** and blueprint trees for *new* verticals (not yet manufactured). |
| **`configs/apps/<slug>/`** + **`apps/<slug>-instance/`** | **Living** config + code for each vertical in the monorepo. |
| **`factory/07_verified_product/products/<slug>/`** | **Curated “gold copy” narrative**: what shipped, which paths to copy, acceptance bar, and how to replicate for a *new* slug. |

**Machine registry:** apps promoted through manufacturing checks are listed in **`factory/03_assembly_lines/03-registry/registry/verified-apps.json`** (schema: **`factory/factory_schemas/verified-apps.schema.json`**). Promote with:

```bash
npm run mfg -- app verified -- add <slug> [--strict]
```

This folder **does not replace** that JSON — it **documents** verified products so sales, PM, and Builder/Dev can **replicate without reverse-engineering** the repo.

## Layout

```text
factory/07_verified_product/
  README.md                 ← this file
  templates/                ← copy when adding a new verified-product package
  products/                 ← one subfolder per slug (e.g. todo)
```

## Adding a new verified product package

1. **Prove the vertical** — `npm run check`, `npm run mfg -- validate factory`, product-specific gates; instance and configs match **`mfg app quote`** / SaaS alignment expectations.
2. **Register** — `npm run mfg -- app verified -- add <slug>` (updates **`verified-apps.json`**).
3. **Document** — copy **`templates/VERIFIED-PRODUCT-SPEC.template.md`** → **`products/<slug>/README.md`** and fill: repo paths, stack summary, acceptance checklist, replication steps (point at **`mfg app new`**, **`app stack`**, **`app scaffold`**, spec paths).
4. **Link** — add a row under **`products/README.md`**.

## See also

- **`factory/README.md`** — factory zone map (includes this folder as **07**).
- **`factory/06_knowledge_base/go_to_market/SALES-AND-ASSEMBLY-LINE-GUIDE.md`** — commercial + line checklist.
- **`factory/00_product_definitions/general_sass_specs/README.md`** — spec *templates* for greenfield verticals.
