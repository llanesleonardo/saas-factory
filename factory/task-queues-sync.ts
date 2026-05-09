import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type FactoryTask, isTaskDone, loadTaskQueue } from "./task-graph.js";

type SyncResult = {
  files_written: string[];
  queues: Array<{ queue_id: string; file: string; task_count: number }>;
};

function safeQueueIdFromApp(app: string): string {
  const trimmed = app.trim().replace(/\/+$/g, "");
  if (!trimmed) return "unassigned";
  // Preserve common separators. Normalize path-ish separators into dots.
  // apps/todo-instance -> apps.todo-instance
  return trimmed
    .replace(/[^A-Za-z0-9._/-]+/g, ".")
    .replace(/\//g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");
}

function queueFileName(queueId: string): string {
  return `${queueId}.json`;
}

function groupByApp(tasks: FactoryTask[]): Map<string, FactoryTask[]> {
  const m = new Map<string, FactoryTask[]>();
  for (const t of tasks) {
    let app = typeof t.app === "string" && t.app.trim().length > 0 ? t.app.trim() : "unassigned";
    // Normalize mistaken "app" values that point to a file path (e.g. factory/task-queue.json)
    if (app.includes(".json")) {
      const dir = path.posix.dirname(app);
      app = dir === "." ? "unassigned" : dir;
    }
    const id = safeQueueIdFromApp(app);
    const list = m.get(id) ?? [];
    list.push(t);
    m.set(id, list);
  }
  return m;
}

function buildQueueTasksForApp(appTasks: FactoryTask[], globalById: Map<string, FactoryTask>): FactoryTask[] {
  // Per-app queues are "dependency-closed": they include the app's tasks plus any dependencies
  // (even if those dependencies are owned by a different app). This keeps each queue self-contained
  // for planning and validation.
  const out = new Map<string, FactoryTask>();
  const stack: string[] = [];

  for (const t of appTasks) {
    out.set(t.id, t);
    stack.push(t.id);
  }

  while (stack.length > 0) {
    const id = stack.pop()!;
    const t = globalById.get(id) ?? out.get(id);
    if (!t) continue;
    for (const depId of t.depends_on ?? []) {
      if (out.has(depId)) continue;
      const dep = globalById.get(depId);
      if (!dep) continue;
      out.set(depId, dep);
      stack.push(depId);
    }
  }

  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");

  const argv = process.argv.slice(2);
  const queueArg = argv.find((a) => a.startsWith("--queue="));
  const inputQueuePath = queueArg ? path.resolve(queueArg.slice("--queue=".length)) : path.join(__dirname, "task-queue.json");

  const outDir = path.join(repoRoot, "factory", "task-queues");
  await mkdir(outDir, { recursive: true });

  const tasks = await loadTaskQueue(inputQueuePath);
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const groups = groupByApp(tasks);

  const files_written: string[] = [];
  const queues: SyncResult["queues"] = [];

  for (const [queueId, appTasks] of groups) {
    const queueTasks = buildQueueTasksForApp(appTasks, byId);
    const file = path.join(outDir, queueFileName(queueId));
    await writeFile(file, JSON.stringify(queueTasks, null, 2) + "\n", "utf8");
    files_written.push(path.relative(repoRoot, file));
    queues.push({ queue_id: queueId, file: path.relative(repoRoot, file), task_count: queueTasks.length });
  }

  // Write an index file for discoverability.
  const index = {
    generated_at_utc: new Date().toISOString(),
    input_queue: path.relative(repoRoot, inputQueuePath),
    queues: queues.sort((a, b) => a.queue_id.localeCompare(b.queue_id)),
  };
  const indexFile = path.join(outDir, "index.json");
  await writeFile(indexFile, JSON.stringify(index, null, 2) + "\n", "utf8");
  files_written.push(path.relative(repoRoot, indexFile));

  const result: SyncResult = { files_written, queues: index.queues };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

