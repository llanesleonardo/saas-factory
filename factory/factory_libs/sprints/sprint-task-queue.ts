/**
 * Read/write helpers for the canonical task-queue.json.
 *
 * `loadTaskQueueRaw` keeps the array/object shape so we can write back
 * without changing the file's outer container. `updateTaskStatus` returns
 * the previous status (or null when the id wasn't found) so the CLI can
 * print a clear before→after line.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import type { FactoryTask, TaskStatus } from "../planning/task-graph.js";

export type { TaskStatus } from "../planning/task-graph.js";

export const TASK_QUEUE_REL = "factory/03_assembly_lines/03-registry/registry/task-queue.json";

export interface RawQueue {
  /** Reconstructed array of tasks (whether the file is `[]` or `{ tasks: [] }`). */
  tasks: FactoryTask[];
  /** True if the file is `{ tasks: [...] }`. */
  wrapped: boolean;
  /** Original parsed shape (used to preserve sibling keys when wrapped). */
  raw: unknown;
  /** Absolute path. */
  filePath: string;
}

/**
 * Load the canonical task-queue.json (or a custom path when provided).
 * Preserves the file's outer shape so writes don't surprise downstream tools.
 */
export async function loadTaskQueueRaw(
  repoRoot: string,
  filePathOverride?: string,
): Promise<RawQueue> {
  const filePath = filePathOverride ?? path.join(repoRoot, TASK_QUEUE_REL);
  const text = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) {
    return { tasks: parsed as FactoryTask[], wrapped: false, raw: parsed, filePath };
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { tasks?: unknown }).tasks)) {
    return {
      tasks: (parsed as { tasks: FactoryTask[] }).tasks,
      wrapped: true,
      raw: parsed,
      filePath,
    };
  }
  throw new Error(`Unexpected shape in ${TASK_QUEUE_REL} (expected Task[] or { tasks: Task[] }).`);
}

export async function saveTaskQueue(q: RawQueue): Promise<void> {
  const out = q.wrapped
    ? { ...(q.raw as Record<string, unknown>), tasks: q.tasks }
    : q.tasks;
  await fs.writeFile(q.filePath, JSON.stringify(out, null, 2) + "\n", "utf8");
}

export interface StatusUpdate {
  id: string;
  from: TaskStatus | "unknown";
  to: TaskStatus;
  blockedReason?: string;
}

/**
 * Apply a status change to one task in the raw queue. Returns null if the id
 * wasn't found. Caller is responsible for `saveTaskQueue`.
 */
export function updateTaskStatus(
  q: RawQueue,
  id: string,
  next: TaskStatus,
  opts: { blockedReason?: string } = {},
): StatusUpdate | null {
  const t = q.tasks.find((x) => x.id === id.trim());
  if (!t) return null;
  const from = (t.status ?? "backlog") as TaskStatus;
  t.status = next;
  if (next === "blocked" && opts.blockedReason) {
    t.blocked_reason = opts.blockedReason;
  } else if (next !== "blocked") {
    if (t.blocked_reason !== undefined) delete t.blocked_reason;
  }
  return { id: t.id, from, to: next, blockedReason: opts.blockedReason };
}
