/**
 * Dated snapshots under factory/05_metrics/snapshots/factory-metrics-YYYY-MM-DD/metrics.json
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const SNAPSHOT_DIR_PREFIX = "factory-metrics-";

export type SnapshotMetricValue = {
  title: string;
  kind: string;
  previous: string | null;
  suggested: string | null;
  value: string;
  source: "user" | "probe_accepted" | "probe_edited" | "left_previous" | "probe_only";
};

export type MetricsSnapshotFile = {
  schema_version: 1;
  factory_metrics_day: string;
  captured_at_utc: string;
  catalog_schema_version: number;
  session_notes?: string;
  metrics: Record<string, SnapshotMetricValue>;
  probes?: Record<string, unknown>;
};

export function snapshotsRoot(repoRoot: string): string {
  return path.join(repoRoot, "factory", "05_metrics", "snapshots");
}

export function snapshotFolderName(day: string): string {
  return `${SNAPSHOT_DIR_PREFIX}${day}`;
}

export function snapshotDir(repoRoot: string, day: string): string {
  return path.join(snapshotsRoot(repoRoot), snapshotFolderName(day));
}

export function snapshotFile(repoRoot: string, day: string): string {
  return path.join(snapshotDir(repoRoot, day), "metrics.json");
}

function parseDayFromFolder(name: string): string | null {
  if (!name.startsWith(SNAPSHOT_DIR_PREFIX)) return null;
  const d = name.slice(SNAPSHOT_DIR_PREFIX.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

/** Latest snapshot strictly before `day`, or latest overall if none before */
export async function loadPreviousSnapshot(
  repoRoot: string,
  beforeDay: string,
): Promise<{ day: string; data: MetricsSnapshotFile } | null> {
  const root = snapshotsRoot(repoRoot);
  let names: string[];
  try {
    names = await readdir(root);
  } catch {
    return null;
  }
  const days = names
    .map(parseDayFromFolder)
    .filter((x): x is string => Boolean(x))
    .sort((a, b) => b.localeCompare(a));

  const prevDay = days.find((d) => d < beforeDay) ?? null;
  if (!prevDay) return null;
  return readSnapshot(repoRoot, prevDay);
}

async function readSnapshot(repoRoot: string, day: string): Promise<{ day: string; data: MetricsSnapshotFile } | null> {
  const f = snapshotFile(repoRoot, day);
  try {
    const raw = await readFile(f, "utf8");
    const data = JSON.parse(raw) as MetricsSnapshotFile;
    if (data.schema_version !== 1 || !data.metrics) return null;
    return { day, data };
  } catch {
    return null;
  }
}

export function previousValueForId(prev: MetricsSnapshotFile | null, id: string): string | null {
  if (!prev?.metrics?.[id]) return null;
  return prev.metrics[id].value ?? null;
}

export async function writeSnapshot(repoRoot: string, payload: MetricsSnapshotFile): Promise<string> {
  const day = payload.factory_metrics_day;
  const dir = snapshotDir(repoRoot, day);
  await mkdir(dir, { recursive: true });
  const f = path.join(dir, "metrics.json");
  await writeFile(f, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return f;
}
