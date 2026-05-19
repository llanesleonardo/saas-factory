/**
 * Validates configs/apps/<slug>/<slug>.json (vertical brief) against the vertical contract.
 * Used by generate-spec and npm run validate-vertical-config.
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { configsAppsRoot, verticalBriefPath } from "../../../factory_libs/paths/app-config-paths.js";
import type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

const VERTICAL_ID = /^[a-z][a-z0-9-]*$/;

/** Keys allowed besides $schema — must match VerticalConfig + factory/factory_schemas/vertical-config.schema.json */
const ALLOWED_KEYS = new Set([
  "$schema",
  "vertical",
  "displayName",
  "productSpec",
  "businessModel",
  "systemConstraints",
  "integrationPlan",
  "summary",
  "positioning",
  "primaryUser",
  "secondaryUsers",
  "regions",
  "compliance",
  "billingModel",
  "integrationsWishlist",
  "mvpScopeHint",
  "tenancy",
  "identity",
  "dataClassification",
  "slaAndSupport",
  "nonGoals",
]);

/** Declared brief fields (excludes `$schema`) — for tooling such as `mfg app negotiate`. */
export function verticalBriefDeclaredKeys(): string[] {
  return [...ALLOWED_KEYS].filter((k) => k !== "$schema").sort();
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function assertStringArray(v: unknown, field: string, ctx: string): asserts v is string[] {
  if (!Array.isArray(v)) {
    throw new Error(`${ctx}: "${field}" must be an array of strings`);
  }
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== "string") {
      throw new Error(`${ctx}: "${field}[${i}]" must be a string`);
    }
  }
}

function assertOptionalString(v: unknown, field: string, ctx: string): void {
  if (v === undefined) return;
  if (typeof v !== "string") {
    throw new Error(`${ctx}: "${field}" must be a string when present`);
  }
}

function assertOptionalObject(v: unknown, field: string, ctx: string): void {
  if (v === undefined) return;
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`${ctx}: "${field}" must be an object when present`);
  }
}

/**
 * Throws with a clear message if the object is not a valid VerticalConfig.
 */
export function validateVerticalConfigObject(raw: unknown, contextLabel: string): VerticalConfig {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${contextLabel}: expected a JSON object`);
  }

  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(
        `${contextLabel}: unknown key "${key}". Allowed: ${[...ALLOWED_KEYS].filter((k) => k !== "$schema").join(", ")}`,
      );
    }
  }

  if (!isNonEmptyString(o.vertical)) {
    throw new Error(`${contextLabel}: "vertical" must be a non-empty string`);
  }
  if (!VERTICAL_ID.test(o.vertical.trim())) {
    throw new Error(`${contextLabel}: "vertical" must match /^[a-z][a-z0-9-]*$/ (got "${o.vertical}")`);
  }

  if (!isNonEmptyString(o.displayName)) {
    throw new Error(`${contextLabel}: "displayName" must be a non-empty string`);
  }

  assertOptionalString(o.summary, "summary", contextLabel);
  assertOptionalString(o.positioning, "positioning", contextLabel);
  assertOptionalString(o.primaryUser, "primaryUser", contextLabel);
  assertOptionalString(o.billingModel, "billingModel", contextLabel);
  assertOptionalString(o.mvpScopeHint, "mvpScopeHint", contextLabel);
  assertOptionalString(o.tenancy, "tenancy", contextLabel);
  assertOptionalString(o.identity, "identity", contextLabel);
  assertOptionalString(o.dataClassification, "dataClassification", contextLabel);
  assertOptionalString(o.slaAndSupport, "slaAndSupport", contextLabel);
  assertOptionalObject(o.productSpec, "productSpec", contextLabel);
  assertOptionalObject(o.businessModel, "businessModel", contextLabel);
  assertOptionalObject(o.systemConstraints, "systemConstraints", contextLabel);
  assertOptionalObject(o.integrationPlan, "integrationPlan", contextLabel);

  if (o.secondaryUsers !== undefined) {
    assertStringArray(o.secondaryUsers, "secondaryUsers", contextLabel);
  }
  if (o.regions !== undefined) {
    assertStringArray(o.regions, "regions", contextLabel);
  }
  if (o.compliance !== undefined) {
    assertStringArray(o.compliance, "compliance", contextLabel);
  }
  if (o.integrationsWishlist !== undefined) {
    assertStringArray(o.integrationsWishlist, "integrationsWishlist", contextLabel);
  }
  if (o.nonGoals !== undefined) {
    assertStringArray(o.nonGoals, "nonGoals", contextLabel);
  }

  return o as VerticalConfig;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function validateAllVerticalConfigsInRepo(): Promise<void> {
  const appsRoot = configsAppsRoot(repoRoot);
  if (!(await fileExists(appsRoot))) {
    console.log("OK: no configs/apps/ yet — nothing to validate.");
    return;
  }

  const entries = await readdir(appsRoot, { withFileTypes: true });
  const errors: string[] = [];

  for (const d of entries) {
    if (!d.isDirectory()) continue;
    const slug = d.name;
    if (!VERTICAL_ID.test(slug)) {
      errors.push(`configs/apps/${slug}: directory name must match vertical id pattern ^[a-z][a-z0-9-]*$`);
      continue;
    }
    const full = verticalBriefPath(repoRoot, slug);
    const label = path.relative(repoRoot, full);
    if (!(await fileExists(full))) {
      errors.push(`configs/apps/${slug}: missing vertical brief ${slug}.json (expected ${label})`);
      continue;
    }
    try {
      const raw = JSON.parse(await readFile(full, "utf8")) as unknown;
      const config = validateVerticalConfigObject(raw, label);
      if (config.vertical !== slug) {
        throw new Error(`${label}: "vertical" "${config.vertical}" must match parent folder "${slug}"`);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (errors.length > 0) {
    throw new Error(`Vertical config validation failed:\n${errors.join("\n")}`);
  }
}

async function main(): Promise<void> {
  await validateAllVerticalConfigsInRepo();
  console.log("OK: all configs/apps/<slug>/<slug>.json vertical briefs validate.");
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

