/**
 * Quote bundle — aggregates vertical brief, business-needs, stack, SaaS alignment, and manufacturing tier
 * (verified registry vs first manufacture vs returning unverified) for a future pricing engine.
 *
 * Usage:
 *   npm run mfg -- app quote -- <appSlug>
 *   npm run mfg -- app quote -- <appSlug> --json
 *   npm run mfg -- app quote -- <appSlug> --strict   # forward --strict to app saas subprocess
 *
 * (CLI uses spaces: `app quote`, not `app:quote`.)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AppQuoteBundle, ManufacturingTier } from "../../../factory_libs/commerce/app-quote-types.js";
import {
  appStackPath,
  businessNeedsPath,
  verticalBriefPath,
} from "../../../factory_libs/paths/app-config-paths.js";
import type { SaaSAppBlueprint } from "./app-blueprint-config.js";
import { isValidBlueprint } from "./app-blueprint-config.js";
import type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

const VERIFIED_REGISTRY_REL = "factory/03_assembly_lines/03-registry/registry/verified-apps.json";
const SLUG = /^[a-z][a-z0-9-]*$/;

type VerifiedRegistry = {
  schema_version: 1;
  apps: Array<{ slug: string; verifiedAt: string; notes?: string }>;
};

function parseCli(argv: string[]): { slug?: string; json: boolean; strict: boolean; help: boolean } {
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");
  const help = argv.includes("--help") || argv.includes("-h");
  const rest = argv.filter(
    (a) =>
      a !== "--json" &&
      a !== "--strict" &&
      a !== "--help" &&
      a !== "-h" &&
      a !== "--" &&
      !a.includes("app-quote"),
  );
  const slug = rest.find((a) => !a.startsWith("--"))?.trim();
  return { slug, json, strict, help };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function instanceDir(slug: string): string {
  // Prefer new nested layout (apps/<slug>/<slug>-instance); fall back to legacy
  // flat (apps/<slug>-instance) so older slugs still produce a valid quote.
  const nested = path.join(repoRoot, "apps", slug, `${slug}-instance`);
  const legacy = path.join(repoRoot, "apps", `${slug}-instance`);
  return existsSync(nested) ? nested : legacy;
}

async function loadVerifiedRegistry(): Promise<VerifiedRegistry | null> {
  const p = path.join(repoRoot, VERIFIED_REGISTRY_REL);
  if (!(await pathExists(p))) return null;
  try {
    const raw = JSON.parse(await readFile(p, "utf8")) as unknown;
    if (typeof raw !== "object" || raw === null || !("apps" in raw)) return null;
    return raw as VerifiedRegistry;
  } catch {
    return null;
  }
}

function runSaasAlignJson(slug: string, strict: boolean): { ok: boolean; errorCount: number; warnCount: number } | null {
  const script = "factory/03_assembly_lines/06-gates/gates/app-saas-align.ts";
  const args = ["tsx", script, "--", slug, "--json"];
  if (strict) args.push("--strict");
  const r = spawnSync("npx", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const out = r.stdout?.trim();
  if (!out) return null;
  try {
    const j = JSON.parse(out) as {
      ok?: boolean;
      errorCount?: number;
      warnCount?: number;
    };
    return {
      ok: Boolean(j.ok),
      errorCount: typeof j.errorCount === "number" ? j.errorCount : 0,
      warnCount: typeof j.warnCount === "number" ? j.warnCount : 0,
    };
  } catch {
    return null;
  }
}

function resolveTier(params: {
  onVerified: boolean;
  scaffolded: boolean;
}): { tier: ManufacturingTier; firstManufacture: boolean } {
  if (params.onVerified) {
    return { tier: "verified-repeat", firstManufacture: false };
  }
  if (!params.scaffolded) {
    return { tier: "first-manufacture", firstManufacture: true };
  }
  return { tier: "unverified-returning", firstManufacture: false };
}

function printHelp(): void {
  console.log(`mfg app quote — bundle configs + SaaS alignment + manufacturing tier for quoting (pricing engine later)

Examples:
  npm run mfg -- app quote -- todo
  npm run mfg -- app quote -- todo --json
  npm run mfg -- app quote -- todo --strict

Manufacturing tier:
  verified-repeat       On factory/03_assembly_lines/03-registry/registry/verified-apps.json
  first-manufacture     Not verified yet and apps/<slug>/<slug>-instance missing (greenfield)
  unverified-returning  Not verified yet but instance folder exists (work in progress)

Output schema: factory/factory_schemas/app-quote.schema.json
`);
}

async function buildBundle(slug: string, strict: boolean): Promise<AppQuoteBundle> {
  const briefPath = verticalBriefPath(repoRoot, slug);
  const bnPath = businessNeedsPath(repoRoot, slug);
  const stackPath = appStackPath(repoRoot, slug);
  const briefRel = path.relative(repoRoot, briefPath);
  const bnRel = path.relative(repoRoot, bnPath);
  const stackRel = path.relative(repoRoot, stackPath);

  const hasBrief = await pathExists(briefPath);
  const hasBn = await pathExists(bnPath);
  const hasStack = await pathExists(stackPath);
  const scaffolded = await pathExists(instanceDir(slug));

  const reg = await loadVerifiedRegistry();
  const verifiedEntry = reg?.apps?.find((a) => a.slug === slug);
  const onVerified = Boolean(verifiedEntry);
  const { tier, firstManufacture } = resolveTier({ onVerified, scaffolded });

  let briefSummary: AppQuoteBundle["briefSummary"];
  if (hasBrief) {
    try {
      const raw = JSON.parse(await readFile(briefPath, "utf8")) as unknown;
      const b = raw as VerticalConfig;
      briefSummary = {
        displayName: b.displayName,
        summaryOneLiner: (b.productSpec?.summary ?? b.summary)?.trim(),
        billingModelSnippet: (b.businessModel?.billingModel ?? b.billingModel)?.trim(),
      };
    } catch {
      briefSummary = undefined;
    }
  }

  let businessNeedsSummary: AppQuoteBundle["businessNeedsSummary"];
  if (hasBn) {
    try {
      const raw = JSON.parse(await readFile(bnPath, "utf8")) as Record<string, unknown>;
      const ps = raw.productSpec as Record<string, unknown> | undefined;
      const bm = raw.businessModel as Record<string, unknown> | undefined;
      const ip = raw.integrationPlan as { integrations?: { payments?: string } } | undefined;
      businessNeedsSummary = {
        displayName: typeof raw.displayName === "string" ? raw.displayName : undefined,
        billingModelSnippet: typeof bm?.billingModel === "string" ? bm.billingModel : undefined,
        paymentsIntent: ip?.integrations?.payments,
      };
    } catch {
      businessNeedsSummary = undefined;
    }
  }

  let stackSummary: AppQuoteBundle["stackSummary"];
  if (hasStack) {
    try {
      const raw = JSON.parse(await readFile(stackPath, "utf8")) as unknown;
      if (isValidBlueprint(raw)) {
        const bp = raw as SaaSAppBlueprint;
        stackSummary = {
          integrationMode: bp.integrationMode,
          frontendStack: bp.frontend?.stack,
          backendRuntime: bp.backend?.runtime,
          database: bp.database,
          redis: bp.redis,
          cicd: bp.cicd,
          observability: bp.observability,
        };
      }
    } catch {
      stackSummary = undefined;
    }
  }

  const saasAlignment = runSaasAlignJson(slug, strict);

  const bundle: AppQuoteBundle = {
    quoteVersion: 1,
    appSlug: slug,
    generatedAt: new Date().toISOString(),
    manufacturing: {
      tier,
      onVerifiedRegistry: onVerified,
      verifiedAt: verifiedEntry?.verifiedAt,
      firstManufacture,
      scaffoldedInstancePresent: scaffolded,
    },
    artifacts: {
      verticalBrief: { relativePath: briefRel, present: hasBrief },
      businessNeeds: { relativePath: bnRel, present: hasBn },
      appStack: { relativePath: stackRel, present: hasStack },
    },
    briefSummary,
    businessNeedsSummary,
    stackSummary,
    saasAlignment: saasAlignment ?? undefined,
    pricing: {
      engine: "placeholder",
      message:
        "Pricing rules not wired yet — this bundle is the contract for a future quote engine (tier + stack + alignment signals).",
    },
  };

  return bundle;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { slug, json, strict, help } = parseCli(argv);

  if (help) {
    printHelp();
    return;
  }

  if (!slug || !SLUG.test(slug)) {
    console.error('Usage: npm run mfg -- app quote -- <appSlug> [--json] [--strict]');
    process.exit(1);
  }

  const bundle = await buildBundle(slug, strict);

  if (json) {
    console.log(JSON.stringify(bundle, null, 2));
  } else {
    console.log(`\nQuote bundle — ${slug}\n`);
    console.log(`Manufacturing tier: ${bundle.manufacturing.tier}`);
    console.log(`  verified registry: ${bundle.manufacturing.onVerifiedRegistry ? "yes" : "no"}${
      bundle.manufacturing.verifiedAt ? ` (${bundle.manufacturing.verifiedAt})` : ""
    }`);
    console.log(`  first-manufacture flag: ${bundle.manufacturing.firstManufacture}`);
    console.log(`  scaffolded instance: ${bundle.manufacturing.scaffoldedInstancePresent ? "yes" : "no"}`);
    console.log("\nArtifacts:");
    console.log(`  brief: ${bundle.artifacts.verticalBrief.present ? "yes" : "no"} (${bundle.artifacts.verticalBrief.relativePath})`);
    console.log(`  business-needs: ${bundle.artifacts.businessNeeds.present ? "yes" : "no"} (${bundle.artifacts.businessNeeds.relativePath})`);
    console.log(`  stack: ${bundle.artifacts.appStack.present ? "yes" : "no"} (${bundle.artifacts.appStack.relativePath})`);
    if (bundle.saasAlignment) {
      console.log(
        `\nSaaS alignment: ${bundle.saasAlignment.ok ? "OK" : "issues"} (${bundle.saasAlignment.errorCount} errors, ${bundle.saasAlignment.warnCount} warnings)`,
      );
    } else {
      console.log("\nSaaS alignment: (could not parse subprocess output — run `mfg app saas` manually)");
    }
    console.log(`\n${bundle.pricing.message}\n`);
    console.log("Tip: use --json for the full bundle for scripts / future pricing.\n");
  }

  process.exitCode = 0;
}

/** Path comparison works more reliably under `tsx` than URL equality for `import.meta.url`. */
const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]!) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
