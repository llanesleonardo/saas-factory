/**
 * Validate System IR (configs/apps/<app>/app.stack.json) beyond schema:
 * - JSON shape via isValidBlueprint
 * - cross-field contradictions (billing/webhooks/jobs/redis/etc.)
 *
 * Usage:
 *   npm run mfg -- stack validate -- todo
 *   npm run mfg -- stack validate -- --all
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { configsAppsRoot, appStackPath } from "../../../factory_libs/paths/app-config-paths.js";
import { isValidBlueprint } from "../gates/app-blueprint-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repository root (`validation/` lives under `factory/03_assembly_lines/06-gates/validation/`). */
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

function cliArgs(): string[] {
  const slice = process.argv.slice(2);
  const scriptIdx = slice.findIndex((a) => a.includes("validate-app-stack"));
  return scriptIdx >= 0 ? slice.slice(scriptIdx + 1) : slice;
}

function parseArgs(argv: string[]): { all: boolean; slug?: string } {
  const args = argv.filter((a) => a !== "--");
  const all = args.includes("--all");
  const slug = args.find((a) => !a.startsWith("--"));
  return { all, slug };
}

function err(ctx: string, message: string): string {
  return `${ctx}: ${message}`;
}

/** Cross-field blueprint checks (billing vs webhooks, redis vs jobs, …). Exported for `mfg app saas`. */
export function validateBlueprintContradictions(ctx: string, bp: any): string[] {
  const errors: string[] = [];

  const billingEnabled = Boolean(bp.billingDetail?.enabled);
  const billingNeedsWebhooks = Boolean(bp.billingDetail?.requirements?.needsBillingWebhooks);

  const networkingWebhooks = bp.networkingDetail?.webhooks;
  if (billingEnabled && billingNeedsWebhooks) {
    if (networkingWebhooks !== "ingest-only" && networkingWebhooks !== "ingest-and-deliver") {
      errors.push(
        err(
          ctx,
          `billing enabled requires inbound webhooks, but networkingDetail.webhooks is "${networkingWebhooks ?? "missing"}"`,
        ),
      );
    }
  }

  const persistenceMode = bp.databaseDetail?.persistenceMode;
  if (persistenceMode === "stateless" && (billingEnabled || bp.authDetail?.requirements?.needsMultiTenantDB)) {
    errors.push(err(ctx, `persistenceMode=stateless contradicts billing/multi-tenancy (needs durable data)`));
  }

  const needsJobs = Boolean(
    bp.aiDetail?.requirements?.needsJobQueue ||
      bp.billingDetail?.requirements?.needsJobQueue ||
      bp.emailDetail?.requirements?.needsJobQueue ||
      bp.searchDetail?.requirements?.needsIndexerJobs,
  );
  if (needsJobs && !bp.jobsDetail) {
    errors.push(err(ctx, `requirements imply jobs/queues, but jobsDetail is missing`));
  }

  const jobsSystemType = bp.jobsDetail?.systemType;
  const redisPolicy = bp.redis;
  if (jobsSystemType === "redis-queue" && redisPolicy !== "cache-sessions-queues") {
    errors.push(err(ctx, `jobsDetail.systemType=redis-queue requires redis=cache-sessions-queues (got "${redisPolicy}")`));
  }

  const authSession = bp.authDetail?.sessionModel;
  if (authSession === "redis-sessions" && redisPolicy !== "cache-sessions" && redisPolicy !== "cache-sessions-queues") {
    errors.push(err(ctx, `authDetail.sessionModel=redis-sessions requires redis sessions policy (got "${redisPolicy}")`));
  }

  const pii = Boolean(bp.observabilityDetail?.requirements?.needsPIIRedaction);
  if (pii && bp.observability === "none") {
    errors.push(err(ctx, `observabilityDetail requires PII redaction but observability is "none"`));
  }

  return errors;
}

async function validateOne(slug: string): Promise<string[]> {
  const stackPath = appStackPath(repoRoot, slug);
  const ctx = path.relative(repoRoot, stackPath);

  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(stackPath, "utf8")) as unknown;
  } catch (e) {
    return [err(ctx, e instanceof Error ? e.message : String(e))];
  }

  if (!isValidBlueprint(raw)) {
    return [err(ctx, "invalid blueprint JSON shape (schemaVersion=2 expected)")];
  }
  const bp = raw as any;

  if (bp.appSlug !== slug) {
    return [err(ctx, `appSlug "${bp.appSlug}" must match folder "${slug}"`)];
  }

  return validateBlueprintContradictions(ctx, bp);
}

async function validateAll(): Promise<void> {
  const root = configsAppsRoot(repoRoot);
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    console.log("OK: no configs/apps/ yet — nothing to validate.");
    return;
  }

  const errors: string[] = [];
  for (const slug of entries) {
    // only validate if stack file exists
    const p = appStackPath(repoRoot, slug);
    try {
      await fs.access(p);
    } catch {
      continue;
    }
    errors.push(...(await validateOne(slug)));
  }

  if (errors.length > 0) {
    throw new Error(`App stack validation failed:\n${errors.join("\n")}`);
  }
}

async function main(): Promise<void> {
  const { all, slug } = parseArgs(cliArgs());
  if (all) {
    await validateAll();
    console.log("OK: all configs/apps/<slug>/app.stack.json stack files validate.");
    return;
  }
  if (!slug) {
    console.error("Usage: npm run mfg -- stack validate -- <appSlug>   OR   npm run mfg -- stack validate -- --all");
    process.exit(1);
  }
  const errors = await validateOne(slug);
  if (errors.length > 0) {
    throw new Error(`App stack validation failed:\n${errors.join("\n")}`);
  }
  console.log(`OK: ${slug} stack validates.`);
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

