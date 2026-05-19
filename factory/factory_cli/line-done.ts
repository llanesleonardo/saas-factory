/**
 * `mfg line done` — dual-mode CLI:
 *
 *   • No positional arg     → list every task whose status is `done` (legacy
 *                             read-only behavior used by the assembly-line
 *                             reporting flow).
 *   • <taskId> [--status S] → mutate that task's status in `task-queue.json`.
 *                             Default new status is `done`; pass
 *                             `--status blocked --reason "<why>"` for blocked,
 *                             `--status in_progress`, etc.
 *
 * This is the writer the manual sprint workflow expects: after an agent
 * finishes a task in the app's Cursor window, the human runs
 *
 *     npm run mfg -- line done <taskId>
 *
 * then re-runs `mfg sprint board` to refresh the workstation rows.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertQueueIntegrity,
  isTaskDone,
  loadTaskQueue,
  normalizeTaskStatus,
  type FactoryTask,
} from "../factory_libs/planning/task-graph.js";
import { recordRun, repoRootFromHere } from "../factory_internal_ops/telemetry.js";
import {
  loadTaskQueueRaw,
  saveTaskQueue,
  updateTaskStatus,
  type TaskStatus,
} from "../factory_libs/sprints/sprint-task-queue.js";

function parseQueuePath(argv: string[]): string | undefined {
  const eq = argv.find((a) => a.startsWith("--queue="));
  if (eq) return path.resolve(eq.slice("--queue=".length));
  return undefined;
}

interface WriteOpts {
  taskId: string;
  status: TaskStatus;
  reason?: string;
}

const WRITABLE_STATUSES: ReadonlySet<TaskStatus> = new Set<TaskStatus>([
  "backlog",
  "ready",
  "in_progress",
  "done",
  "blocked",
]);

/**
 * Pluck the writer options out of argv. Returns null when there's no
 * positional task id (i.e. we're in read-only mode).
 */
function parseWriteOpts(argv: string[]): WriteOpts | null {
  const positional: string[] = [];
  let status: TaskStatus = "done";
  let reason: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--json") continue;
    if (a.startsWith("--queue=")) continue;
    if (a === "--status" && argv[i + 1]) {
      const s = argv[++i]!.trim() as TaskStatus;
      if (!WRITABLE_STATUSES.has(s)) {
        console.error(
          `mfg line done: --status "${s}" is not one of ${[...WRITABLE_STATUSES].join(", ")}.`,
        );
        process.exit(1);
      }
      status = s;
      continue;
    }
    if (a === "--reason" && argv[i + 1]) {
      reason = argv[++i]!;
      continue;
    }
    if (a.startsWith("--")) {
      console.error(`mfg line done: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    positional.push(a);
  }

  if (positional.length === 0) return null;
  if (positional.length > 1) {
    console.error(
      `mfg line done: only one <taskId> at a time (got: ${positional.join(", ")}).`,
    );
    process.exit(1);
  }
  return { taskId: positional[0]!.trim(), status, reason };
}

function taskRow(t: FactoryTask): Record<string, unknown> {
  return {
    id: t.id,
    title: t.title,
    status: normalizeTaskStatus(t),
    priority: t.priority,
    phase: t.phase,
    owner: t.owner,
    app: t.app,
  };
}

async function runWriter(opts: WriteOpts, queuePathOverride?: string): Promise<void> {
  const repoRoot = repoRootFromHere(import.meta.url);
  // We use the raw loader to preserve the canonical file shape (array vs
  // { tasks: [...] }) and to avoid mangling unknown task fields.
  const queueAbs = queuePathOverride
    ? queuePathOverride
    : path.join(repoRoot, "factory/03_assembly_lines/03-registry/registry/task-queue.json");
  const raw = await loadTaskQueueRaw(repoRoot, queueAbs);
  const update = updateTaskStatus(raw, opts.taskId, opts.status, { blockedReason: opts.reason });
  if (!update) {
    console.error(`mfg line done: task "${opts.taskId}" not found in ${path.relative(repoRoot, queueAbs)}.`);
    process.exit(1);
  }
  await saveTaskQueue(raw);
  await recordRun(
    repoRoot,
    {
      kind: "command",
      workstation: "03-registry",
      command: `npm run mfg -- line done ${opts.taskId}${opts.status === "done" ? "" : ` --status ${opts.status}`}`,
      queue_path: queueAbs,
      app: "factory/",
    },
    async () => {
      console.log(
        `Updated ${opts.taskId} in ${path.relative(repoRoot, queueAbs)}: ${update.from} → ${update.to}` +
          (opts.reason ? ` (reason: ${opts.reason})` : ""),
      );
      if (opts.status !== "done") {
        console.log(`Re-run \`mfg sprint board\` to refresh workstation rows from the queue.`);
      } else {
        console.log(`Run \`mfg sprint board <orderId> <slug>\` to see the next ready task.`);
      }
    },
  );
}

async function runReader(asJson: boolean, queuePath?: string): Promise<void> {
  const repoRoot = repoRootFromHere(import.meta.url);
  const tasks = queuePath !== undefined ? await loadTaskQueue(queuePath) : await loadTaskQueue();

  await recordRun(
    repoRoot,
    {
      kind: "command",
      workstation: "03-registry",
      command: `npm run mfg -- line done${asJson ? " -- --json" : ""}${queuePath ? ` -- --queue=${queuePath}` : ""}`,
      queue_path: queuePath,
      app: "factory/",
    },
    async () => {
      assertQueueIntegrity(tasks);
      const finished = tasks.filter((t) => isTaskDone(t)).sort((a, b) => a.id.localeCompare(b.id));
      const label = queuePath ?? "factory/03_assembly_lines/03-registry/registry/task-queue.json";

      if (asJson) {
        console.log(
          JSON.stringify(
            {
              kind: "done",
              queue: label,
              count: finished.length,
              total_in_file: tasks.length,
              tasks: finished.map((t) => taskRow(t)),
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log(`Assembly line finished tasks — ${label}`);
      console.log(`  done: ${finished.length} of ${tasks.length} tasks\n`);

      if (finished.length === 0) {
        console.log("  (none yet — mark a task done with: mfg line done <taskId>.)");
        return;
      }

      for (const t of finished) {
        console.log(`  - ${t.id}: ${t.title}`);
      }
    },
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage:
  npm run mfg -- line done                 # list all status=done tasks (read-only)
  npm run mfg -- line done <taskId>        # mark a task done in task-queue.json
  npm run mfg -- line done <taskId> --status blocked --reason "<short why>"
  npm run mfg -- line done <taskId> --status in_progress
Flags:
  --status <s>     One of: backlog, ready, in_progress, done, blocked  (default: done)
  --reason "<txt>" Free-form reason; stored as blocked_reason when --status=blocked
  --queue=<path>   Operate on a non-default queue file
  --json           Read-only listing as JSON
`);
    process.exit(0);
  }
  const asJson = argv.includes("--json");
  const queuePath = parseQueuePath(argv);
  const writeOpts = parseWriteOpts(argv);

  if (writeOpts) {
    await runWriter(writeOpts, queuePath);
    return;
  }
  await runReader(asJson, queuePath);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
