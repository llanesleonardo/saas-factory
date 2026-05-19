import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadTaskQueue, normalizeTaskStatus, type FactoryTask, type TaskStatus } from "../factory_libs/planning/task-graph.js";

type StatusSummary = {
  queue: string;
  totals: Record<TaskStatus, number>;
  total: number;
  done: number;
  open: number;
  open_tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority?: number;
    depends_on?: string[];
    owner?: string;
    app?: string;
  }>;
  in_progress: Array<{ id: string; title: string; owner?: string; app?: string }>;
  blocked: Array<{ id: string; title: string; blocked_reason?: string; app?: string }>;
};

function parseQueuePath(argv: string[]): string | undefined {
  const eq = argv.find((a) => a.startsWith("--queue="));
  if (eq) return path.resolve(eq.slice("--queue=".length));
  return undefined;
}

function initTotals(): Record<TaskStatus, number> {
  return { backlog: 0, ready: 0, in_progress: 0, blocked: 0, done: 0 };
}

function summarize(queueLabel: string, tasks: FactoryTask[]): StatusSummary {
  const totals = initTotals();
  const inProgress: StatusSummary["in_progress"] = [];
  const blocked: StatusSummary["blocked"] = [];
  const openTasks: StatusSummary["open_tasks"] = [];

  for (const t of tasks) {
    const st = normalizeTaskStatus(t);
    totals[st] += 1;
    if (st === "in_progress") inProgress.push({ id: t.id, title: t.title, owner: t.owner, app: t.app });
    if (st === "blocked") blocked.push({ id: t.id, title: t.title, blocked_reason: t.blocked_reason, app: t.app });
    if (st !== "done") {
      openTasks.push({
        id: t.id,
        title: t.title,
        status: st,
        priority: t.priority,
        depends_on: t.depends_on,
        owner: t.owner,
        app: t.app,
      });
    }
  }

  const done = totals.done;
  const total = tasks.length;
  const open = total - done;

  inProgress.sort((a, b) => a.id.localeCompare(b.id));
  blocked.sort((a, b) => a.id.localeCompare(b.id));
  openTasks.sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pb !== pa) return pb - pa;
    return a.id.localeCompare(b.id);
  });

  return { queue: queueLabel, totals, total, done, open, open_tasks: openTasks, in_progress: inProgress, blocked };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const queuePath = parseQueuePath(argv);

  const tasks = queuePath !== undefined ? await loadTaskQueue(queuePath) : await loadTaskQueue();
  const summary = summarize(queuePath ?? "factory/03_assembly_lines/03-registry/registry/task-queue.json", tasks);

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Factory status: ${summary.queue}`);
  console.log("");
  console.log(`  total: ${summary.total}`);
  console.log(`  done:  ${summary.done}`);
  console.log(`  open:  ${summary.open}`);
  console.log("");
  console.log("By status:");
  console.log(`  backlog:     ${summary.totals.backlog}`);
  console.log(`  ready:       ${summary.totals.ready}`);
  console.log(`  in_progress: ${summary.totals.in_progress}`);
  console.log(`  blocked:     ${summary.totals.blocked}`);
  console.log(`  done:        ${summary.totals.done}`);

  if (summary.in_progress.length > 0) {
    console.log("\nIn progress:");
    for (const t of summary.in_progress) {
      console.log(`  - ${t.id}: ${t.title}${t.owner ? ` (owner=${t.owner})` : ""}${t.app ? ` (app=${t.app})` : ""}`);
    }
  }

  if (summary.blocked.length > 0) {
    console.log("\nBlocked:");
    for (const t of summary.blocked) {
      console.log(
        `  - ${t.id}: ${t.title}${t.blocked_reason ? ` (reason=${t.blocked_reason})` : ""}${t.app ? ` (app=${t.app})` : ""}`,
      );
    }
  }
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

