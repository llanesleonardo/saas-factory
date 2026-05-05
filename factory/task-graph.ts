import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Optional on each task; omitted means `backlog` for planning. */
export type TaskStatus = "backlog" | "ready" | "in_progress" | "blocked" | "done";

export type FactoryTask = {
  id: string;
  title: string;
  depends_on?: string[];
  status?: TaskStatus;
  /** Higher runs first when multiple tasks are startable. */
  priority?: number;
  blocked_reason?: string;
  owner?: string;
  /** e.g. GitHub app label bucket — for display / future routing only. */
  app?: string;
};

const TASK_STATUSES: readonly TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "done",
] as const;

export function normalizeTaskStatus(task: FactoryTask): TaskStatus {
  const s = task.status;
  if (s === undefined || s === null) {
    return "backlog";
  }
  if (!TASK_STATUSES.includes(s)) {
    throw new Error(
      `Invalid status "${String(s)}" on task ${task.id}; allowed: ${TASK_STATUSES.join(", ")}`,
    );
  }
  return s;
}

export function isTaskDone(task: FactoryTask): boolean {
  return normalizeTaskStatus(task) === "done";
}

export function assertQueueIntegrity(tasks: FactoryTask[]): void {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) {
    for (const depId of t.depends_on ?? []) {
      if (!byId.has(depId)) {
        throw new Error(`Task ${t.id}: unknown dependency "${depId}"`);
      }
    }
  }
}

type TaskQueueFile = FactoryTask[] | { tasks: FactoryTask[] };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadTaskQueue(
  queuePath = path.join(__dirname, "task-queue.json"),
): Promise<FactoryTask[]> {
  const raw = await readFile(queuePath, "utf8");
  const parsed = JSON.parse(raw) as TaskQueueFile;
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  if (!Array.isArray(tasks)) {
    throw new Error("task-queue.json must be a Task[] or { tasks: Task[] }");
  }
  return tasks;
}

/**
 * Tasks that may run in parallel share the same wave index (no inter-dependencies within a wave).
 */
export function computeParallelBatches(tasks: FactoryTask[]): FactoryTask[][] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const pending = new Set(
    tasks.filter((t) => !isTaskDone(t)).map((t) => t.id),
  );
  const batches: FactoryTask[][] = [];

  while (pending.size > 0) {
    const readyIds = [...pending].filter((id) => {
      const t = byId.get(id)!;
      const deps = t.depends_on ?? [];
      return deps.every((d) => !pending.has(d));
    });

    if (readyIds.length === 0) {
      throw new Error("Circular or missing dependency in task-queue.json");
    }

    readyIds.sort();
    const batch = readyIds.map((id) => byId.get(id)!);
    batches.push(batch);
    for (const id of readyIds) {
      pending.delete(id);
    }
  }

  return batches;
}

/** Linear order respecting depends_on (flattened parallel waves). */
export function orderTasks(tasks: FactoryTask[]): FactoryTask[] {
  return computeParallelBatches(tasks).flat();
}
