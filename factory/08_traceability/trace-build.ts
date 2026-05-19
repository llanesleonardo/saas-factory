/**
 * `mfg trace build <orderId> [--product <productId>] [--json]`
 * `mfg trace build --all`
 *
 * Rebuild the per-order traceability index file at
 *   `factory/08_traceability/orders/<orderId>.json`
 *
 * The file is **derived** from existing source-of-truth docs (order manifest,
 * order-phases.json, task-queue.json, sprint folders, telemetry JSONL). It is
 * safe to delete and regenerate at any time — never hand-edited.
 *
 * `--all` scans every folder under `factory/01_production_planning/01_02_phase_registry/`
 * and rebuilds the index for each. Useful as a one-shot after big factory
 * changes (e.g. importing a batch of old orders).
 *
 * Also appends one line per rebuild to `factory/08_traceability/index-build.log.jsonl`
 * so you can see when an index drifted.
 */
import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildOrderTraceIndex } from "../factory_libs/traceability/build-order-index.js";
import {
  loadAllTasks,
  loadBreakdownPaths,
  loadComponentsForProduct,
  loadOrderManifest,
  loadOrderPhases,
  loadSprints,
  loadTelemetryForOrder,
  sourcePointers,
} from "../factory_libs/traceability/read-sources.js";
import { traceOrderIndexRelPath } from "../factory_libs/traceability/trace-types.js";
import type { TraceOrderRef } from "../factory_libs/traceability/trace-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

interface Opts {
  orderId?: string;
  productId?: string;
  all: boolean;
  json: boolean;
}

function usage(): void {
  console.error(`Usage:
  npm run mfg -- trace build <orderId> [--product <productId>] [--json]
  npm run mfg -- trace build --all

Rebuild the order-level traceability index (derived from existing factory
artifacts). Output: factory/08_traceability/orders/<orderId>.json

If --product is omitted, the productId is taken from order-manifest.json
(or order-phases.json when the manifest is missing).
`);
}

function parseCli(argv: string[]): Opts {
  const rest: string[] = [];
  let all = false;
  let json = false;
  let productId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    }
    if (a === "--all") { all = true; continue; }
    if (a === "--json") { json = true; continue; }
    if (a === "--product" && argv[i + 1]) { productId = argv[++i]; continue; }
    if (a.startsWith("--")) {
      console.error(`trace build: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    rest.push(a);
  }
  if (!all && rest.length === 0) {
    usage();
    process.exit(1);
  }
  return { orderId: rest[0]?.trim(), productId: productId?.trim(), all, json };
}

/**
 * Best-effort productId resolution: prefer the manifest, fall back to the
 * order-phases doc.
 */
async function resolveProductId(orderId: string): Promise<string | null> {
  const manifest = await loadOrderManifest(REPO_ROOT, orderId);
  if (manifest?.productId) return manifest.productId.trim();
  const phases = await loadOrderPhases(REPO_ROOT, orderId);
  if (phases?.productId) return phases.productId.trim();
  return null;
}

async function listAllOrderIds(): Promise<string[]> {
  // Union of order ids visible under 01_00_work_orders/ and 01_02_phase_registry/
  // so we catch orders that exist as work orders but haven't gotten phases yet
  // (and vice versa).
  const seen = new Set<string>();
  for (const sub of [
    "factory/01_production_planning/01_00_work_orders",
    "factory/01_production_planning/01_02_phase_registry",
  ]) {
    try {
      const entries = await readdir(path.join(REPO_ROOT, sub), { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) seen.add(e.name);
      }
    } catch {
      // Folder missing is fine.
    }
  }
  return [...seen].sort();
}

interface BuildReport {
  orderId: string;
  productId: string | null;
  written?: string;
  reason?: "no-product-id" | "ok";
  counts?: TraceOrderRef["counts"];
}

async function buildOne(orderId: string, productIdOverride?: string): Promise<BuildReport> {
  const productId = productIdOverride ?? (await resolveProductId(orderId));
  if (!productId) {
    return { orderId, productId: null, reason: "no-product-id" };
  }
  const [manifest, phasesDoc, allTasks, sprints, telemetry, componentsBundle] = await Promise.all([
    loadOrderManifest(REPO_ROOT, orderId),
    loadOrderPhases(REPO_ROOT, orderId),
    loadAllTasks(REPO_ROOT),
    loadSprints(REPO_ROOT, orderId, productId),
    loadTelemetryForOrder(REPO_ROOT, orderId, productId),
    loadComponentsForProduct(REPO_ROOT, productId),
  ]);
  const phaseIds = (phasesDoc?.phases ?? []).map((p) => p.id);
  const breakdownPathsByPhaseId = await loadBreakdownPaths(REPO_ROOT, orderId, phaseIds);
  const source = sourcePointers(REPO_ROOT, orderId, productId);
  const index = buildOrderTraceIndex({
    orderId,
    productId,
    manifest,
    phasesDoc,
    breakdownPathsByPhaseId,
    allTasks,
    sprints,
    telemetry,
    components: componentsBundle.components,
    source,
  });

  const outRel = traceOrderIndexRelPath(orderId);
  const outAbs = path.join(REPO_ROOT, outRel);
  await mkdir(path.dirname(outAbs), { recursive: true });

  // Idempotent write: if the existing file matches the new content
  // everywhere except `builtAt`, keep `builtAt` from the file so we don't
  // churn git diffs on every rebuild.
  let existing: TraceOrderRef | null = null;
  try {
    existing = JSON.parse(await readFile(outAbs, "utf8")) as TraceOrderRef;
  } catch {
    existing = null;
  }
  if (existing) {
    const a = { ...index, builtAt: "" };
    const b = { ...existing, builtAt: "" };
    if (JSON.stringify(a) === JSON.stringify(b)) {
      index.builtAt = existing.builtAt;
    }
  }
  await writeFile(outAbs, JSON.stringify(index, null, 2) + "\n", "utf8");

  return { orderId, productId, written: outRel, reason: "ok", counts: index.counts };
}

async function logBuild(report: BuildReport): Promise<void> {
  const logAbs = path.join(REPO_ROOT, "factory/08_traceability/index-build.log.jsonl");
  await mkdir(path.dirname(logAbs), { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    orderId: report.orderId,
    productId: report.productId,
    reason: report.reason,
    written: report.written,
    counts: report.counts,
  });
  await appendFile(logAbs, line + "\n", "utf8");
}

async function main(): Promise<number> {
  const opts = parseCli(process.argv.slice(2));

  const orders = opts.all ? await listAllOrderIds() : [opts.orderId!];
  if (orders.length === 0) {
    console.error("trace build --all: no orders found under work-orders/ or phase-registry/.");
    return 1;
  }

  const reports: BuildReport[] = [];
  for (const id of orders) {
    try {
      const report = await buildOne(id, opts.productId);
      reports.push(report);
      await logBuild(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      reports.push({ orderId: id, productId: null, reason: "ok", written: undefined });
      if (opts.json) {
        // We'll surface the error in JSON output below.
        (reports[reports.length - 1] as unknown as { error: string }).error = msg;
      } else {
        console.error(`✗ trace build ${id}: ${msg}`);
      }
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ kind: "trace-build", orders: reports }, null, 2));
    return 0;
  }

  console.log(`\ntrace build — ${orders.length} order(s)`);
  for (const r of reports) {
    if (r.reason === "no-product-id") {
      console.log(`  ⚠ ${r.orderId} — could not resolve productId (no manifest, no phases)`);
      continue;
    }
    if (!r.written) {
      console.log(`  ✗ ${r.orderId} — write failed`);
      continue;
    }
    const c = r.counts!;
    console.log(
      `  ✓ ${r.orderId} → ${r.written}  ` +
        `(phases=${c.phases}, tasks=${c.tasks.total} [${c.tasks.done} done / ${c.tasks.blocked} blocked], ` +
        `sprints=${c.sprints}, events=${c.events})`,
    );
  }
  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { main as runTraceBuild, buildOne as buildOneOrder, logBuild };
export type { BuildReport };
