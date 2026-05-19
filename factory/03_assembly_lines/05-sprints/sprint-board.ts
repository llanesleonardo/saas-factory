/**
 * `mfg sprint board <orderId> <productId> [--sprint N] [--no-write] [--json]`
 *
 * One-screen view of the current sprint: every task for this app grouped by
 * phase + workstation, current workstation status, the next ready task, and
 * the two commands to take next (`sprint task prompt …`, then `line done …`).
 *
 * Auto-sync behavior: the 4 workstation rows in `sprint.json` are derived
 * from the task queue. Every `sprint board` run RE-COMPUTES them and writes
 * the result back to `sprint.json`. Pass `--no-write` to keep board purely
 * read-only (useful in CI). Manual flips via `sprint workstation` still work
 * for edge cases — they just get overwritten the next time you look at the
 * board (which is the intended behavior for "rows reflect the queue").
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { orderPhasesPath } from "../../factory_libs/paths/app-config-paths.js";
import type { FactoryTask } from "../../factory_libs/planning/task-graph.js";
import type { OrderPhasesDoc } from "../../factory_libs/orders/order-phases-types.js";
import { sprintJsonPath, sprintProductDir } from "../../factory_libs/sprints/sprint-paths.js";
import type { SprintRecordDoc } from "../../factory_libs/sprints/sprint-types.js";
import { SPRINT_WORKSTATION_IDS } from "../../factory_libs/sprints/sprint-types.js";
import {
  countByStatus,
  effectiveStatus,
  filterTasksForOrder,
  findNextReadyTask,
  groupTasksByPhase,
} from "../../factory_libs/sprints/sprint-task-selection.js";
import {
  computeWorkstationStatuses,
  diffWorkstations,
} from "../../factory_libs/sprints/sprint-advance-rules.js";
import { loadTaskQueueRaw } from "../../factory_libs/sprints/sprint-task-queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

interface Opts {
  orderId: string;
  productId: string;
  sprintNumber?: number;
  json: boolean;
  /** When true, do NOT write computed workstation states back to sprint.json. */
  noWrite: boolean;
}

function usage(): void {
  console.error(`Usage:
  npm run mfg -- sprint board <orderId> <productId> [--sprint N] [--no-write] [--json]

Shows every task for this app scoped to this order, grouped by phase, with
counts and the next ready task. Auto-syncs the 4 workstation rows in
sprint.json from the task queue (use --no-write to skip the write).

If --sprint is omitted, the highest-numbered sprint folder is used.
`);
}

function parseCli(argv: string[]): Opts {
  const rest: string[] = [];
  let sprintNumber: number | undefined;
  let json = false;
  let noWrite = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    }
    if (a === "--json") { json = true; continue; }
    if (a === "--no-write") { noWrite = true; continue; }
    if (a === "--sprint" && argv[i + 1]) {
      const n = parseInt(argv[++i]!, 10);
      if (!Number.isFinite(n) || n < 1) {
        console.error(`sprint board: --sprint must be a positive integer`);
        process.exit(1);
      }
      sprintNumber = n;
      continue;
    }
    if (a.startsWith("--")) {
      console.error(`sprint board: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    rest.push(a);
  }
  if (rest.length < 2) {
    usage();
    process.exit(1);
  }
  return { orderId: rest[0]!.trim(), productId: rest[1]!.trim(), sprintNumber, json, noWrite };
}

async function readLatestSprintNumber(orderId: string, productId: string): Promise<number | null> {
  const root = sprintProductDir(REPO_ROOT, orderId, productId);
  try {
    const entries = await (await import("node:fs/promises")).readdir(root, { withFileTypes: true });
    const nums: number[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const m = /^sprint-(\d+)$/.exec(e.name);
      if (m) nums.push(parseInt(m[1]!, 10));
    }
    nums.sort((a, b) => b - a);
    return nums[0] ?? null;
  } catch {
    return null;
  }
}

function shortenStatus(s: string): string {
  if (s === "in_progress") return "in_prog ";
  if (s === "not_started") return "not_strt";
  return s.padEnd(8);
}

function pickAppFolder(slug: string, tasks: FactoryTask[]): string {
  // Prefer the new nested layout; fall back to legacy if any task points there.
  const apps = new Set(tasks.map((t) => (t.app ?? "").trim()).filter(Boolean));
  if (apps.has(`apps/${slug}/${slug}-instance`)) return `apps/${slug}/${slug}-instance`;
  if (apps.has(`apps/${slug}-instance`)) return `apps/${slug}-instance`;
  return `apps/${slug}/${slug}-instance`;
}

async function main(): Promise<number> {
  const opts = parseCli(process.argv.slice(2));

  const sprintN =
    opts.sprintNumber ?? (await readLatestSprintNumber(opts.orderId, opts.productId));
  if (!sprintN) {
    console.error(
      `No sprint found under ${path.relative(REPO_ROOT, sprintProductDir(REPO_ROOT, opts.orderId, opts.productId))}.\n` +
        `Run: npm run mfg -- sprint init ${opts.orderId} ${opts.productId}`,
    );
    return 1;
  }

  const sprintPath = sprintJsonPath(REPO_ROOT, opts.orderId, opts.productId, sprintN);
  let sprint: SprintRecordDoc;
  try {
    sprint = JSON.parse(await readFile(sprintPath, "utf8")) as SprintRecordDoc;
  } catch (e) {
    console.error(`Cannot read ${path.relative(REPO_ROOT, sprintPath)}: ${(e as Error).message}`);
    return 1;
  }

  const phasesPath = orderPhasesPath(REPO_ROOT, opts.orderId);
  let phasesDoc: OrderPhasesDoc;
  try {
    phasesDoc = JSON.parse(await readFile(phasesPath, "utf8")) as OrderPhasesDoc;
  } catch (e) {
    console.error(
      `Cannot read ${path.relative(REPO_ROOT, phasesPath)}: ${(e as Error).message}\n` +
        `Run: npm run mfg -- app bdphase -- ${opts.orderId}`,
    );
    return 1;
  }

  const queue = await loadTaskQueueRaw(REPO_ROOT);
  const scoped = filterTasksForOrder(queue.tasks, phasesDoc, opts.productId);
  const groups = groupTasksByPhase(scoped, phasesDoc);
  const counts = countByStatus(scoped);
  const computed = computeWorkstationStatuses(scoped, phasesDoc);
  const drift = diffWorkstations(sprint, computed);
  const next = findNextReadyTask(scoped);
  const appFolder = pickAppFolder(opts.productId, scoped);

  // Auto-sync: apply computed state to the in-memory doc, write back unless
  // --no-write is set. We record drift first so we can print it accurately
  // (after the write, current == computed and the diff would be empty).
  let synced = false;
  if (drift.length > 0 && !opts.noWrite) {
    const now = new Date().toISOString();
    for (const d of drift) {
      const row = sprint.workstations[d.id];
      if (d.to === "in_progress" && row.status !== "in_progress") row.enteredAt = now;
      if (
        ["done", "skipped", "blocked", "not_started"].includes(d.to) &&
        row.status === "in_progress"
      ) {
        row.exitedAt = now;
      }
      row.status = d.to;
    }
    sprint.updatedAt = now;
    await writeFile(sprintPath, JSON.stringify(sprint, null, 2) + "\n", "utf8");
    synced = true;
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          orderId: opts.orderId,
          productId: opts.productId,
          sprintNumber: sprintN,
          sprintTitle: sprint.title ?? null,
          sprintGoal: sprint.goal ?? null,
          appFolder,
          counts,
          phaseGroups: groups.map((g) => ({
            phaseId: g.phase.id,
            phaseTitle: g.phase.title,
            phaseStatus: g.phase.status,
            workstationId: g.workstationId,
            tasks: g.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: effectiveStatus(t),
              lane: t.workcenters?.[0] ?? null,
              priority: t.priority ?? null,
              depends_on: t.depends_on ?? [],
            })),
          })),
          workstations: {
            current: Object.fromEntries(SPRINT_WORKSTATION_IDS.map((id) => [id, sprint.workstations[id].status])),
            computed,
            drift,
            synced,
          },
          nextReady: next
            ? {
                id: next.id,
                title: next.title,
                phase: next.order_phase_id ?? null,
                lane: next.workcenters?.[0] ?? null,
              }
            : null,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  console.log(`\nSprint #${sprintN} — ${opts.orderId} / ${opts.productId}`);
  if (sprint.title) console.log(`  Title: ${sprint.title}`);
  if (sprint.goal) console.log(`  Goal:  ${sprint.goal}`);
  console.log(`  App folder: ${appFolder}/`);
  console.log();

  if (scoped.length === 0) {
    console.log(
      "  (no tasks scoped to this order — run `npm run mfg -- app build-tasks -- " + opts.orderId + "` to populate)",
    );
  } else {
    console.log("Phases & tasks:");
    for (const g of groups) {
      console.log(
        `\n─ ${g.phase.id} (${g.phase.status}) → workstation: ${g.workstationId}`,
      );
      for (const t of g.tasks) {
        const status = `[${shortenStatus(effectiveStatus(t))}]`;
        const lane = t.workcenters?.[0] ? ` [${t.workcenters[0]}]` : "";
        const deps =
          t.depends_on && t.depends_on.length > 0
            ? `   needs: ${t.depends_on.map((d) => d.split("_").slice(-2).join("_")).join(", ")}`
            : "";
        console.log(`    ${status} ${t.id}${lane}${deps}`);
      }
    }
    console.log();
    console.log(
      `Counts: ${counts.total} total | ${counts.done} done · ${counts.in_progress} in_progress · ${counts.backlog} backlog · ${counts.blocked} blocked`,
    );
  }

  console.log();
  console.log(`Workstations (sprint #${sprintN})`);
  for (const id of SPRINT_WORKSTATION_IDS) {
    const cur = sprint.workstations[id].status;
    const calc = computed[id];
    const drifted = drift.find((d) => d.id === id);
    const marker = drifted ? "*" : " ";
    let note = "";
    if (drifted) {
      note = synced ? `   (synced ${drifted.from} → ${calc})` : `   (queue says: ${calc})`;
    }
    console.log(`  ${marker} ${id.padEnd(20)} ${cur}${note}`);
  }
  if (drift.length > 0) {
    if (synced) {
      console.log(`  * = auto-synced from the task queue (pass --no-write to skip the write).`);
    } else {
      console.log(`  * = drift between sprint.json and the task queue (run \`sprint board\` again without --no-write to sync).`);
    }
  } else {
    console.log(`  (rows in sync with the task queue)`);
  }

  console.log();
  if (next) {
    console.log(`Next ready: ${next.id}`);
    console.log(`            ${next.title}`);
    if (next.workcenters?.[0]) console.log(`            lane: ${next.workcenters[0]}`);
    console.log();
    console.log(`  1) Get the agent prompt (writes a .md you can open in the app's Cursor window):`);
    console.log(`       npm run mfg -- sprint task prompt ${next.id}`);
    console.log(`  2) When the agent is done, mark the task complete:`);
    console.log(`       npm run mfg -- line done ${next.id}`);
    console.log(`  3) Re-run \`sprint board\` to refresh workstation rows.`);
  } else if (scoped.length === 0) {
    console.log(`No tasks to pull (queue is empty for this order).`);
  } else if (counts.done === scoped.length) {
    console.log(`All ${counts.done} task(s) done. Suggested next steps:`);
    console.log(`  npm run mfg -- gates review ${opts.orderId} ${opts.productId}`);
    console.log(`  npm run mfg -- deploy preview -- --dry-run`);
    console.log(`  npm run mfg -- app verified -- add ${opts.productId}`);
  } else {
    console.log(`No ready task (all remaining are blocked or in-progress).`);
  }
  console.log();
  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { main as runSprintBoard };
