/**
 * Read-only probes for factory/05_metrics — no secrets, no writes.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { readAssemblyLineDay, type AssemblyLineLogEvent } from "../../03_assembly_lines/07-telemetry/assembly-line-log.js";
import { readRunHistory } from "../../factory_internal_ops/telemetry.js";

export type TaskQueueRow = {
  status?: string;
};

export type TaskQueueSummary = {
  total: number;
  done: number;
  in_progress: number;
  blocked: number;
  ready: number;
  backlog: number;
};

const TASK_QUEUE_REL = path.join(
  "factory",
  "03_assembly_lines",
  "03-registry",
  "registry",
  "task-queue.json",
);

export async function loadTaskQueueSummary(repoRoot: string): Promise<TaskQueueSummary> {
  const p = path.join(repoRoot, TASK_QUEUE_REL);
  let raw: string;
  try {
    raw = await readFile(p, "utf8");
  } catch {
    return { total: 0, done: 0, in_progress: 0, blocked: 0, ready: 0, backlog: 0 };
  }
  const arr = JSON.parse(raw) as unknown;
  if (!Array.isArray(arr)) {
    return { total: 0, done: 0, in_progress: 0, blocked: 0, ready: 0, backlog: 0 };
  }
  const out: TaskQueueSummary = { total: arr.length, done: 0, in_progress: 0, blocked: 0, ready: 0, backlog: 0 };
  for (const row of arr as TaskQueueRow[]) {
    const s = row.status ?? "backlog";
    if (s === "done") out.done += 1;
    else if (s === "in_progress") out.in_progress += 1;
    else if (s === "blocked") out.blocked += 1;
    else if (s === "ready") out.ready += 1;
    else out.backlog += 1;
  }
  return out;
}

export function assemblyLineDispatchEnds(events: AssemblyLineLogEvent[]): number {
  return events.filter((e) => e.event_kind === "cli_dispatch_end").length;
}

export function assemblyLineFailureLike(events: AssemblyLineLogEvent[]): number {
  let n = 0;
  for (const e of events) {
    if (e.event_kind === "operation_error" || e.outcome === "fail") n += 1;
  }
  return n;
}

export async function probeTelemetryDay(repoRoot: string, day: string): Promise<{
  dispatch_ends: number;
  failure_like: number;
  run_history_entries: number;
}> {
  const events = await readAssemblyLineDay(repoRoot, day);
  let runHistoryEntries = 0;
  try {
    const rh = await readRunHistory(repoRoot, day);
    runHistoryEntries = rh.length;
  } catch {
    runHistoryEntries = 0;
  }
  return {
    dispatch_ends: assemblyLineDispatchEnds(events),
    failure_like: assemblyLineFailureLike(events),
    run_history_entries: runHistoryEntries,
  };
}

/** Map metric id → suggested string from probes + optional CLI exit codes */
export function suggestedFromProbes(
  tq: TaskQueueSummary,
  tel: { dispatch_ends: number; failure_like: number; run_history_entries: number },
  cli: { check?: number; validateFactory?: number; deployDryRun?: number },
): Record<string, string> {
  const out: Record<string, string> = {
    tasks_total: String(tq.total),
    tasks_by_status_done: String(tq.done),
    tasks_by_status_in_progress: String(tq.in_progress),
    tasks_by_status_blocked: String(tq.blocked),
    tasks_by_status_ready: String(tq.ready),
    telemetry_dispatch_ends_utc_day: String(tel.dispatch_ends),
    telemetry_failure_like_utc_day: String(tel.failure_like),
    run_history_entries_utc_day: String(tel.run_history_entries),
  };
  if (cli.check !== undefined) {
    out.spine_check_last = cli.check === 0 ? "pass" : "fail";
  }
  if (cli.validateFactory !== undefined) {
    out.validate_factory_last = cli.validateFactory === 0 ? "pass" : "fail";
  }
  if (cli.deployDryRun !== undefined) {
    out.delivery_dry_run_last = cli.deployDryRun === 0 ? "pass" : "fail";
  }
  return out;
}
