import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertQueueIntegrity,
  isTaskDone,
  loadTaskQueue,
  normalizeTaskStatus,
  orderTasks,
  type FactoryTask,
} from "../factory_libs/planning/task-graph.js";
import { recordRun, repoRootFromHere } from "../factory_internal_ops/telemetry.js";

function parseQueuePath(argv: string[]): string | undefined {
  const eq = argv.find((a) => a.startsWith("--queue="));
  if (eq) return path.resolve(eq.slice("--queue=".length));
  return undefined;
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
    depends_on: t.depends_on,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const queuePath = parseQueuePath(argv);

  const repoRoot = repoRootFromHere(import.meta.url);
  const tasks = queuePath !== undefined ? await loadTaskQueue(queuePath) : await loadTaskQueue();

  await recordRun(
    repoRoot,
    {
      kind: "command",
      workstation: "03-registry",
      command: `npm run mfg -- line queue${asJson ? " -- --json" : ""}${queuePath ? ` -- --queue=${queuePath}` : ""}`,
      queue_path: queuePath,
      app: "factory/",
    },
    async () => {
      assertQueueIntegrity(tasks);
      const remaining = orderTasks(tasks);
      const label = queuePath ?? "factory/03_assembly_lines/03-registry/registry/task-queue.json";

      if (asJson) {
        console.log(
          JSON.stringify(
            {
              kind: "queue",
              queue: label,
              count: remaining.length,
              total_in_file: tasks.length,
              done_count: tasks.filter((t) => isTaskDone(t)).length,
              tasks: remaining.map((t) => taskRow(t)),
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log(`Assembly line queue (not finished yet) — ${label}`);
      console.log(`  remaining: ${remaining.length} of ${tasks.length} tasks\n`);

      if (remaining.length === 0) {
        console.log("  (none — every task is marked done.)");
        return;
      }

      for (const t of remaining) {
        const st = normalizeTaskStatus(t);
        const pri = t.priority !== undefined ? ` p=${t.priority}` : "";
        console.log(`  - ${t.id}: ${t.title} [${st}]${pri}`);
      }
      console.log("");
      console.log("Pull the next executable task with: npm run mfg -- line next");
    },
  );
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
