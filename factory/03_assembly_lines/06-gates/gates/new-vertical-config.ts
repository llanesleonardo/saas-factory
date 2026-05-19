/**
 * Interactive wizard: creates or replaces configs/apps/<vertical>/<vertical>.json (same shape as todo app brief).
 * Safe to re-run: an existing file pre-fills every prompt so you can edit and save again.
 * Press Enter on each prompt to keep the current value.
 *
 * Usage:
 *   npm run mfg -- app new
 *   npm run mfg -- app new -- <verticalId>
 *   npm run mfg -- app new -- <verticalId> --defaults           # write template defaults (new file only)
 *   npm run mfg -- app new -- <verticalId> --defaults --force   # replace existing with template defaults
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { input } from "@inquirer/prompts";

import { VERTICAL_BRIEF_SCHEMA_REF, verticalBriefPath } from "../../../factory_libs/paths/app-config-paths.js";
import type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";
import { validateVerticalConfigObject } from "../validation/validate-vertical-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo root: …/factory/03_assembly_lines/06-gates/gates → four levels up. */
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

const VERTICAL_ID = /^[a-z][a-z0-9-]*$/;

export function displayNameFromVertical(vertical: string): string {
  return vertical
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Full brief template — same keys / shape as configs/apps/todo/todo.json (values parameterized). */
export function defaultVerticalBrief(vertical: string, displayName: string): VerticalConfig {
  return {
    vertical,
    displayName,
    summary: `${displayName}: team workflows, roles, billing, and exports — vertical on the SaaS Factory stack.`,
    positioning: `Self-serve B2B SaaS for teams adopting ${displayName}; integrates with shared core-saas when you choose HTTP-integrated mode.`,
    primaryUser: "Team lead / business owner",
    secondaryUsers: ["Project admin", "Member", "Guest (read-only)"],
    regions: ["US", "EU (English v1)"],
    compliance: [
      "GDPR-style export/delete on request (EU users)",
      `No HIPAA in default ${displayName} content — card data only via Stripe hosted surfaces`,
      "SOC 2 not required for MVP; document roadmap if selling enterprise",
    ],
    billingModel:
      "Freemium: 1 project, max 2 users (no charge). Pro: Stripe per user per month; unlimited projects. Customer Portal for upgrade/cancel; optional 14-day Pro trial.",
    integrationsWishlist: [
      "Stripe Customer Portal + webhooks",
      "Transactional email (invites, billing receipts)",
      "CSV export",
      "Calendar sync — Phase 2",
    ],
    mvpScopeHint: `MVP: email/password auth; projects as isolation boundary; Free = 1 project / 2 users, Pro = unlimited projects + Stripe seat billing; roles (admin/member/guest); CRUD core entities for ${displayName}; audit log on membership changes; REST API for future HTTP-integrated instances.`,
    tenancy: `Data scoped per project (workspace for billing): users may belong to multiple projects. Free tier: 1 project, 2 users. Pro: unlimited projects, per-user/month billing. Guest is project-bound read-only. Row-level isolation by project_id.`,
    identity:
      "Email + password v1; verified email before inviting others. MFA optional post-MVP. SSO/SAML later — not MVP.",
    dataClassification: `${displayName} content is user-provided customer data under your DPA. Encrypt at rest (cloud defaults); secrets in env/Key Vault. Retention: soft-delete + admin-configurable purge window (default 30 days).`,
    slaAndSupport:
      "Target 99.5% monthly API availability for paid tiers; status page TBD. Support: email + docs; no phone SLA in MVP.",
    nonGoals: [
      "Native iOS/Android apps",
      "Offline-first / local-only sync",
      "Built-in chat or video",
      "Full ERP / field-service suite in v1",
      "Self-hosted / on-prem edition",
    ],
  };
}

function parseSemicolonList(raw: string): string[] {
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listPromptDefault(arr: string[]): string {
  return arr.join("; ");
}

type Cli = { vertical?: string; defaultsOnly: boolean; force: boolean };

function parseCli(): Cli {
  const slice = process.argv.slice(2);
  const defaultsOnly = slice.includes("--defaults");
  const force = slice.includes("--force");
  const rest = slice.filter(
    (a) =>
      a !== "--defaults" &&
      a !== "--force" &&
      a !== "--" &&
      !a.includes("new-vertical-config"),
  );
  const fromFlag = rest.find((a) => a.startsWith("--vertical="))?.split("=")[1]?.trim();
  const positional = rest.find((a) => !a.startsWith("--"))?.trim();
  const vertical = fromFlag || positional || undefined;
  return { vertical, defaultsOnly, force };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function promptBrief(vertical: string, seed: VerticalConfig): Promise<VerticalConfig> {
  const d = seed;

  const displayName = await input({
    message: "Display name (product title)",
    default: d.displayName,
  });

  const summary = await input({
    message: "Summary (one-line value prop)",
    default: d.summary!,
  });

  const positioning = await input({
    message: "Positioning (market / differentiation)",
    default: d.positioning!,
  });

  const primaryUser = await input({
    message: "Primary user (persona label)",
    default: d.primaryUser!,
  });

  const secondaryUsersRaw = await input({
    message: "Secondary users (semicolon-separated)",
    default: listPromptDefault(d.secondaryUsers!),
  });
  const secondaryUsers = parseSemicolonList(secondaryUsersRaw);

  const regionsRaw = await input({
    message: "Regions (semicolon-separated)",
    default: listPromptDefault(d.regions!),
  });
  const regions = parseSemicolonList(regionsRaw);

  const complianceRaw = await input({
    message: "Compliance bullets (semicolon-separated)",
    default: listPromptDefault(d.compliance!),
  });
  const compliance = parseSemicolonList(complianceRaw);

  const billingModel = await input({
    message: "Billing model",
    default: d.billingModel!,
  });

  const integrationsRaw = await input({
    message: "Integrations wishlist (semicolon-separated)",
    default: listPromptDefault(d.integrationsWishlist!),
  });
  const integrationsWishlist = parseSemicolonList(integrationsRaw);

  const mvpScopeHint = await input({
    message: "MVP scope hint",
    default: d.mvpScopeHint!,
  });

  const tenancy = await input({
    message: "Tenancy (isolation / limits)",
    default: d.tenancy!,
  });

  const identity = await input({
    message: "Identity (auth, MFA, invites)",
    default: d.identity!,
  });

  const dataClassification = await input({
    message: "Data classification (PII, retention, secrets)",
    default: d.dataClassification!,
  });

  const slaAndSupport = await input({
    message: "SLA & support posture",
    default: d.slaAndSupport!,
  });

  const nonGoalsRaw = await input({
    message: "Non-goals (semicolon-separated; explicit MVP exclusions)",
    default: listPromptDefault(d.nonGoals!),
  });
  const nonGoals = parseSemicolonList(nonGoalsRaw);

  return {
    vertical,
    displayName,
    summary,
    positioning,
    primaryUser,
    secondaryUsers,
    regions,
    compliance,
    billingModel,
    integrationsWishlist,
    mvpScopeHint,
    tenancy,
    identity,
    dataClassification,
    slaAndSupport,
    nonGoals,
  };
}

function writeConfigFile(outPath: string, brief: VerticalConfig): Promise<void> {
  const doc = {
    $schema: VERTICAL_BRIEF_SCHEMA_REF,
    ...brief,
  };
  return writeFile(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

async function loadExistingBrief(outPath: string, vertical: string): Promise<VerticalConfig> {
  const rawText = await readFile(outPath, "utf8");
  const raw: unknown = JSON.parse(rawText);
  const rel = path.relative(repoRoot, outPath);
  const o = validateVerticalConfigObject(raw, rel);
  if (o.vertical !== vertical) {
    throw new Error(`${rel}: "vertical" is "${o.vertical}" but this run is for "${vertical}".`);
  }
  return o;
}

async function main(): Promise<void> {
  const { vertical: verticalArg, defaultsOnly, force } = parseCli();

  if (defaultsOnly && !verticalArg) {
    console.error("With --defaults, pass a vertical id: npm run mfg -- app new -- my-app --defaults");
    process.exit(1);
  }

  if (!process.stdin.isTTY && !defaultsOnly) {
    console.error(
      "No TTY attached. Use an interactive terminal, or: npm run mfg -- app new -- <vertical> --defaults",
    );
    process.exit(1);
  }

  let vertical = verticalArg?.trim();
  if (!vertical) {
    vertical = await input({
      message: "Vertical id (lowercase, hyphens ok; must match filename, e.g. electrician)",
      validate: (v) => {
        const t = v.trim();
        if (!t) return "Required";
        if (!VERTICAL_ID.test(t)) {
          return "Use ^[a-z][a-z0-9-]*$ (start with a letter)";
        }
        return true;
      },
    });
    vertical = vertical.trim();
  }

  if (!VERTICAL_ID.test(vertical)) {
    console.error(
      `Invalid vertical id "${vertical}". Use lowercase letters, digits, hyphens; must start with a letter.`,
    );
    process.exit(1);
  }

  const outPath = verticalBriefPath(repoRoot, vertical);
  const outRel = path.relative(repoRoot, outPath);
  const exists = await fileExists(outPath);

  if (defaultsOnly && exists && !force) {
    console.error(
      `File already exists: ${outRel}\n` +
        "Re-run without --defaults to edit values interactively (current file pre-fills prompts), or add --force to replace with template defaults.",
    );
    process.exit(1);
  }

  const displayNameSeed = displayNameFromVertical(vertical);
  let brief: VerticalConfig;

  if (defaultsOnly) {
    brief = defaultVerticalBrief(vertical, displayNameSeed);
  } else {
    const seed = exists ? await loadExistingBrief(outPath, vertical) : defaultVerticalBrief(vertical, displayNameSeed);
    if (exists) {
      console.log(
        `\nExisting brief loaded (${outRel}). Prompts show current values — saving replaces the file.\n`,
      );
    } else {
      console.log("\nNew vertical config — same fields as configs/apps/todo/todo.json. Press Enter to accept each default.\n");
    }
    brief = await promptBrief(vertical, seed);
  }

  validateVerticalConfigObject({ $schema: VERTICAL_BRIEF_SCHEMA_REF, ...brief }, outRel);

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeConfigFile(outPath, brief);
  console.log(`\nWrote ${outRel}`);
  console.log("Next: npm run mfg -- validate apps && npm run mfg -- spec generate " + vertical);
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
