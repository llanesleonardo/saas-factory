/**
 * Turn one order epic (phase) into proposed factory tasks for `task-queue.json`.
 *
 * Does **not** mutate the global queue — writes a reviewable JSON bundle under **`01_03_task-registry/<orderId>/`**.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { phaseBreakdownProposalPath } from "../../factory_libs/paths/app-config-paths.js";
import type { OrderPhaseEntry, OrderPhaseLane, OrderPhasesDoc } from "../../factory_libs/orders/order-phases-types.js";
import type { FactoryTask } from "../../factory_libs/planning/task-graph.js";
import { loadTaskQueue } from "../../factory_libs/planning/task-graph.js";

const TASK_QUEUE_CANDIDATES = ["factory/03_assembly_lines/03-registry/registry/task-queue.json"];

function usageBreakdown(): void {
  console.error(`phase breakdown — propose tasks for one epic (merge into task-queue.json after review)

  npm run mfg -- order phases <orderId> breakdown <phaseId> [--lane <lane>]...
  npm run mfg -- order phases <orderId> breakdown <phaseId> --json
  npm run mfg -- order phases <orderId> breakdown <phaseId> --dry-run

Uses lanes from order-phases.json when set; otherwise defaults to frontend + backend + qa.
Repeats --lane to override. Tasks chain depends_on in lane order; carry pointers → materials.

Outputs: factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-<phaseId>.json
`);
}

function safeFileToken(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function productIdToPrefix(productId: string): string {
  return productId
    .trim()
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.toUpperCase())
    .join("_");
}

function phaseReportingNumber(phaseId: string): string | undefined {
  const m = /_P(\d+)_/i.exec(phaseId);
  return m?.[1];
}

function laneTitle(lane: OrderPhaseLane): string {
  const labels: Record<OrderPhaseLane, string> = {
    frontend: "Frontend",
    backend: "Backend",
    api: "API contract",
    data: "Data layer",
    auth: "Auth",
    infra: "Infra",
    docs: "Docs",
    qa: "Quality / verification",
    integration: "Integration",
  };
  return labels[lane] ?? lane;
}

async function resolveTaskQueuePath(repoRoot: string): Promise<string | null> {
  for (const rel of TASK_QUEUE_CANDIDATES) {
    const p = path.join(repoRoot, rel);
    try {
      await access(p);
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

function maxPrefixSequence(tasks: FactoryTask[], prefix: string): number {
  const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc}_(\\d+)_`);
  let max = 0;
  for (const t of tasks) {
    const m = re.exec(t.id);
    if (m?.[1]) {
      const n = Number.parseInt(m[1]!, 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return max;
}

function maxPriorityForApp(tasks: FactoryTask[], app: string): number {
  let max = 0;
  for (const t of tasks) {
    if ((t.app ?? "").trim() === app.trim()) {
      const p = t.priority ?? 0;
      max = Math.max(max, p);
    }
  }
  return max;
}

export type PhaseBreakdownDoc = {
  schemaVersion: 1;
  kind: "phase-breakdown";
  orderId: string;
  productId: string;
  phaseId: string;
  generatedAt: string;
  taskQueueSource: string;
  sourcePhase: OrderPhaseEntry;
  proposedTasks: FactoryTask[];
  notes: string;
};

/**
 * Pure builder — compute the proposed-tasks doc for ONE phase against a known
 * set of already-known task ids (so callers can chain multiple phases without
 * re-reading the queue between them). No file I/O.
 */
export function buildPhaseBreakdownDoc(args: {
  orderId: string;
  productId: string;
  phase: OrderPhaseEntry;
  knownTaskIds: Set<string>;
  /** All tasks currently known (queue + previously proposed) — used to seed seq/priority bumps. */
  knownTasks: FactoryTask[];
  taskQueueRelPath: string;
  lanesOverride: OrderPhaseLane[];
}):
  | { ok: true; breakdown: PhaseBreakdownDoc; appPath: string }
  | { ok: false; error: string } {
  const productId = args.productId.trim();
  const appPath = `apps/${productId}/${productId}-instance`;
  const prefix = productIdToPrefix(productId);
  const seqBase = maxPrefixSequence(args.knownTasks, prefix);
  const prioBase = maxPriorityForApp(args.knownTasks, appPath);

  let lanes: OrderPhaseLane[] =
    args.lanesOverride.length > 0
      ? args.lanesOverride
      : args.phase.lanes && args.phase.lanes.length > 0
        ? [...args.phase.lanes]
        : ["frontend", "backend", "qa"];
  lanes = [...new Set(lanes)];

  const phaseNum = phaseReportingNumber(args.phase.id);
  const phaseSlug = safeFileToken(args.phase.id).slice(0, 48);

  const proposedTasks: FactoryTask[] = [];
  let seq = seqBase;
  let prio = prioBase;

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i]!;
    seq += 1;
    prio += 1;
    const laneKey = lane.replace(/[^a-zA-Z0-9]+/g, "_");
    const id = `${prefix}_${String(seq).padStart(3, "0")}_${phaseSlug}_${laneKey}`;
    if (args.knownTaskIds.has(id)) {
      return { ok: false, error: `Task id collision "${id}" — resolve manually or adjust queue.` };
    }

    const materials = [...new Set(Object.values(args.phase.pointers ?? {}))].filter(Boolean);
    const title = `${args.phase.title} — ${laneTitle(lane)}`;

    const task: FactoryTask = {
      id,
      title,
      app: appPath,
      status: "backlog",
      priority: prio,
      phase: phaseNum,
      order_phase_id: args.phase.id,
      materials: materials.length > 0 ? materials : undefined,
      workcenters: [lane],
      depends_on: i === 0 ? undefined : [proposedTasks[i - 1]!.id],
    };
    proposedTasks.push(task);
    args.knownTaskIds.add(id);
  }

  const breakdown: PhaseBreakdownDoc = {
    schemaVersion: 1,
    kind: "phase-breakdown",
    orderId: args.orderId,
    productId,
    phaseId: args.phase.id,
    generatedAt: new Date().toISOString(),
    taskQueueSource: args.taskQueueRelPath,
    sourcePhase: args.phase,
    proposedTasks,
    notes:
      "Review/edit titles and dependencies, then merge proposedTasks into factory/03_assembly_lines/03-registry/registry/task-queue.json. Run: npm run mfg -- validate task-queue && npm run mfg -- line next",
  };

  return { ok: true, breakdown, appPath };
}

export { safeFileToken };

export async function resolvePhaseBreakdownContext(args: {
  orderPhasesPath: string;
  orderId: string;
  repoRoot: string;
}): Promise<
  | { ok: true; doc: OrderPhasesDoc; queuePath: string; queueRelPath: string; globalTasks: FactoryTask[] }
  | { ok: false; error: string }
> {
  let raw: string;
  try {
    raw = await readFile(args.orderPhasesPath, "utf8");
  } catch {
    return {
      ok: false,
      error: `No order-phases.json for "${args.orderId}". Run: npm run mfg -- order phases ${args.orderId} init`,
    };
  }
  const doc = JSON.parse(raw) as OrderPhasesDoc;

  const queuePath = await resolveTaskQueuePath(args.repoRoot);
  if (!queuePath) {
    return {
      ok: false,
      error: "No task-queue.json found (factory/03_assembly_lines/03-registry/registry/task-queue.json).",
    };
  }
  const globalTasks = await loadTaskQueue(queuePath);
  const queueRelPath = path.relative(args.repoRoot, queuePath).split(path.sep).join("/");
  return { ok: true, doc, queuePath, queueRelPath, globalTasks };
}

export async function runPhaseBreakdown(args: {
  orderPhasesPath: string;
  orderId: string;
  manifestProductId: string;
  phaseId: string;
  repoRoot: string;
  lanesOverride: OrderPhaseLane[];
  jsonStdout: boolean;
  dryRun: boolean;
}): Promise<number> {
  const ctx = await resolvePhaseBreakdownContext({
    orderPhasesPath: args.orderPhasesPath,
    orderId: args.orderId,
    repoRoot: args.repoRoot,
  });
  if (!ctx.ok) {
    console.error(ctx.error);
    return 1;
  }
  const phase = ctx.doc.phases.find((p) => p.id === args.phaseId.trim());
  if (!phase) {
    console.error(`Unknown phase id "${args.phaseId}"`);
    return 1;
  }

  const knownIds = new Set(ctx.globalTasks.map((t) => t.id));
  const built = buildPhaseBreakdownDoc({
    orderId: args.orderId,
    productId: args.manifestProductId,
    phase,
    knownTaskIds: knownIds,
    knownTasks: ctx.globalTasks,
    taskQueueRelPath: ctx.queueRelPath,
    lanesOverride: args.lanesOverride,
  });
  if (!built.ok) {
    console.error(built.error);
    return 1;
  }
  const { breakdown } = built;
  const outPath = phaseBreakdownProposalPath(args.repoRoot, args.orderId, safeFileToken(phase.id));

  if (args.jsonStdout) {
    console.log(JSON.stringify(breakdown, null, 2));
    return 0;
  }

  if (args.dryRun) {
    console.log(`Would write ${path.relative(args.repoRoot, outPath)} (${breakdown.proposedTasks.length} tasks)`);
    for (const t of breakdown.proposedTasks) {
      console.log(`  • ${t.id}: ${t.title}`);
    }
    return 0;
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(breakdown, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.relative(args.repoRoot, outPath)} (${breakdown.proposedTasks.length} proposed tasks)`);
  console.log(breakdown.notes);
  return 0;
}

export function parseBreakdownFlags(
  argv: string[],
): { ok: false; message: string } | { ok: true; lanes: OrderPhaseLane[]; jsonStdout: boolean; dryRun: boolean } {
  const LANES: OrderPhaseLane[] = [
    "frontend",
    "backend",
    "api",
    "data",
    "auth",
    "infra",
    "docs",
    "qa",
    "integration",
  ];
  const lanes: OrderPhaseLane[] = [];
  let jsonStdout = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--json") {
      jsonStdout = true;
      continue;
    }
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a === "--lane" && argv[i + 1]) {
      const v = argv[++i] as OrderPhaseLane;
      if (!LANES.includes(v)) {
        return { ok: false, message: `Invalid --lane "${v}". Use: ${LANES.join(", ")}` };
      }
      lanes.push(v);
      continue;
    }
  }

  return { ok: true, lanes, jsonStdout, dryRun };
}

export { usageBreakdown };
