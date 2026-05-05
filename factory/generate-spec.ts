import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

export type VerticalConfig = {
  vertical: string;
  displayName: string;
  summary?: string;
  positioning?: string;
  primaryUser?: string;
  secondaryUsers?: string[];
  regions?: string[];
  compliance?: string[];
  billingModel?: string;
  integrationsWishlist?: string[];
  mvpScopeHint?: string;
};

function listJoin(value: string[] | undefined, fallback: string): string {
  if (!value?.length) return fallback;
  return value.join(", ");
}

function withDefaults(config: VerticalConfig): Record<string, string> {
  const vertical = config.vertical;
  const displayName = config.displayName;
  return {
    vertical,
    displayName,
    summary:
      config.summary ??
      `B2B SaaS for ${displayName} businesses to run operations, billing, and customer-facing workflows on a shared factory stack.`,
    positioning:
      config.positioning ??
      `Vertical-specific instance on the shared core-saas engine, tuned for ${displayName} workflows and compliance context.`,
    primaryUser: config.primaryUser ?? "Owner / operations lead",
    secondaryUsersList: listJoin(
      config.secondaryUsers,
      "Staff members with role-limited access (configure per vertical)",
    ),
    regionsList: listJoin(config.regions, "Primary market TBD — default US English"),
    complianceList: listJoin(
      config.compliance,
      "General commercial SaaS — confirm with legal for sector-specific rules",
    ),
    billingModel:
      config.billingModel ??
      "Stripe subscriptions; per-seat or tiered plans — finalize in spec",
    integrationsList: listJoin(
      config.integrationsWishlist,
      "Email/notifications, calendar, accounting export — prioritize in MVP section",
    ),
    mvpScopeHint:
      config.mvpScopeHint ??
      "Ship a credible MVP: auth + org tenancy, core vertical objects, Stripe for one paid plan, admin basics, audit-friendly logs.",
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
  const configPath = path.join(repoRoot, "configs", `${verticalId}.json`);
  const raw = await readFile(configPath, "utf8");
  const config = JSON.parse(raw) as VerticalConfig;
  if (!config.vertical || !config.displayName) {
    throw new Error(`configs/${verticalId}.json must include "vertical" and "displayName"`);
  }
  if (config.vertical !== verticalId) {
    throw new Error(`Config vertical "${config.vertical}" does not match filename "${verticalId}.json"`);
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
    `\`specs/${verticalId}-spec.md\``,
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
  const outDir = path.join(repoRoot, "specs", "_generated");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${verticalId}-SPEC-PROMPT.md`);
  await writeFile(outFile, body, "utf8");
  console.log(`Wrote ${path.relative(repoRoot, outFile)}`);
  console.log(
    `Next: open that file in Cursor, @-reference it in chat, and ask the agent to write specs/${verticalId}-spec.md per the embedded rules.`,
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
    console.error('Usage: npm run generate-spec -- <verticalId>   e.g. dentist');
    console.error("   or: npx tsx factory/generate-spec.ts --vertical=plumber");
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
