# `configs/` — per-app folders

**Factory commands** use the single CLI: **`npm run mfg -- <subcommand>`** — run **`npm run mfg -- help`** for the full list.

Each deployable **app** (vertical instance) has a directory:

```text
configs/apps/<appSlug>/
  <appSlug>.json       # product / vertical brief (drives generate-spec)
  business-needs.json   # optional PM bundle — product + commercial + integrations + narrative (mfg app bn)
  app.stack.json       # stack + tooling (drives mfg app scaffold)
```

**`<appSlug>`** must match **`vertical`** inside `<appSlug>.json` and usually matches **`apps/<appSlug>-instance/`**.

---

## New app — **config first** (normative)

0. **Optional — business needs (single JSON):** **`npm run mfg -- app bn -- <appSlug>`** writes **`configs/apps/<appSlug>/business-needs.json`** — **`productSpec`**, **`businessModel`**, **`integrationPlan`**, and **`narrative`** (problem, goals, success criteria, assumptions, risks) together for PM intake. Same flags as other wizards: **`--defaults`**, **`--show`**, **`--defaults --force`**.

After brief + stack + optional business-needs: **`npm run mfg -- app saas -- <appSlug>`** checks SaaS baseline (auth, DB, CI, observability, billing/tenancy story) and cross-file alignment (`--json` for machine output, **`--strict`** requires **`business-needs.json`**).

1. **Vertical brief (product config):** **`npm run mfg -- app new -- <appSlug>`** (interactive) or **`--defaults`** — writes **`configs/apps/<appSlug>/<appSlug>.json`**. **Array fields:** semicolon-separated (e.g. `US; CA; UK`). You can **re-run the interactive wizard anytime**; if the file already exists, prompts are **pre-filled** from it and saving **replaces** the file. **`--defaults`** alone refuses to overwrite an existing file; use **`--defaults --force`** to reset to the template.
2. Edit that JSON and run **`npm run mfg -- validate apps`** once **`app.stack.json`** exists (step 3) to re-check **all** briefs plus **every** stack file under **`configs/apps/`** in one command. Before the stack file exists, brief-only validation still runs as part of **`validate apps`** (stack step may report missing files until you add them).
3. **Stack file (`app.stack.json`):** not part of **`mfg app new`**. When you are ready for System IR, run **`npm run mfg -- app stack -- <appSlug>`** (see **`npm run mfg -- app stack -- --help`**). That writes **`configs/apps/<appSlug>/app.stack.json`**.
4. **`npm run mfg -- spec generate <appSlug>`** (or **`mfg spec <appSlug>`**) → **`configs/apps/<appSlug>/specs/_generated/<appSlug>-SPEC-PROMPT.md`** → **`@agents/spec-generator-agent.md`** → **`configs/apps/<appSlug>/specs/<appSlug>-spec.md`**.
5. **`@agents/pm-agent.md`** → tasks; **`@agents/builder-agent.md`** → scaffold **`apps/<appSlug>-instance/`** if missing.

### Catalog + shop order (next)

6. **Product definitions** — align the slug with what the factory sells: **`factory/00_product_definitions/README.md`** (BMC slices under **`business_needs/`**, stack trees under **`app_stack/`**).
7. **Production planning** — create **`factory/01_production_planning/01_00_work_orders/<order-id>/order-manifest.json`** with **`productId`** = your **`appSlug`**, optional **`planRef`** pointing at **`factory/01_production_planning/plans/<plan-folder>/`**.
8. **`npm run mfg -- order validate <order-id>`** — asserts **`configs/apps/<productId>/<productId>.json`** exists (warns if **`app.stack.json`** missing). After brief + stack: **`npm run mfg -- validate apps`**. Smoke: **`npm run mfg -- pipeline order`** ( **`validate apps`** + example order **`example-order-001`**).

---

## Ongoing discovery (anytime)

**`npm run mfg -- app negotiate -- <appSlug> --negotiator "Name"`** is not limited to day zero. Use it **whenever** new business needs or stack adjustments show up — first discovery, mid-build, UAT, pricing/compliance shifts, or **right before production** when the customer signs off on the final offer. That matches a salesperson (or CS / solutions) **continuously** capturing what the customer asked for and what was agreed technically.

- **Requires** both **`configs/apps/<appSlug>/<appSlug>.json`** and **`app.stack.json`** (bootstrap steps 1 and 3 once, then re-run negotiate any time).
- **TTY:** run from a real terminal (**`npm run mfg -- app negotiate -- …`**).
- **Audit:** each successful write appends a line to **`configs/apps/<appSlug>/negotiation-log.jsonl`** (who, when, what changed).

**After brief changes:** **`npm run mfg -- validate apps`** (brief portion) → **`npm run mfg -- spec generate <appSlug>`** → refresh **`configs/apps/<appSlug>/specs/<appSlug>-spec.md`** per your spec-control process.

**After stack changes:** **`npm run mfg -- app scaffold -- <appSlug>`** (and review generated compose / CI / app layout) so the repo stays aligned with **`app.stack.json`**.

---

## Files

| Path | Purpose |
|------|---------|
| **`configs/apps/<slug>/<slug>.json`** | Product brief from **`npm run mfg -- app new`**; input for **`npm run mfg -- spec generate <slug>`** |
| **`configs/apps/<slug>/business-needs.json`** | Optional PM bundle from **`npm run mfg -- app bn -- <slug>`** — business needs in one place (`factory/factory_schemas/business-needs.schema.json`) |
| **`configs/apps/<slug>/app.stack.json`** | Stack / DB / Docker / CI sketch — create with **`npm run mfg -- app stack -- <slug>`**; consumed by **`npm run mfg -- app scaffold -- <slug>`** |
| **`configs/apps/<slug>/negotiation-log.jsonl`** | Append-only audit from **`npm run mfg -- app negotiate`** (repeatable across the whole product lifecycle) |

---

## `configs/apps/<slug>/<slug>.json` — field reference

See **`factory/factory_schemas/vertical-config.schema.json`** and **`factory/factory_libs/product/vertical-config-types.ts`**. Same fields as documented previously: **`vertical`**, **`displayName`**, narrative fields, **`tenancy`**, **`identity`**, **`dataClassification`**, **`slaAndSupport`**, **`nonGoals`**, etc.

**`$schema`:** **`../../../factory/factory_schemas/vertical-config.schema.json`** (matches `VERTICAL_BRIEF_SCHEMA_REF` in **`factory/factory_libs/paths/app-config-paths.ts`**).

---

## `configs/apps/<slug>/app.stack.json`

- **`schemaVersion`:** **2** (enforced by **`loadBlueprintFromPath`** in **`factory/03_assembly_lines/06-gates/gates/app-blueprint-config.ts`**).
- Defines **`appSlug`** (used as **`apps/<appSlug>-instance`** / **`-api`** prefix when scaffolding), frontend/backend, DB, Redis, tooling, **`cicd`**, **`observability`**.
- **`frontendDetail`** (optional): richer **frontend decision tree** from **`mfg app stack`** manual mode — framework, language, bundler, styling, UI kit, router, state, client API strategy, test focus, deployment intent, extras. The coarse **`frontend.stack`** field remains what **`mfg app scaffold`** keys off today.
- **`ai`** (optional): **`integration`** (`none`, OpenAI/Azure/Anthropic sketches, …) and optional **`notes`** — product/LLM boundary for agents; scaffold treats as documentation until generators grow.

---

## Validation

- **Vertical briefs + stacks:** **`npm run mfg -- validate apps`** — every **`configs/apps/*/<slug>.json`** where `<slug>` matches the parent folder name, plus every **`app.stack.json`** when present.
- **SaaS baseline + cross-file alignment:** **`npm run mfg -- app saas -- <slug>`** — brief + **`app.stack.json`** + optional **`business-needs.json`** (use **`--strict`** to require the PM bundle).
- **Verified manufacturing list:** **`npm run mfg -- app verified`** prints apps promoted after **`mfg app verified -- add <slug>`** (registry: **`factory/03_assembly_lines/03-registry/registry/verified-apps.json`** — requires scaffolded **`apps/<slug>-instance`** and passing **`app saas`** checks).
- **Stack file:** validated when loaded (**`mfg app scaffold`**, **`--from`**, or **`mfg app stack --show`**).

## Flow (brief)

1. **`configs/apps/<slug>/<slug>.json`** via **`npm run mfg -- app new -- <slug>`** → validate brief (part of **`validate apps`**) → **`npm run mfg -- spec generate <slug>`**.
2. **`configs/apps/<slug>/app.stack.json`** via **`npm run mfg -- app stack -- <slug>`** → **`npm run mfg -- app scaffold -- <slug>`**.
3. Revisit **`mfg app negotiate`** whenever requirements or stack agreements change; then re-run **spec generate** and/or **app scaffold** as above.

See root **`README.md`**, **`organizational_memory/FACTORY-PROCESS.md`**, **`agents/tooling-agent.md`**.
