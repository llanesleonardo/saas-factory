/**
 * Build proposed tasks for ALL phases in an order's `order-phases.json` in one shot,
 * and (by default) merge them into the canonical `task-queue.json`.
 *
 *   npm run mfg -- app build-tasks -- <orderId> [--no-merge] [--dry-run] [--json]
 *   npm run mfg -- order phases <orderId> build-tasks [--no-merge] [--dry-run] [--json]
 *
 * Default flow:
 *   1. Read `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json`
 *   2. For each phase, generate `factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-<phaseId>.json`
 *   3. Append all proposedTasks into `factory/03_assembly_lines/03-registry/registry/task-queue.json`
 *      (status="backlog"; skipping anything whose id collides with the existing queue)
 *
 * Why one-shot:
 *   `bdtask` (single-phase) keeps a human-review gate. `build-tasks` is the
 *   automation partner for `pipeline run` — phases are turned into tasks
 *   immediately so a new app comes out of the pipeline with a populated queue
 *   instead of an empty one.
 *
 * Flags:
 *   --no-merge   Only write per-phase breakdown files; don't touch task-queue.json.
 *   --dry-run    Print the plan; don't write any file.
 *   --json       Emit a single JSON summary at the end (suppresses progress lines).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { phaseBreakdownProposalPath, orderPhasesPath } from "../../factory_libs/paths/app-config-paths.js";
import type { FactoryTask } from "../../factory_libs/planning/task-graph.js";
import {
  buildPhaseBreakdownDoc,
  resolvePhaseBreakdownContext,
  safeFileToken,
} from "./phase-breakdown.js";
import { primaryProductId, validateOrderManifest, type OrderManifest } from "./validate-manifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

interface CliOpts {
  orderId: string;
  merge: boolean;
  dryRun: boolean;
  jsonStdout: boolean;
}

function usage(): void {
  console.error(`build-tasks — break every phase in order-phases.json into tasks (auto-merge into task-queue.json)

  npm run mfg -- app build-tasks -- <orderId> [--no-merge] [--dry-run] [--json]
  npm run mfg -- order phases <orderId> build-tasks [--no-merge] [--dry-run] [--json]

Defaults:
  • Writes factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-<phaseId>.json for every phase.
  • Appends proposedTasks into factory/03_assembly_lines/03-registry/registry/task-queue.json
    (status="backlog"; existing ids are not modified, collisions are skipped).

Flags:
  --no-merge   Only write the per-phase breakdown files.
  --dry-run    Print the plan; don't write anything.
  --json       Emit a single JSON summary at the end.
`);
}

function parseCli(argv: string[]): { ok: true; opts: CliOpts } | { ok: false } {
  let orderId: string | undefined;
  let merge = true;
  let dryRun = false;
  let jsonStdout = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--help" || a === "-h") return { ok: false };
    if (a === "--no-merge") { merge = false; continue; }
    if (a === "--dry-run") { dryRun = true; continue; }
    if (a === "--json") { jsonStdout = true; continue; }
    if (a.startsWith("--")) {
      console.error(`build-tasks: unknown flag "${a}".`);
      return { ok: false };
    }
    if (!orderId) { orderId = a; continue; }
    console.error(`build-tasks: unexpected positional "${a}".`);
    return { ok: false };
  }
  if (!orderId) {
    console.error("build-tasks: missing <orderId>.");
    return { ok: false };
  }
  return { ok: true, opts: { orderId: orderId.trim(), merge, dryRun, jsonStdout } };
}

async function loadManifest(orderId: string): Promise<OrderManifest | null> {
  const manifestPath = path.join(REPO_ROOT, "factory", "01_production_planning", "01_00_work_orders", orderId, "order-manifest.json");
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as OrderManifest;
  } catch {
    console.error(`Cannot read order-manifest.json for "${orderId}" at ${path.relative(REPO_ROOT, manifestPath)}`);
    return null;
  }
}

async function appendIntoQueue(queuePath: string, newTasks: FactoryTask[]): Promise<{ appended: number; collided: string[] }> {
  const raw = await readFile(queuePath, "utf8");
  const parsed = JSON.parse(raw) as FactoryTask[] | { tasks: FactoryTask[] };
  const wrapped = !Array.isArray(parsed);
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  const ids = new Set(tasks.map((t) => t.id));
  const collided: string[] = [];
  let appended = 0;
  for (const t of newTasks) {
    if (ids.has(t.id)) {
      collided.push(t.id);
      continue;
    }
    tasks.push(t);
    ids.add(t.id);
    appended += 1;
  }
  const out = wrapped ? { ...(parsed as { tasks: FactoryTask[] }), tasks } : tasks;
  await writeFile(queuePath, JSON.stringify(out, null, 2) + "\n", "utf8");
  return { appended, collided };
}

interface RunSummary {
  orderId: string;
  productId: string;
  orderPhasesPath: string;
  taskQueuePath: string;
  phases: Array<{
    phaseId: string;
    breakdownPath: string;
    taskCount: number;
    taskIds: string[];
    written: boolean;
  }>;
  totalProposed: number;
  merge: { performed: boolean; appended: number; collided: string[] };
  dryRun: boolean;
}

async function main(): Promise<number> {
  const parsed = parseCli(process.argv.slice(2));
  if (!parsed.ok) {
    usage();
    return 1;
  }
  const opts = parsed.opts;

  const manifest = await loadManifest(opts.orderId);
  if (!manifest) return 1;

  const check = await validateOrderManifest(manifest, REPO_ROOT);
  if (!check.ok) {
    for (const e of check.errors) console.error("ERR:", e);
    return 1;
  }
  const productId = primaryProductId(manifest);

  const phasesPath = orderPhasesPath(REPO_ROOT, opts.orderId);
  const ctx = await resolvePhaseBreakdownContext({
    orderPhasesPath: phasesPath,
    orderId: opts.orderId,
    repoRoot: REPO_ROOT,
  });
  if (!ctx.ok) {
    console.error(ctx.error);
    return 1;
  }
  if (ctx.doc.phases.length === 0) {
    if (opts.jsonStdout) {
      console.log(JSON.stringify({ orderId: opts.orderId, productId, phases: [], totalProposed: 0, note: "order-phases.json has 0 phases" }, null, 2));
    } else {
      console.warn(`order-phases.json for "${opts.orderId}" has 0 phases. Run: npm run mfg -- app bdphase -- ${opts.orderId}`);
    }
    return 0;
  }

  const knownIds = new Set(ctx.globalTasks.map((t) => t.id));
  const runningTasks: FactoryTask[] = [...ctx.globalTasks];
  const proposedAll: FactoryTask[] = [];
  // Idempotency guard: skip any phase that already has tasks in the queue
  // (matched by `order_phase_id`). Without this, re-running build-tasks would
  // append a fresh batch (seq bumps off the global max), doubling the queue.
  const phasesAlreadyBrokenDown = new Set(
    ctx.globalTasks
      .map((t) => (t.order_phase_id ?? "").trim())
      .filter((p) => p.length > 0),
  );

  const summary: RunSummary = {
    orderId: opts.orderId,
    productId,
    orderPhasesPath: path.relative(REPO_ROOT, phasesPath).split(path.sep).join("/"),
    taskQueuePath: ctx.queueRelPath,
    phases: [],
    totalProposed: 0,
    merge: { performed: false, appended: 0, collided: [] },
    dryRun: opts.dryRun,
  };

  for (const phase of ctx.doc.phases) {
    if (phasesAlreadyBrokenDown.has(phase.id)) {
      summary.phases.push({
        phaseId: phase.id,
        breakdownPath: path
          .relative(REPO_ROOT, phaseBreakdownProposalPath(REPO_ROOT, opts.orderId, safeFileToken(phase.id)))
          .split(path.sep)
          .join("/"),
        taskCount: 0,
        taskIds: [],
        written: false,
      });
      continue;
    }
    const built = buildPhaseBreakdownDoc({
      orderId: opts.orderId,
      productId,
      phase,
      knownTaskIds: knownIds,
      knownTasks: runningTasks,
      taskQueueRelPath: ctx.queueRelPath,
      lanesOverride: [],
    });
    if (!built.ok) {
      console.error(`Phase ${phase.id}: ${built.error}`);
      return 1;
    }
    const outPath = phaseBreakdownProposalPath(REPO_ROOT, opts.orderId, safeFileToken(phase.id));
    const outRel = path.relative(REPO_ROOT, outPath).split(path.sep).join("/");
    if (!opts.dryRun) {
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, JSON.stringify(built.breakdown, null, 2) + "\n", "utf8");
    }
    summary.phases.push({
      phaseId: phase.id,
      breakdownPath: outRel,
      taskCount: built.breakdown.proposedTasks.length,
      taskIds: built.breakdown.proposedTasks.map((t) => t.id),
      written: !opts.dryRun,
    });
    proposedAll.push(...built.breakdown.proposedTasks);
    runningTasks.push(...built.breakdown.proposedTasks);
    summary.totalProposed += built.breakdown.proposedTasks.length;
  }

  if (opts.merge && !opts.dryRun) {
    const res = await appendIntoQueue(ctx.queuePath, proposedAll);
    summary.merge = { performed: true, appended: res.appended, collided: res.collided };
  } else {
    summary.merge = { performed: false, appended: 0, collided: [] };
  }

  if (opts.jsonStdout) {
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  if (opts.dryRun) {
    console.log(`build-tasks (dry-run) — order=${opts.orderId} product=${productId} phases=${ctx.doc.phases.length}`);
    for (const ph of summary.phases) {
      console.log(`  • ${ph.phaseId} — would write ${ph.breakdownPath} (${ph.taskCount} tasks)`);
      for (const id of ph.taskIds) console.log(`      - ${id}`);
    }
    console.log(`  → would propose ${summary.totalProposed} tasks total`);
    console.log(opts.merge ? `  → would append into ${ctx.queueRelPath}` : `  → --no-merge: queue untouched`);
    return 0;
  }

  console.log(`build-tasks — order=${opts.orderId} product=${productId}`);
  for (const ph of summary.phases) {
    if (ph.taskCount === 0 && !ph.written) {
      console.log(`  · ${ph.phaseId} → already broken down (queue has tasks for this phase) — skipped`);
    } else {
      console.log(`  ✓ ${ph.phaseId} → ${ph.breakdownPath} (${ph.taskCount} tasks)`);
    }
  }
  if (opts.merge) {
    console.log(`  ✓ merged ${summary.merge.appended} tasks into ${ctx.queueRelPath}`);
    if (summary.merge.collided.length > 0) {
      console.log(`  ⚠ skipped ${summary.merge.collided.length} colliding ids: ${summary.merge.collided.join(", ")}`);
    }
  } else {
    console.log(`  (skipped queue merge — pass --no-merge or omit it to control)`);
  }
  console.log(`Next: npm run mfg -- line next`);
  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { main as runBuildTasks };
