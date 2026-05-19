# Product definitions — business needs (`00_product_definitions/business_needs/`)

**Upstream definitions** for intake: ten modular slices mapped to the Business Model Canvas. Together they describe what to build **before** stack blueprints and assembly-line execution.

Merge strategy for runtime today: fields may still live in a single vertical brief JSON (`configs/apps/<app>/<app>.json`) — see `factory/factory_schemas/vertical-config.schema.json`. These modules are the **target decomposition** for typed authoring, validation, and generators.

| # | Module | BMC block | Captures |
|---|--------|-----------|----------|
| 01 | `01-business-definition.ts` | Value propositions | Core value delivered, problem solved, market differentiation |
| 02 | `02-user-definition.ts` | Customer segments | Personas, roles, ICPs, user tiers, B2B vs B2C |
| 03 | `03-workflow-definition.ts` | Customer relationships + channels | How users interact, onboarding, touchpoints, delivery channels |
| 04 | `04-feature-definition.ts` | Key activities | Core features, priority, scope |
| 05 | `05-saas-module-mapping.ts` | Key resources | Modules, APIs, infra that power the activities |
| 06 | `06-ui-ux-constraints.ts` | Channels (experience layer) | Visual/interactive experience constraints |
| 07 | `07-technical-constraints.ts` | Key partnerships + key resources | External deps, infra limits, integrations |
| 08 | `08-acceptance-criteria.ts` | Key activities (quality) | Definition of done, QA gates, operational success |
| 09 | `09-monetization-definition.ts` | Revenue streams + cost structure | Pricing, tiers, billing triggers, margin targets |
| 10 | `10-deployment-definition.ts` | Channels (delivery layer) | Environments, regions, release strategy, GTM path |

**Planning integration:** `factory/00_product_definitions/` feeds intake; each order may include `factory/01_production_planning/01_00_work_orders/<order-id>/order-intake.ts` (re-exports `../validate-manifest.ts` for **`order-manifest.json`**). Ignore stray duplicate **`01_00_shop_orders/`** trees unless your branch uses them.
