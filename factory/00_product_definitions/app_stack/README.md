# App stack — System IR prompt trees

TypeScript modules named **`blueprint-*-tree.ts`** hold the **interactive decision trees** used when authoring **`configs/apps/<app>/app.stack.json`**.

**Wired from:** `factory/03_assembly_lines/06-gates/gates/app-blueprint-config.ts` (import paths under `../00_product_definitions/app_stack/`).

**CLI:** `npm run mfg -- app stack -- <appSlug>`.

Do not confuse with per-app **`app.stack.json`** output — that file lives under **`configs/apps/`** after the wizard runs.
