import { existsSync, readFileSync } from "node:fs";
import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  appendAssemblyLineEvent,
  newAssemblyLineCorrelationId,
  serializeUnknownError,
  type AssemblyLineLogEvent,
} from "../03_assembly_lines/07-telemetry/assembly-line-log.js";

export type TelemetryOutcome = "pass" | "fail" | "aborted";
export type TelemetryKind = "command" | "gate" | "deploy";
export type TelemetryTrigger = "local_cli" | "ci" | "manual";

export type EvidencePointer =
  | { type: "artifact"; label: string; path: string }
  | { type: "file"; label: string; path: string }
  | { type: "url"; label: string; url: string };

export type RunEvent = {
  schema_version: 1;
  timestamp_utc: string;
  started_at_utc: string;
  ended_at_utc: string;
  run_id: string;
  job_id: string;
  trigger: TelemetryTrigger;
  initiator: string;
  kind: TelemetryKind;
  command: string;
  exit_code: number;
  outcome: TelemetryOutcome;
  git_ref?: string;
  branch?: string;
  queue_path?: string;
  app?: string;
  task_ids?: string[];
  task_id_primary?: string;
  agent_role?: string;
  evidence?: EvidencePointer[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

function safeId(): string {
  // time + random-ish; good enough for local-first telemetry
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureTelemetryDir(repoRoot: string): Promise<string> {
  const dir = path.join(repoRoot, "factory", "telemetry");
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function ensureRunTelemetryDir(repoRoot: string): Promise<string> {
  const base = await ensureTelemetryDir(repoRoot);
  const dir = path.join(base, "run");
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function appendRunEvent(repoRoot: string, e: RunEvent): Promise<void> {
  const localDir = await ensureRunTelemetryDir(repoRoot);
  const day = utcDay(e.timestamp_utc);
  const logPath = path.join(localDir, `run-history-${day}.jsonl`);
  await appendFile(logPath, JSON.stringify(e) + "\n", "utf8");
}

export function repoRootFromHere(importMetaUrl: string): string {
  const start = path.dirname(fileURLToPath(importMetaUrl));
  let dir = start;
  for (let depth = 0; depth < 24; depth++) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const raw = readFileSync(pkgPath, "utf8");
        const j = JSON.parse(raw) as { name?: string };
        if (j.name === "saas-factory") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not resolve repo root from ${importMetaUrl} (started at ${start})`);
}

function captureGit(args: string[]): string | undefined {
  try {
    const r = spawnSync("git", args, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if ((r.status ?? 1) !== 0) return undefined;
    return String(r.stdout ?? "").trim();
  } catch {
    return undefined;
  }
}

export type TelemetryRunContext = {
  kind: TelemetryKind;
  command: string;
  /** VSM station / workstation id (assembly-line JSONL). Inferred from command if omitted. */
  workstation?: string;
  trigger?: TelemetryTrigger;
  initiator?: string;
  queue_path?: string;
  app?: string;
  task_ids?: string[];
  task_id_primary?: string;
  agent_role?: string;
  evidence?: EvidencePointer[];
};

function inferWorkstationFromTelemetryContext(ctx: TelemetryRunContext): string {
  if (ctx.workstation) return ctx.workstation;
  const c = ctx.command;
  if (c.includes(" deploy ") || c.startsWith("npm run mfg -- deploy")) return "08-delivery";
  if (c.includes("line orchestrate")) return "03-registry";
  if (c.includes("line next")) return "03-registry";
  if (c.includes("line queue")) return "03-registry";
  if (c.includes("line done")) return "03-registry";
  if (ctx.kind === "gate") return "06-gates";
  if (ctx.kind === "deploy") return "08-delivery";
  return "unknown-station";
}

export async function recordRun<T>(repoRoot: string, ctx: TelemetryRunContext, fn: () => Promise<T>): Promise<T> {
  const started = nowIso();
  const runId = safeId();
  const jobId = `job-${utcDay(started)}`;
  const workstation = inferWorkstationFromTelemetryContext(ctx);
  const alCorrelation = newAssemblyLineCorrelationId();
  const t0 = Date.now();
  const opStart: AssemblyLineLogEvent = {
    schema_version: 1,
    event_kind: "operation_start",
    timestamp_utc: started,
    workstation,
    source: "record_run",
    correlation_id: alCorrelation,
    command: ctx.command,
    extra: { run_id: runId, job_id: jobId, telemetry_kind: ctx.kind },
  };
  await appendAssemblyLineEvent(repoRoot, opStart);
  try {
    const out = await fn();
    const ended = nowIso();
    await appendAssemblyLineEvent(repoRoot, {
      schema_version: 1,
      event_kind: "operation_complete",
      timestamp_utc: ended,
      workstation,
      source: "record_run",
      correlation_id: alCorrelation,
      command: ctx.command,
      duration_ms: Date.now() - t0,
      outcome: "pass",
      extra: { run_id: runId, job_id: jobId, telemetry_kind: ctx.kind },
    });
    await appendRunEvent(repoRoot, {
      schema_version: 1,
      timestamp_utc: ended,
      started_at_utc: started,
      ended_at_utc: ended,
      run_id: runId,
      job_id: jobId,
      trigger: ctx.trigger ?? "local_cli",
      initiator: ctx.initiator ?? "unknown",
      kind: ctx.kind,
      command: ctx.command,
      exit_code: 0,
      outcome: "pass",
      git_ref: captureGit(["rev-parse", "HEAD"]),
      branch: captureGit(["rev-parse", "--abbrev-ref", "HEAD"]),
      queue_path: ctx.queue_path,
      app: ctx.app,
      task_ids: ctx.task_ids,
      task_id_primary: ctx.task_id_primary,
      agent_role: ctx.agent_role,
      evidence: ctx.evidence,
    });
    return out;
  } catch (e: unknown) {
    const ended = nowIso();
    await appendAssemblyLineEvent(repoRoot, {
      schema_version: 1,
      event_kind: "operation_error",
      timestamp_utc: ended,
      workstation,
      source: "record_run",
      correlation_id: alCorrelation,
      command: ctx.command,
      duration_ms: Date.now() - t0,
      outcome: "fail",
      error: serializeUnknownError(e),
      extra: { run_id: runId, job_id: jobId, telemetry_kind: ctx.kind },
    });
    await appendRunEvent(repoRoot, {
      schema_version: 1,
      timestamp_utc: ended,
      started_at_utc: started,
      ended_at_utc: ended,
      run_id: runId,
      job_id: jobId,
      trigger: ctx.trigger ?? "local_cli",
      initiator: ctx.initiator ?? "unknown",
      kind: ctx.kind,
      command: ctx.command,
      exit_code: 1,
      outcome: "fail",
      git_ref: captureGit(["rev-parse", "HEAD"]),
      branch: captureGit(["rev-parse", "--abbrev-ref", "HEAD"]),
      queue_path: ctx.queue_path,
      app: ctx.app,
      task_ids: ctx.task_ids,
      task_id_primary: ctx.task_id_primary,
      agent_role: ctx.agent_role,
      evidence: ctx.evidence,
    });
    throw e;
  }
}

export async function readRunHistory(repoRoot: string, day: string): Promise<RunEvent[]> {
  const localDir = await ensureRunTelemetryDir(repoRoot);
  const logPath = path.join(localDir, `run-history-${day}.jsonl`);
  const raw = await readFile(logPath, "utf8");
  const out: RunEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line) as RunEvent);
  }
  return out;
}

