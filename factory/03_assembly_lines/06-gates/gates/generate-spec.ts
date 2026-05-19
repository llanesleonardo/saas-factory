import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { verticalBriefPath } from "../../../factory_libs/paths/app-config-paths.js";
import type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";
import { validateVerticalConfigObject } from "../validation/validate-vertical-config.js";

export type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

function listJoin(value: string[] | undefined, fallback: string): string {
  if (!value?.length) return fallback;
  return value.join(", ");
}

function withDefaults(config: VerticalConfig): Record<string, string> {
  const vertical = config.vertical;
  const displayName = config.displayName;

  const product = config.productSpec ?? {};
  const business = config.businessModel ?? {};
  const constraints = config.systemConstraints ?? {};
  const integration = config.integrationPlan ?? {};

  const compliance = constraints.compliance ?? config.compliance;
  const billingModel = business.billingModel ?? config.billingModel;
  const slaAndSupport = business.slaAndSupport ?? config.slaAndSupport;
  const summary = product.summary ?? config.summary;
  const positioning = product.positioning ?? config.positioning;
  const primaryUser = product.primaryUser ?? config.primaryUser;
  const secondaryUsers = product.secondaryUsers ?? config.secondaryUsers;
  const regions = product.regions ?? config.regions;
  const nonGoals = product.nonGoals ?? config.nonGoals;

  const legacyIntegrations = config.integrationsWishlist;
  const plannedIntegrations = integration.integrations
    ? Object.entries(integration.integrations)
        .filter(([k]) => k !== "notes")
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    : undefined;

  return {
    vertical,
    displayName,
    summary:
      summary ??
      `B2B SaaS for ${displayName} businesses to run operations, billing, and customer-facing workflows on a shared factory stack.`,
    positioning:
      positioning ??
      `Vertical-specific instance on the shared core-saas engine, tuned for ${displayName} workflows and compliance context.`,
    primaryUser: primaryUser ?? "Owner / operations lead",
    secondaryUsersList: listJoin(
      secondaryUsers,
      "Staff members with role-limited access (configure per vertical)",
    ),
    regionsList: listJoin(regions, "Primary market TBD — default US English"),
    complianceList: listJoin(
      compliance,
      "General commercial SaaS — confirm with legal for sector-specific rules",
    ),
    billingModel:
      billingModel ??
      "Stripe subscriptions; per-seat or tiered plans — finalize in spec",
    integrationsList: listJoin(
      plannedIntegrations ?? legacyIntegrations,
      "Email/notifications, calendar, accounting export — prioritize in MVP section",
    ),
    mvpScopeHint:
      config.systemConstraints?.mvpScope
        ? JSON.stringify(config.systemConstraints.mvpScope, null, 2)
        : config.mvpScopeHint ??
      "Ship a credible MVP: auth + org tenancy, core vertical objects, Stripe for one paid plan, admin basics, audit-friendly logs.",
    tenancy:
      config.systemConstraints?.tenancy
        ? JSON.stringify(config.systemConstraints.tenancy, null, 2)
        : config.tenancy ??
      "Define in spec: single-user accounts vs shared workspace vs full org hierarchy; align with apps/<vertical>/<vertical>-instance and packages/auth.",
    identity:
      config.systemConstraints?.identity
        ? JSON.stringify(
            {
              identity: config.systemConstraints.identity,
              identityRoadmap: config.systemConstraints.identityRoadmap,
            },
            null,
            2,
          )
        : config.identity ??
      "Specify IdPs (email, SSO later), session model, invites, MFA policy — tie to packages/auth when monorepo-integrated.",
    dataClassification:
      config.systemConstraints?.dataClassification ??
      config.dataClassification ??
      "Classify todo/content data (non-regulated default); document retention, export/delete, and subprocessors before launch.",
    slaAndSupport:
      slaAndSupport ??
      "Document target availability, support channels, and incident response for paying customers.",
    nonGoalsList: listJoin(
      nonGoals,
      "Add at least three explicit non-goals for MVP (see §11 in generated outline).",
    ),
  };
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(val);
  }
  const leftover = [...out.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((m) => m[1]);
  if (leftover.length) {
    throw new Error(`Template has unknown placeholders: ${[...new Set(leftover)].join(", ")}`);
  }
  return out;
}

export async function generateSpecPrompt(verticalId: string): Promise<string> {
  const configPath = verticalBriefPath(repoRoot, verticalId);
  const raw = await readFile(configPath, "utf8");
  const relativeConfigPath = path.relative(repoRoot, configPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Invalid JSON: ${relativeConfigPath}`);
  }
  const config = validateVerticalConfigObject(parsed, relativeConfigPath);
  if (config.vertical !== verticalId) {
    throw new Error(
      `Config vertical "${config.vertical}" does not match app folder / filename "${verticalId}" (${relativeConfigPath})`,
    );
  }

  const templatePath = path.join(repoRoot, "templates", "vertical-saas-spec.template.md");
  const agentPath = path.join(repoRoot, "agents", "spec-generator-agent.md");

  const [templateRaw, agentRaw] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(agentPath, "utf8"),
  ]);

  const filled = fillTemplate(templateRaw, withDefaults(config));
  const stamp = new Date().toISOString();

  return [
    `<!-- Auto-assembled by factory/generate-spec.ts at ${stamp} -->`,
    "",
    "# Cursor task: generate full vertical spec",
    "",
    "Follow **Spec Generator Agent** rules below, then write the completed document to:",
    "",
    `\`configs/apps/${verticalId}/specs/${verticalId}-spec.md\``,
    "",
    "---",
    "",
    agentRaw.trimEnd(),
    "",
    "---",
    "",
    "## Embedded vertical config (source of truth)",
    "",
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    "",
    "---",
    "",
    "## Starting outline (placeholders already substituted where possible)",
    "",
    "Expand every section into implementation-ready prose. Remove instructional lines that duplicate this header block.",
    "",
    filled.trimEnd(),
    "",
  ].join("\n");
}

async function main(verticalId: string): Promise<void> {
  const body = await generateSpecPrompt(verticalId);
  const outDir = path.join(repoRoot, "configs", "apps", verticalId, "specs", "_generated");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${verticalId}-SPEC-PROMPT.md`);
  await writeFile(outFile, body, "utf8");
  console.log(`Wrote ${path.relative(repoRoot, outFile)}`);
  console.log(
    `Next: open that file in Cursor, @-reference it in chat, and ask the agent to write configs/apps/${verticalId}/specs/${verticalId}-spec.md per the embedded rules.`,
  );
}

function cliArgs(): string[] {
  const slice = process.argv.slice(2);
  const scriptIdx = slice.findIndex((a) => a.includes("generate-spec"));
  return scriptIdx >= 0 ? slice.slice(scriptIdx + 1) : slice;
}

function parseVerticalArg(): string {
  const args = cliArgs().filter((a) => a !== "--");
  const fromFlag = args.find((a) => a.startsWith("--vertical="))?.split("=")[1];
  const positional = args.find((a) => !a.startsWith("--"));
  const v = fromFlag ?? positional;
  if (!v) {
    console.error("Usage: npm run mfg -- spec <verticalId>   e.g. todo");
    console.error("   or: npm run mfg -- spec generate todo");
    console.error("   reads: configs/apps/<verticalId>/<verticalId>.json");
    console.error("   or: npx tsx factory/03_assembly_lines/06-gates/gates/generate-spec.ts --vertical=todo");
    return "";
  }
  return v.trim();
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void (async () => {
    const vertical = parseVerticalArg();
    if (!vertical) {
      process.exit(1);
    }
    await main(vertical);
  })().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
