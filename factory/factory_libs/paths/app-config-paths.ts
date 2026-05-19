/**
 * Per-app config layout: configs/apps/<appSlug>/
 *   <appSlug>.json   — vertical / product brief (same schema as former configs/<vertical>.json)
 *   app.stack.json   — stack + tooling (same schema as former app.blueprint.json)
 */
import path from "node:path";

export const CONFIGS_APPS_SEGMENT = "apps";

export function configsAppsRoot(repoRoot: string): string {
  return path.join(repoRoot, "configs", CONFIGS_APPS_SEGMENT);
}

/** Product brief: configs/apps/<slug>/<slug>.json */
export function verticalBriefPath(repoRoot: string, appSlug: string): string {
  return path.join(configsAppsRoot(repoRoot), appSlug, `${appSlug}.json`);
}

/** Stack file: configs/apps/<slug>/app.stack.json */
export function appStackPath(repoRoot: string, appSlug: string): string {
  return path.join(configsAppsRoot(repoRoot), appSlug, "app.stack.json");
}

/** Business needs bundle: configs/apps/<slug>/business-needs.json */
export function businessNeedsPath(repoRoot: string, appSlug: string): string {
  return path.join(configsAppsRoot(repoRoot), appSlug, "business-needs.json");
}

/** Per-order epic roadmap — `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json` */
export function orderPhasesPath(repoRoot: string, orderId: string): string {
  return path.join(
    repoRoot,
    "factory",
    "01_production_planning",
    "01_02_phase_registry",
    orderId.trim(),
    "order-phases.json",
  );
}

/**
 * Phase → task proposals before merging into `task-queue.json`.
 * `factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-<phase-token>.json`
 */
export function phaseBreakdownProposalPath(repoRoot: string, orderId: string, phaseIdSafeToken: string): string {
  return path.join(
    repoRoot,
    "factory",
    "01_production_planning",
    "01_03_task-registry",
    orderId.trim(),
    `phase-breakdown-${phaseIdSafeToken}.json`,
  );
}

/** JSON Schema $schema URL relative to vertical brief file (configs/apps/<slug>/<slug>.json). */
export const VERTICAL_BRIEF_SCHEMA_REF = "../../../factory/factory_schemas/vertical-config.schema.json";

/** JSON Schema $schema URL relative to business-needs.json (same folder depth as vertical brief). */
export const BUSINESS_NEEDS_SCHEMA_REF = "../../../factory/factory_schemas/business-needs.schema.json";

/** JSON Schema $schema URL relative to `order-manifest.json` under `01_00_work_orders/<orderId>/`. */
export const ORDER_MANIFEST_SCHEMA_REF = "../../../factory/factory_schemas/order-manifest.schema.json";

/** Same folder depth as manifest — `sales-order.json` / `work-order.json` under the order folder. */
export const SALES_ORDER_SCHEMA_REF = "../../../factory/factory_schemas/sales-order.schema.json";

export const WORK_ORDER_SCHEMA_REF = "../../../factory/factory_schemas/work-order.schema.json";

