import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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
  const dir = path.join(repoRoot, "factory", ".local");
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function appendRunEvent(repoRoot: string, e: RunEvent): Promise<void> {
  const localDir = await ensureTelemetryDir(repoRoot);
  const day = utcDay(e.timestamp_utc);
  const logPath = path.join(localDir, `run-history-${day}.jsonl`);
  await appendFile(logPath, JSON.stringify(e) + "\n", "utf8");
}

export function repoRootFromHere(importMetaUrl: string): string {
  const __dirname = path.dirname(fileURLToPath(importMetaUrl));
  return path.resolve(__dirname, "..");
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
  trigger?: TelemetryTrigger;
  initiator?: string;
  queue_path?: string;
  app?: string;
  task_ids?: string[];
  task_id_primary?: string;
  agent_role?: string;
  evidence?: EvidencePointer[];
};

export async function recordRun<T>(
  repoRoot: string,
  ctx: TelemetryRunContext,
  fn: () => Promise<T>,
): Promise<T> {
  const started = nowIso();
  const runId = safeId();
  const jobId = `job-${utcDay(started)}`;
  try {
    const out = await fn();
    const ended = nowIso();
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
  const localDir = await ensureTelemetryDir(repoRoot);
  const logPath = path.join(localDir, `run-history-${day}.jsonl`);
  const raw = await readFile(logPath, "utf8");
  const out: RunEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line) as RunEvent);
  }
  return out;
}

