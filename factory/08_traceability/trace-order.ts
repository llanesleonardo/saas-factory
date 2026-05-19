/**
 * `mfg trace order <orderId> [--json] [--rebuild]`
 *
 * Read the order-level traceability index at
 *   `factory/08_traceability/orders/<orderId>.json`
 * and print a human-readable chain: phases → tasks → sprints → prompts →
 * telemetry events. Use `--json` to dump the index verbatim (handy for piping
 * into other tools). `--rebuild` regenerates the index before printing — use
 * this when you've just marked tasks done and want a fresh view in one shot.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildOneOrder, logBuild } from "./trace-build.js";
import { traceOrderIndexRelPath } from "../factory_libs/traceability/trace-types.js";
import type {
  TraceEventRef,
  TraceOrderRef,
  TracePhaseRef,
  TraceSprintRef,
  TraceTaskRef,
} from "../factory_libs/traceability/trace-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

interface Opts {
  orderId: string;
  json: boolean;
  rebuild: boolean;
  /** Cap how many telemetry events to print in stdout mode (the .json file has them all). */
  eventsLimit: number;
}

function usage(): void {
  console.error(`Usage:
  npm run mfg -- trace order <orderId> [--json] [--rebuild] [--events N]

Print the traceability chain for one order: phases → tasks → sprints →
prompts → telemetry events. Reads
  factory/08_traceability/orders/<orderId>.json

Flags:
  --json        Dump the full index as JSON (no human-readable formatting).
  --rebuild     Regenerate the index from source first, then print.
  --events N    Only print the most recent N telemetry events (default: 20).
                The on-disk index always contains every matched event.
`);
}

function parseCli(argv: string[]): Opts {
  let orderId: string | undefined;
  let json = false;
  let rebuild = false;
  let eventsLimit = 20;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    }
    if (a === "--json") { json = true; continue; }
    if (a === "--rebuild") { rebuild = true; continue; }
    if (a === "--events" && argv[i + 1]) {
      const n = parseInt(argv[++i]!, 10);
      if (!Number.isFinite(n) || n < 0) {
        console.error(`trace order: --events must be a non-negative integer`);
        process.exit(1);
      }
      eventsLimit = n;
      continue;
    }
    if (a.startsWith("--")) {
      console.error(`trace order: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    if (!orderId) {
      orderId = a;
      continue;
    }
    console.error(`trace order: unexpected positional "${a}".`);
    process.exit(1);
  }
  if (!orderId) {
    usage();
    process.exit(1);
  }
  return { orderId: orderId.trim(), json, rebuild, eventsLimit };
}

async function loadIndex(orderId: string): Promise<TraceOrderRef> {
  const rel = traceOrderIndexRelPath(orderId);
  const abs = path.join(REPO_ROOT, rel);
  let text: string;
  try {
    text = await readFile(abs, "utf8");
  } catch {
    throw new Error(
      `Index missing at ${rel}. Build it first:\n  npm run mfg -- trace build ${orderId}`,
    );
  }
  return JSON.parse(text) as TraceOrderRef;
}

function renderPhase(p: TracePhaseRef, tasks: TraceTaskRef[]): string[] {
  const lines: string[] = [];
  const headerStatus = `[${p.status}]`.padEnd(14);
  lines.push(`─ ${headerStatus} ${p.id}  ${p.title}`);
  if (p.dependsOn?.length) {
    lines.push(`    depends on: ${p.dependsOn.join(", ")}`);
  }
  if (p.breakdownPath) {
    lines.push(`    breakdown:  ${p.breakdownPath}`);
  }
  if (p.pointers && Object.keys(p.pointers).length > 0) {
    const ptr = Object.entries(p.pointers)
      .map(([k, v]) => `${k}=${v}`)
      .join("  ");
    lines.push(`    materials:  ${ptr}`);
  }
  if (p.taskIds.length === 0) {
    lines.push(`    (no tasks broken down for this phase yet)`);
    return lines;
  }
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  for (const tid of p.taskIds) {
    const t = tasksById.get(tid);
    if (!t) continue;
    const status = `[${t.status}]`.padEnd(14);
    const lane = t.workcenters?.[0] ? ` [${t.workcenters[0]}]` : "";
    const blocked = t.blockedReason ? `  blocked: ${t.blockedReason}` : "";
    const prompt = t.promptPath ? `\n        prompt: ${t.promptPath}` : "";
    lines.push(`    ${status} ${t.id}${lane}${blocked}${prompt}`);
  }
  return lines;
}

function renderSprint(sp: TraceSprintRef): string[] {
  const lines: string[] = [];
  lines.push(`─ sprint #${sp.number}  ${sp.title ?? "(no title)"}`);
  if (sp.goal) lines.push(`    goal:   ${sp.goal}`);
  lines.push(`    folder: ${sp.folder}`);
  for (const [id, row] of Object.entries(sp.workstations)) {
    const enter = row.enteredAt ? ` entered=${row.enteredAt.slice(0, 19)}` : "";
    const exit = row.exitedAt ? ` exited=${row.exitedAt.slice(0, 19)}` : "";
    lines.push(`    ${id.padEnd(20)} ${row.status}${enter}${exit}`);
  }
  if (sp.promptPaths.length > 0) {
    lines.push(`    prompts written: ${sp.promptPaths.length}`);
    for (const p of sp.promptPaths.slice(0, 5)) {
      lines.push(`      - ${p}`);
    }
    if (sp.promptPaths.length > 5) {
      lines.push(`      …and ${sp.promptPaths.length - 5} more (see ${sp.folder}prompts/)`);
    }
  }
  return lines;
}

function renderEvent(ev: TraceEventRef): string {
  const ts = ev.ts ? ev.ts.slice(0, 19) : "(no ts)";
  const dur = typeof ev.durationMs === "number" ? ` ${ev.durationMs}ms` : "";
  const outcome = ev.outcome ? ` ${ev.outcome}` : "";
  const ws = ev.workstation ? ` [${ev.workstation}]` : "";
  const cmd = ev.command ? `  ${ev.command}` : "";
  return `    ${ts}${ws}  ${ev.kind}${outcome}${dur}${cmd}`;
}

function printHuman(idx: TraceOrderRef, opts: Opts): void {
  console.log();
  console.log(`Trace — ${idx.orderId} / ${idx.productId}`);
  console.log(`  Built:    ${idx.builtAt}`);
  if (idx.lifecycle?.status) {
    const lc = idx.lifecycle;
    console.log(`  Lifecycle: ${lc.status}${lc.setAt ? ` (${lc.setAt.slice(0, 19)})` : ""}${lc.reason ? ` — ${lc.reason}` : ""}`);
  }
  console.log();
  console.log(`Source pointers:`);
  for (const [k, v] of Object.entries(idx.source)) {
    if (v) console.log(`  ${k.padEnd(18)} ${v}`);
  }
  console.log();
  const c = idx.counts;
  console.log(
    `Counts: phases=${c.phases}  tasks=${c.tasks.total} ` +
      `(done=${c.tasks.done}, in_progress=${c.tasks.in_progress}, ` +
      `backlog=${c.tasks.backlog}, blocked=${c.tasks.blocked})  ` +
      `sprints=${c.sprints}  events=${c.events}  components=${c.components}`,
  );

  if (idx.components.length > 0) {
    console.log();
    console.log(`Components (from configs/apps/${idx.productId}/scaffold-run.json):`);
    for (const co of idx.components) {
      const tag = co.sentinel ? "[sentinel] " : "";
      const appliedSummary = co.sentinel
        ? "no-op"
        : `${co.applied.filesWritten}f/${co.applied.depsAdded}d/${co.applied.envAdded}e` +
          (co.applied.depsConflicted > 0 ? ` ⚠ ${co.applied.depsConflicted} dep conflict(s)` : "");
      console.log(
        `  ${tag}${co.capability.padEnd(14)} → ${co.componentId} v${co.version}  (${appliedSummary})`,
      );
      if (co.manifestPath) console.log(`        ${co.manifestPath}`);
    }
  }

  if (idx.phases.length > 0) {
    console.log();
    console.log(`Phases (with tasks):`);
    for (const p of idx.phases) {
      for (const line of renderPhase(p, idx.tasks)) console.log(line);
    }
  } else {
    console.log();
    console.log(`Phases: (none — run \`mfg app bdphase -- ${idx.orderId}\` to bootstrap)`);
  }

  // Tasks that aren't in any phase (legacy or pre-build-tasks) — surface them.
  const orphanTasks = idx.tasks.filter((t) => !t.phaseId);
  if (orphanTasks.length > 0) {
    console.log();
    console.log(`Tasks with no phase (legacy / pre-build-tasks):`);
    for (const t of orphanTasks) {
      const status = `[${t.status}]`.padEnd(14);
      console.log(`    ${status} ${t.id}  ${t.title}`);
    }
  }

  if (idx.sprints.length > 0) {
    console.log();
    console.log(`Sprints:`);
    for (const sp of idx.sprints) {
      for (const line of renderSprint(sp)) console.log(line);
    }
  } else {
    console.log();
    console.log(`Sprints: (none yet — \`mfg sprint init ${idx.orderId} ${idx.productId} …\`)`);
  }

  if (idx.events.length > 0) {
    console.log();
    const limit = opts.eventsLimit;
    const slice =
      limit > 0 && idx.events.length > limit
        ? idx.events.slice(-limit)
        : idx.events;
    const heading =
      limit > 0 && idx.events.length > limit
        ? `Telemetry (most recent ${slice.length} of ${idx.events.length}):`
        : `Telemetry (${idx.events.length} events):`;
    console.log(heading);
    for (const ev of slice) console.log(renderEvent(ev));
    if (limit > 0 && idx.events.length > limit) {
      console.log(
        `    …${idx.events.length - slice.length} earlier events in the on-disk index (\`--events 0\` to print all, or \`--json\` for the full record).`,
      );
    }
  }
  console.log();
}

async function main(): Promise<number> {
  const opts = parseCli(process.argv.slice(2));

  if (opts.rebuild) {
    const report = await buildOneOrder(opts.orderId);
    await logBuild(report);
    if (report.reason === "no-product-id") {
      console.error(
        `trace order: cannot rebuild ${opts.orderId} — could not resolve productId.\n` +
          `  Make sure factory/01_production_planning/01_00_work_orders/${opts.orderId}/order-manifest.json ` +
          `or order-phases.json exists, or pass --product on \`trace build\`.`,
      );
      return 1;
    }
  }

  const idx = await loadIndex(opts.orderId);

  if (opts.json) {
    console.log(JSON.stringify(idx, null, 2));
    return 0;
  }

  printHuman(idx, opts);
  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { main as runTraceOrder };
