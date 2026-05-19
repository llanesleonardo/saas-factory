/**
 * SaaS baseline + cross-artifact alignment: vertical brief, app.stack.json, business-needs.json.
 *
 * Usage:
 *   npm run mfg -- app saas -- <appSlug>
 *   npm run mfg -- app saas -- <appSlug> --json
 *   npm run mfg -- app saas -- <appSlug> --strict   # business-needs.json required
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  appStackPath,
  businessNeedsPath,
  verticalBriefPath,
} from "../../../factory_libs/paths/app-config-paths.js";
import type { BusinessNeedsDoc } from "../../../factory_libs/product/business-needs-types.js";
import type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";
import { isValidBlueprint, type SaaSAppBlueprint } from "./app-blueprint-config.js";
import { validateVerticalConfigObject } from "../validation/validate-vertical-config.js";
import { validateBlueprintContradictions } from "../validation/validate-app-stack.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

const SLUG = /^[a-z][a-z0-9-]*$/;

type Severity = "error" | "warn";

type Finding = { severity: Severity; code: string; message: string; artifact?: "brief" | "stack" | "business-needs" | "align" };

function parseCli(): { slug?: string; json: boolean; strict: boolean; help: boolean } {
  const slice = process.argv.slice(2);
  const json = slice.includes("--json");
  const strict = slice.includes("--strict");
  const help = slice.includes("--help") || slice.includes("-h");
  const rest = slice.filter(
    (a) => a !== "--json" && a !== "--strict" && a !== "--help" && a !== "-h" && a !== "--" && !a.includes("app-saas-align"),
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

function briefBillingText(b: VerticalConfig): string {
  return (b.businessModel?.billingModel ?? b.billingModel ?? "").trim();
}

function briefHasIdentityStory(b: VerticalConfig): boolean {
  if (b.systemConstraints?.identity?.current) return true;
  const id = (b.identity ?? "").trim();
  return id.length > 0;
}

function briefHasTenancyStory(b: VerticalConfig): boolean {
  if (b.systemConstraints?.tenancy) return true;
  const t = (b.tenancy ?? "").trim();
  return t.length > 0;
}

function briefProductSummary(b: VerticalConfig): string {
  return (b.productSpec?.summary ?? b.summary ?? "").trim();
}

function validateBusinessNeedsShape(raw: unknown, rel: string): BusinessNeedsDoc | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) return null;
  if (typeof o.appSlug !== "string" || !SLUG.test(o.appSlug)) return null;
  if (typeof o.displayName !== "string" || !o.displayName.trim()) return null;
  if (typeof o.generatedAt !== "string") return null;
  if (o.productSpec === null || typeof o.productSpec !== "object" || Array.isArray(o.productSpec)) return null;
  if (o.businessModel === null || typeof o.businessModel !== "object" || Array.isArray(o.businessModel)) return null;
  return raw as BusinessNeedsDoc;
}

function saasStackBaseline(bp: SaaSAppBlueprint, ctx: string): Finding[] {
  const out: Finding[] = [];

  if (bp.database === "none") {
    out.push({
      severity: "warn",
      code: "saas.db.none",
      artifact: "stack",
      message: `${ctx}: database is "none" — most SaaS products need durable tenant data; confirm this is intentional.`,
    });
  }

  if (bp.cicd === "none-yet") {
    out.push({
      severity: "warn",
      code: "saas.cicd.none",
      artifact: "stack",
      message: `${ctx}: cicd is "none-yet" — ship track should include CI before production.`,
    });
  }

  if (bp.observability === "none") {
    out.push({
      severity: "warn",
      code: "saas.obs.none",
      artifact: "stack",
      message: `${ctx}: observability is "none" — add at least otel-hooks or Sentry-style signals before scale.`,
    });
  }

  const auth = bp.authSystem;
  if (auth === "none") {
    out.push({
      severity: "error",
      code: "saas.auth.none",
      artifact: "stack",
      message: `${ctx}: authSystem is "none" — SaaS products normally need session, jwt, oauth, or hybrid.`,
    });
  } else if (auth === undefined) {
    out.push({
      severity: "warn",
      code: "saas.auth.undeclared",
      artifact: "stack",
      message: `${ctx}: authSystem is unset — declare session/jwt/oauth/hybrid so stack matches security posture.`,
    });
  }

  if (bp.dataMode === "none" || bp.dataMode === "mock-only") {
    out.push({
      severity: "warn",
      code: "saas.dataMode",
      artifact: "stack",
      message: `${ctx}: dataMode is "${bp.dataMode ?? "unset"}" — confirm persistence story for production SaaS.`,
    });
  }

  return out;
}

function crossAlign(
  slug: string,
  brief: VerticalConfig,
  bp: SaaSAppBlueprint,
  bn: BusinessNeedsDoc | null,
): Finding[] {
  const out: Finding[] = [];

  if (brief.vertical !== slug) {
    out.push({
      severity: "error",
      code: "align.brief.vertical",
      artifact: "align",
      message: `Vertical brief "vertical" is "${brief.vertical}" but folder/slug is "${slug}".`,
    });
  }

  if (bp.appSlug !== slug) {
    out.push({
      severity: "error",
      code: "align.stack.slug",
      artifact: "align",
      message: `app.stack.json appSlug is "${bp.appSlug}" but expected "${slug}".`,
    });
  }

  if (bn && bn.appSlug !== slug) {
    out.push({
      severity: "error",
      code: "align.bn.slug",
      artifact: "align",
      message: `business-needs.json appSlug is "${bn.appSlug}" but expected "${slug}".`,
    });
  }

  if (bn) {
    const bd = brief.displayName.trim();
    const nd = bn.displayName.trim();
    if (bd && nd && bd !== nd) {
      out.push({
        severity: "warn",
        code: "align.displayName",
        artifact: "align",
        message: `displayName differs: brief "${bd}" vs business-needs "${nd}".`,
      });
    }
  }

  const billBrief = briefBillingText(brief).toLowerCase();
  const mentionsStripe = billBrief.includes("stripe");
  const stackBilling = Boolean(bp.billingDetail?.enabled);
  if (mentionsStripe && !stackBilling) {
    out.push({
      severity: "warn",
      code: "align.billing.stripe",
      artifact: "align",
      message: `Brief billing text mentions Stripe but app.stack.json billingDetail.enabled is not true — align stack or brief.`,
    });
  }

  const pay = bn?.integrationPlan?.integrations?.payments;
  if (pay === "stripe" && !stackBilling) {
    out.push({
      severity: "warn",
      code: "align.bn.payments",
      artifact: "align",
      message: `business-needs sets payments=stripe but stack billingDetail is not enabled — align.`,
    });
  }

  return out;
}

function briefSaaSBaseline(brief: VerticalConfig, rel: string): Finding[] {
  const out: Finding[] = [];

  if (!brief.displayName?.trim()) {
    out.push({ severity: "error", code: "saas.brief.displayName", artifact: "brief", message: `${rel}: displayName required.` });
  }

  if (!briefProductSummary(brief)) {
    out.push({
      severity: "warn",
      code: "saas.brief.summary",
      artifact: "brief",
      message: `${rel}: add productSpec.summary or summary — SaaS intake needs a one-line value prop.`,
    });
  }

  if (!briefBillingText(brief)) {
    out.push({
      severity: "warn",
      code: "saas.brief.billing",
      artifact: "brief",
      message: `${rel}: describe billing (businessModel.billingModel or billingModel) — monetization is a core SaaS contract.`,
    });
  }

  if (!briefHasIdentityStory(brief)) {
    out.push({
      severity: "warn",
      code: "saas.brief.identity",
      artifact: "brief",
      message: `${rel}: document identity (systemConstraints.identity or legacy identity string) — who signs in.`,
    });
  }

  if (!briefHasTenancyStory(brief)) {
    out.push({
      severity: "warn",
      code: "saas.brief.tenancy",
      artifact: "brief",
      message: `${rel}: document tenancy (systemConstraints.tenancy or legacy tenancy string) — isolation boundary for multi-tenant SaaS.`,
    });
  }

  const mvp =
    brief.systemConstraints?.mvpScope ||
    (brief.mvpScopeHint ? String(brief.mvpScopeHint) : "").trim();
  if (!mvp || (typeof mvp === "object" && Object.keys(mvp).length === 0)) {
    out.push({
      severity: "warn",
      code: "saas.brief.mvp",
      artifact: "brief",
      message: `${rel}: add systemConstraints.mvpScope or mvpScopeHint — bounded MVP scope is a SaaS baseline.`,
    });
  }

  return out;
}

function businessNeedsSaaSBaseline(bn: BusinessNeedsDoc, rel: string): Finding[] {
  const out: Finding[] = [];
  const ps = bn.productSpec;
  if (!ps.summary?.trim()) {
    out.push({ severity: "warn", code: "saas.bn.summary", artifact: "business-needs", message: `${rel}: productSpec.summary empty.` });
  }
  if (!ps.primaryUser?.trim()) {
    out.push({ severity: "warn", code: "saas.bn.primaryUser", artifact: "business-needs", message: `${rel}: productSpec.primaryUser empty.` });
  }
  if (!bn.businessModel.billingModel?.trim()) {
    out.push({ severity: "warn", code: "saas.bn.billing", artifact: "business-needs", message: `${rel}: businessModel.billingModel empty.` });
  }
  if (!bn.narrative?.problemStatement?.trim()) {
    out.push({
      severity: "warn",
      code: "saas.bn.problem",
      artifact: "business-needs",
      message: `${rel}: narrative.problemStatement empty — capture customer pain for SaaS discovery.`,
    });
  }
  return out;
}

function printHelp(): void {
  console.log(`mfg app saas — SaaS baseline + alignment (brief + stack + business-needs)

Examples:
  npm run mfg -- app saas -- todo
  npm run mfg -- app saas -- todo --json
  npm run mfg -- app saas -- todo --strict    # require business-needs.json

Checks:
  • Vertical brief: schema + SaaS intake fields (billing, identity, tenancy, MVP).
  • app.stack.json: blueprint shape + internal contradictions + SaaS stack baseline (auth, DB, CI, observability).
  • business-needs.json: optional unless --strict; when present, shape + PM fields + cross-check displayName / Stripe / payments vs stack.
`);
}

async function main(): Promise<void> {
  const { slug, json, strict, help } = parseCli();
  if (help) {
    printHelp();
    return;
  }
  if (!slug || !SLUG.test(slug)) {
    console.error('Usage: npm run mfg -- app saas -- <appSlug> [--json] [--strict]');
    process.exit(1);
  }

  const briefPath = verticalBriefPath(repoRoot, slug);
  const stackPath = appStackPath(repoRoot, slug);
  const bnPath = businessNeedsPath(repoRoot, slug);
  const briefRel = path.relative(repoRoot, briefPath);
  const stackRel = path.relative(repoRoot, stackPath);
  const bnRel = path.relative(repoRoot, bnPath);

  const findings: Finding[] = [];

  const hasBrief = await pathExists(briefPath);
  const hasStack = await pathExists(stackPath);
  const hasBn = await pathExists(bnPath);

  if (!hasBrief) {
    findings.push({
      severity: "error",
      code: "missing.brief",
      artifact: "brief",
      message: `Missing ${briefRel} — run: npm run mfg -- app new -- ${slug}`,
    });
  }
  if (!hasStack) {
    findings.push({
      severity: "error",
      code: "missing.stack",
      artifact: "stack",
      message: `Missing ${stackRel} — run: npm run mfg -- app stack -- ${slug}`,
    });
  }
  if (!hasBn) {
    findings.push({
      severity: strict ? "error" : "warn",
      code: "missing.business-needs",
      artifact: "business-needs",
      message: strict
        ? `Missing ${bnRel} (--strict requires business-needs) — run: npm run mfg -- app bn -- ${slug}`
        : `Optional ${bnRel} not found — run: npm run mfg -- app bn -- ${slug} for a PM bundle.`,
    });
  }

  let brief: VerticalConfig | null = null;
  if (hasBrief) {
    try {
      const raw = JSON.parse(await readFile(briefPath, "utf8")) as unknown;
      brief = validateVerticalConfigObject(raw, briefRel);
      findings.push(...briefSaaSBaseline(brief, briefRel));
    } catch (e) {
      findings.push({
        severity: "error",
        code: "invalid.brief",
        artifact: "brief",
        message: `${briefRel}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let bp: SaaSAppBlueprint | null = null;
  if (hasStack) {
    try {
      const raw = JSON.parse(await readFile(stackPath, "utf8")) as unknown;
      if (!isValidBlueprint(raw)) {
        findings.push({
          severity: "error",
          code: "invalid.stack",
          artifact: "stack",
          message: `${stackRel}: invalid blueprint (schemaVersion 2, required enums)`,
        });
      } else {
        bp = raw;
        const ctx = stackRel;
        for (const msg of validateBlueprintContradictions(ctx, raw)) {
          findings.push({ severity: "error", code: "stack.contradiction", artifact: "stack", message: msg });
        }
        findings.push(...saasStackBaseline(bp, ctx));
      }
    } catch (e) {
      findings.push({
        severity: "error",
        code: "invalid.stack.read",
        artifact: "stack",
        message: `${stackRel}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  let bn: BusinessNeedsDoc | null = null;
  if (hasBn) {
    try {
      const raw = JSON.parse(await readFile(bnPath, "utf8")) as unknown;
      const doc = validateBusinessNeedsShape(raw, bnRel);
      if (!doc) {
        findings.push({
          severity: "error",
          code: "invalid.business-needs",
          artifact: "business-needs",
          message: `${bnRel}: invalid business-needs (schemaVersion 1, appSlug, productSpec, businessModel)`,
        });
      } else {
        bn = doc;
        findings.push(...businessNeedsSaaSBaseline(bn, bnRel));
      }
    } catch (e) {
      findings.push({
        severity: "error",
        code: "invalid.business-needs.read",
        artifact: "business-needs",
        message: `${bnRel}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  if (brief && bp) {
    findings.push(...crossAlign(slug, brief, bp, bn));
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  if (json) {
    console.log(
      JSON.stringify(
        {
          appSlug: slug,
          ok: errors.length === 0,
          errorCount: errors.length,
          warnCount: warns.length,
          findings,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`\nSaaS alignment — ${slug}\n`);
    if (findings.length === 0) {
      console.log("OK: no issues reported.");
    } else {
      for (const f of findings) {
        const tag = f.severity === "error" ? "ERROR" : "WARN ";
        console.log(`[${tag}] ${f.code}: ${f.message}`);
      }
    }
    console.log("");
    if (errors.length === 0) {
      console.log(`OK: ${slug} passes SaaS checks (${warns.length} warning(s)).`);
    } else {
      console.error(`Failed: ${errors.length} error(s), ${warns.length} warning(s).`);
    }
  }

  process.exitCode = errors.length > 0 ? 1 : 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
