import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

import { ensureTelemetryDir, type EvidencePointer } from "./telemetry.js";

export type CostKind = "model" | "runtime" | "infra" | "SaaS" | "other";
export type CostSource = "manual" | "measured" | "estimated";

export type CostEvent = {
  schema_version: 1;
  timestamp_utc: string;
  day_utc: string; // YYYY-MM-DD
  app: string;
  kind: CostKind;
  source: CostSource;
  label: string;
  amount_usd: number;

  run_id?: string;
  job_id?: string;
  task_id_primary?: string;
  task_ids?: string[];
  agent_role?: string;
  tool_id?: string;

  notes?: string;
  evidence?: EvidencePointer[];
};

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function validateDay(day: string): void {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)) {
    throw new Error(`Invalid day (expected YYYY-MM-DD). Got: ${JSON.stringify(day)}`);
  }
}

export function validateCostEvent(e: CostEvent): void {
  if (e.schema_version !== 1) throw new Error("schema_version must be 1");
  if (!e.timestamp_utc || typeof e.timestamp_utc !== "string") throw new Error("timestamp_utc required");
  validateDay(e.day_utc);
  if (!e.app || typeof e.app !== "string") throw new Error("app required");
  if (!e.label || typeof e.label !== "string") throw new Error("label required");
  if (!Number.isFinite(e.amount_usd) || e.amount_usd < 0) throw new Error("amount_usd must be a number >= 0");
}

export async function appendCostEvent(repoRoot: string, e: CostEvent): Promise<string> {
  validateCostEvent(e);
  const localDir = await ensureTelemetryDir(repoRoot);
  const logPath = path.join(localDir, `cost-events-${e.day_utc}.jsonl`);
  await appendFile(logPath, JSON.stringify(e) + "\n", "utf8");
  return logPath;
}

export async function readCostEvents(repoRoot: string, day: string): Promise<CostEvent[]> {
  validateDay(day);
  const localDir = await ensureTelemetryDir(repoRoot);
  const logPath = path.join(localDir, `cost-events-${day}.jsonl`);
  try {
    const raw = await readFile(logPath, "utf8");
    const out: CostEvent[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      out.push(JSON.parse(line) as CostEvent);
    }
    return out;
  } catch (e: unknown) {
    // If file doesn't exist yet, treat as empty; other errors should surface.
    if (e && typeof e === "object" && "code" in e && (e as { code?: unknown }).code === "ENOENT") return [];
    throw e;
  }
}

export type DayRollup = {
  schema_version: 1;
  day_utc: string;
  app?: string;
  total_usd: number;
  totals_by_kind: Record<CostKind, number>;
  totals_by_source: Record<CostSource, number>;
  top_labels: Array<{ label: string; total_usd: number }>;
  count_events: number;
};

export function rollupDay(events: CostEvent[], day: string, app?: string): DayRollup {
  validateDay(day);
  const filtered = app ? events.filter((e) => e.app === app) : events;
  const totalsByKind: Record<CostKind, number> = { model: 0, runtime: 0, infra: 0, SaaS: 0, other: 0 };
  const totalsBySource: Record<CostSource, number> = { manual: 0, measured: 0, estimated: 0 };
  const byLabel = new Map<string, number>();
  let total = 0;

  for (const e of filtered) {
    const amt = Number(e.amount_usd ?? 0);
    if (!Number.isFinite(amt) || amt < 0) continue;
    totalsByKind[e.kind] = (totalsByKind[e.kind] ?? 0) + amt;
    totalsBySource[e.source] = (totalsBySource[e.source] ?? 0) + amt;
    byLabel.set(e.label, (byLabel.get(e.label) ?? 0) + amt);
    total += amt;
  }

  const top = [...byLabel.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([label, total_usd]) => ({ label, total_usd: round2(total_usd) }));

  return {
    schema_version: 1,
    day_utc: day,
    app,
    total_usd: round2(total),
    totals_by_kind: mapRound2(totalsByKind),
    totals_by_source: mapRound2(totalsBySource),
    top_labels: top,
    count_events: filtered.length,
  };
}

export type RunRollup = {
  schema_version: 1;
  run_id: string;
  total_usd: number;
  totals_by_kind: Record<CostKind, number>;
  count_events: number;
};

export function rollupRun(events: CostEvent[], runId: string): RunRollup {
  if (!runId) throw new Error("run_id required");
  const filtered = events.filter((e) => e.run_id === runId);
  const totalsByKind: Record<CostKind, number> = { model: 0, runtime: 0, infra: 0, SaaS: 0, other: 0 };
  let total = 0;
  for (const e of filtered) {
    const amt = Number(e.amount_usd ?? 0);
    if (!Number.isFinite(amt) || amt < 0) continue;
    totalsByKind[e.kind] = (totalsByKind[e.kind] ?? 0) + amt;
    total += amt;
  }
  return {
    schema_version: 1,
    run_id: runId,
    total_usd: round2(total),
    totals_by_kind: mapRound2(totalsByKind),
    count_events: filtered.length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapRound2<T extends Record<string, number>>(m: T): T {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) out[k] = round2(v);
  return out as T;
}

export function makeCostEvent(input: {
  timestamp_utc?: string;
  app: string;
  kind: CostKind;
  source: CostSource;
  label: string;
  amount_usd: number;
  run_id?: string;
  job_id?: string;
  task_id_primary?: string;
  task_ids?: string[];
  agent_role?: string;
  tool_id?: string;
  notes?: string;
  evidence?: EvidencePointer[];
}): CostEvent {
  const ts = input.timestamp_utc ?? nowIso();
  const day = utcDay(ts);
  return {
    schema_version: 1,
    timestamp_utc: ts,
    day_utc: day,
    app: input.app,
    kind: input.kind,
    source: input.source,
    label: input.label,
    amount_usd: input.amount_usd,
    run_id: input.run_id,
    job_id: input.job_id,
    task_id_primary: input.task_id_primary,
    task_ids: input.task_ids,
    agent_role: input.agent_role,
    tool_id: input.tool_id,
    notes: input.notes,
    evidence: input.evidence,
  };
}

