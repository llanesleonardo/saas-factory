/**
 * Interactive wizard: writes configs/apps/<slug>/business-needs.json — product intent, commercial model,
 * integrations, and narrative (problem, goals, success criteria) in one JSON bundle.
 *
 * Usage:
 *   npm run mfg -- app bn -- <appSlug>
 *   npm run mfg -- app bn -- <appSlug> --defaults
 *   npm run mfg -- app bn -- <appSlug> --defaults --force
 *   npm run mfg -- app bn -- <appSlug> --show
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { input, select } from "@inquirer/prompts";

import {
  BUSINESS_NEEDS_SCHEMA_REF,
  businessNeedsPath,
} from "../../../factory_libs/paths/app-config-paths.js";
import type { BusinessNeedsDoc } from "../../../factory_libs/product/business-needs-types.js";
import { displayNameFromVertical } from "./new-vertical-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

const SLUG = /^[a-z][a-z0-9-]*$/;

function parseSemicolonList(raw: string): string[] {
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listPromptDefault(arr: string[]): string {
  return arr.join("; ");
}

function parseCli(): {
  appSlug?: string;
  defaultsOnly: boolean;
  force: boolean;
  show: boolean;
  help: boolean;
} {
  const slice = process.argv.slice(2);
  const defaultsOnly = slice.includes("--defaults");
  const force = slice.includes("--force");
  const show = slice.includes("--show");
  const help = slice.includes("--help") || slice.includes("-h");
  const rest = slice.filter(
    (a) =>
      a !== "--defaults" &&
      a !== "--force" &&
      a !== "--show" &&
      a !== "--help" &&
      a !== "-h" &&
      a !== "--" &&
      !a.includes("app-business-needs"),
  );
  const fromFlag = rest.find((a) => a.startsWith("--app="))?.split("=")[1]?.trim();
  const positional = rest.find((a) => !a.startsWith("--"))?.trim();
  const appSlug = fromFlag || positional || undefined;
  return { appSlug, defaultsOnly, force, show, help };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function validateBusinessNeedsDoc(raw: unknown, contextLabel: string): BusinessNeedsDoc {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${contextLabel}: root must be an object`);
  }
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) {
    throw new Error(`${contextLabel}: schemaVersion must be 1`);
  }
  if (typeof o.appSlug !== "string" || !SLUG.test(o.appSlug)) {
    throw new Error(`${contextLabel}: appSlug must match ^[a-z][a-z0-9-]*$`);
  }
  if (typeof o.displayName !== "string" || !o.displayName.trim()) {
    throw new Error(`${contextLabel}: displayName is required`);
  }
  if (typeof o.generatedAt !== "string") {
    throw new Error(`${contextLabel}: generatedAt must be a string`);
  }
  if (o.productSpec === null || typeof o.productSpec !== "object" || Array.isArray(o.productSpec)) {
    throw new Error(`${contextLabel}: productSpec must be an object`);
  }
  if (o.businessModel === null || typeof o.businessModel !== "object" || Array.isArray(o.businessModel)) {
    throw new Error(`${contextLabel}: businessModel must be an object`);
  }
  return raw as BusinessNeedsDoc;
}

function defaultBusinessNeeds(appSlug: string): BusinessNeedsDoc {
  const displayName = displayNameFromVertical(appSlug);
  return {
    schemaVersion: 1,
    appSlug,
    generatedAt: new Date().toISOString(),
    displayName,
    productSpec: {
      summary: `${displayName}: describe the customer problem and outcome in one sentence.`,
      positioning: `Differentiation vs alternatives for ${displayName}.`,
      primaryUser: "Team lead / business owner",
      secondaryUsers: ["Admin", "Member"],
      regions: ["US"],
      nonGoals: ["Native mobile apps v1", "Offline-first", "Self-hosted edition"],
    },
    businessModel: {
      billingModel:
        "Describe tiers (free/pro), Stripe posture, trials, and seat/workspace billing.",
      slaAndSupport: "Target availability and support channels (email, docs, SLA tier).",
    },
    integrationPlan: {
      integrations: {
        payments: "stripe",
        communication: "email",
        exports: ["csv"],
        sync: ["none"],
        notes: "Stripe Customer Portal + webhooks; transactional email for invites and receipts.",
      },
    },
    narrative: {
      problemStatement: "",
      goals: [],
      successCriteria: [],
      assumptions: [],
      risks: [],
    },
  };
}

async function loadExisting(p: string, appSlug: string): Promise<BusinessNeedsDoc> {
  const rawText = await readFile(p, "utf8");
  const raw: unknown = JSON.parse(rawText);
  const rel = path.relative(repoRoot, p);
  const doc = validateBusinessNeedsDoc(raw, rel);
  if (doc.appSlug !== appSlug) {
    throw new Error(`${rel}: appSlug is "${doc.appSlug}" but this run is for "${appSlug}".`);
  }
  return doc;
}

async function promptAll(seed: BusinessNeedsDoc): Promise<BusinessNeedsDoc> {
  const d = seed;

  const displayName = await input({
    message: "Display name (product title)",
    default: d.displayName,
  });

  const summary = await input({
    message: "Product summary (one-line value proposition)",
    default: d.productSpec.summary ?? "",
  });

  const positioning = await input({
    message: "Positioning (market / differentiation)",
    default: d.productSpec.positioning ?? "",
  });

  const primaryUser = await input({
    message: "Primary user (persona)",
    default: d.productSpec.primaryUser ?? "",
  });

  const secondaryUsersRaw = await input({
    message: "Secondary users (semicolon-separated)",
    default: listPromptDefault(d.productSpec.secondaryUsers ?? []),
  });

  const regionsRaw = await input({
    message: "Regions / markets (semicolon-separated)",
    default: listPromptDefault(d.productSpec.regions ?? []),
  });

  const nonGoalsRaw = await input({
    message: "Non-goals — explicit out-of-scope (semicolon-separated)",
    default: listPromptDefault(d.productSpec.nonGoals ?? []),
  });

  const billingModel = await input({
    message: "Billing model (tiers, Stripe, trials)",
    default: d.businessModel.billingModel ?? "",
  });

  const slaAndSupport = await input({
    message: "SLA & support posture",
    default: d.businessModel.slaAndSupport ?? "",
  });

  const payIntent = d.integrationPlan?.integrations?.payments ?? "stripe";
  const paymentsDefault: "stripe" | "none" = payIntent === "none" ? "none" : "stripe";
  const payments = await select({
    message: "Payments integration intent",
    choices: [
      { value: "stripe" as const, name: "Stripe" },
      { value: "none" as const, name: "None / later" },
    ],
    default: paymentsDefault,
  });

  const commIntent = d.integrationPlan?.integrations?.communication ?? "email";
  const communicationDefault: "email" | "none" = commIntent === "none" ? "none" : "email";
  const communication = await select({
    message: "Communication integration intent",
    choices: [
      { value: "email" as const, name: "Transactional email" },
      { value: "none" as const, name: "None / later" },
    ],
    default: communicationDefault,
  });

  const exportsRaw = await input({
    message: "Export formats desired (semicolon: csv, pdf, none)",
    default: listPromptDefault((d.integrationPlan?.integrations?.exports as string[]) ?? ["csv"]),
  });
  const exportsList = parseSemicolonList(exportsRaw).filter((x): x is "csv" | "pdf" | "none" =>
    ["csv", "pdf", "none"].includes(x),
  );

  const syncRaw = await input({
    message: "External sync (semicolon: calendar, crm, none)",
    default: listPromptDefault((d.integrationPlan?.integrations?.sync as string[]) ?? ["none"]),
  });
  const syncList = parseSemicolonList(syncRaw).filter((x): x is "calendar" | "crm" | "none" =>
    ["calendar", "crm", "none"].includes(x),
  );

  const integrationNotes = await input({
    message: "Integration notes (webhooks, portals, caveats)",
    default: d.integrationPlan?.integrations?.notes ?? "",
  });

  const problemStatement = await input({
    message: "Problem statement (why now / customer pain)",
    default: d.narrative?.problemStatement ?? "",
  });

  const goalsRaw = await input({
    message: "Business goals (semicolon-separated)",
    default: listPromptDefault(d.narrative?.goals ?? []),
  });

  const successRaw = await input({
    message: "Success criteria (semicolon-separated)",
    default: listPromptDefault(d.narrative?.successCriteria ?? []),
  });

  const assumptionsRaw = await input({
    message: "Assumptions (semicolon-separated)",
    default: listPromptDefault(d.narrative?.assumptions ?? []),
  });

  const risksRaw = await input({
    message: "Risks / unknowns (semicolon-separated)",
    default: listPromptDefault(d.narrative?.risks ?? []),
  });

  return {
    schemaVersion: 1,
    appSlug: d.appSlug,
    generatedAt: new Date().toISOString(),
    displayName: displayName.trim(),
    productSpec: {
      summary: summary.trim(),
      positioning: positioning.trim(),
      primaryUser: primaryUser.trim(),
      secondaryUsers: parseSemicolonList(secondaryUsersRaw),
      regions: parseSemicolonList(regionsRaw),
      nonGoals: parseSemicolonList(nonGoalsRaw),
    },
    businessModel: {
      billingModel: billingModel.trim(),
      slaAndSupport: slaAndSupport.trim(),
    },
    integrationPlan: {
      integrations: {
        payments,
        communication,
        exports: exportsList.length ? exportsList : ["none"],
        sync: syncList.length ? syncList : ["none"],
        notes: integrationNotes.trim(),
      },
    },
    narrative: {
      problemStatement: problemStatement.trim(),
      goals: parseSemicolonList(goalsRaw),
      successCriteria: parseSemicolonList(successRaw),
      assumptions: parseSemicolonList(assumptionsRaw),
      risks: parseSemicolonList(risksRaw),
    },
  };
}

function printHelp(): void {
  console.log(`mfg app bn — business needs bundle → configs/apps/<slug>/business-needs.json

Examples:
  npm run mfg -- app bn -- my-app
  npm run mfg -- app bn -- my-app --defaults
  npm run mfg -- app bn -- my-app --show

Combines productSpec, businessModel, integrationPlan, and narrative fields in one JSON file.
`);
}

async function main(): Promise<void> {
  const { appSlug: appArg, defaultsOnly, force, show, help } = parseCli();

  if (help) {
    printHelp();
    return;
  }

  if (defaultsOnly && !appArg) {
    console.error('With --defaults, pass an app slug: npm run mfg -- app bn -- my-app --defaults');
    process.exit(1);
  }

  if (!process.stdin.isTTY && !defaultsOnly && !show) {
    console.error(
      'No TTY attached. Use an interactive terminal, or: npm run mfg -- app bn -- <app> --defaults',
    );
    process.exit(1);
  }

  let appSlug = appArg?.trim();
  if (!appSlug) {
    appSlug = await input({
      message: "App slug (lowercase, hyphens; e.g. electrician)",
      validate: (v) => {
        const t = v.trim();
        if (!t) return "Required";
        if (!SLUG.test(t)) {
          return "Use ^[a-z][a-z0-9-]*$ (start with a letter)";
        }
        return true;
      },
    });
    appSlug = appSlug.trim();
  }

  if (!SLUG.test(appSlug)) {
    console.error(`Invalid app slug "${appSlug}"`);
    process.exit(1);
  }

  const outPath = businessNeedsPath(repoRoot, appSlug);
  const outRel = path.relative(repoRoot, outPath);

  if (show) {
    if (!(await fileExists(outPath))) {
      console.error(`No file at ${outRel}`);
      process.exit(1);
    }
    const raw = await readFile(outPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    validateBusinessNeedsDoc(parsed, outRel);
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  const exists = await fileExists(outPath);

  if (defaultsOnly && exists && !force) {
    console.error(
      `File already exists: ${outRel}\n` +
        "Re-run without --defaults to edit interactively, or add --force to replace with template defaults.",
    );
    process.exit(1);
  }

  const displaySeed = displayNameFromVertical(appSlug);
  let doc: BusinessNeedsDoc;

  if (defaultsOnly) {
    doc = defaultBusinessNeeds(appSlug);
  } else {
    const seed = exists ? await loadExisting(outPath, appSlug) : defaultBusinessNeeds(appSlug);
    if (!exists) {
      seed.displayName = displaySeed;
    }
    if (exists) {
      console.log(`\nExisting business-needs loaded (${outRel}). Prompts show current values — saving replaces the file.\n`);
    } else {
      console.log("\nNew business-needs bundle — one JSON for product, commercial, integrations, narrative.\n");
    }
    doc = await promptAll(seed);
  }

  validateBusinessNeedsDoc(doc, outRel);

  await mkdir(path.dirname(outPath), { recursive: true });
  const fileDoc = {
    $schema: BUSINESS_NEEDS_SCHEMA_REF,
    ...doc,
  };
  await writeFile(outPath, `${JSON.stringify(fileDoc, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${outRel}`);
  console.log(`Next: align configs/apps/${appSlug}/${appSlug}.json (mfg app new) or attach this file in discovery (mfg app negotiate).`);
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
