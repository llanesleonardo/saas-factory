/**
 * Source loaders for the order-level traceability index.
 *
 * Each function in here READS a known source-of-truth file (or folder) for ONE
 * order, and returns plain JSON. The builder (`build-order-index.ts`) composes
 * the index from these outputs. No writes happen here.
 *
 * Every path returned is a posix-style **relative path from repo root**, so the
 * resulting index file is portable across machines and reviewable in diffs.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import type { FactoryTask } from "../planning/task-graph.js";
import type { OrderPhasesDoc } from "../orders/order-phases-types.js";
import type { SprintRecordDoc } from "../sprints/sprint-types.js";
import { loadTaskQueueRaw } from "../sprints/sprint-task-queue.js";

/** Convert an absolute path to a repo-relative posix path. */
export function relFromRepo(repoRoot: string, abs: string): string {
  return path.relative(repoRoot, abs).split(path.sep).join("/");
}

/** Same regex `phase-breakdown.ts` uses for filename-safe phase tokens. */
function safeFileToken(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export interface OrderManifest {
  orderId: string;
  productId?: string;
  productVersion?: string;
  priority?: number;
  notes?: string;
  lifecycle?: {
    status?: string;
    setBy?: string;
    setAt?: string;
    reason?: string;
  };
}

/** Read `factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json`. */
export async function loadOrderManifest(
  repoRoot: string,
  orderId: string,
): Promise<OrderManifest | null> {
  const abs = path.join(
    repoRoot,
    "factory/01_production_planning/01_00_work_orders",
    orderId,
    "order-manifest.json",
  );
  try {
    const text = await fs.readFile(abs, "utf8");
    return JSON.parse(text) as OrderManifest;
  } catch {
    return null;
  }
}

/** Read `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json`. */
export async function loadOrderPhases(
  repoRoot: string,
  orderId: string,
): Promise<OrderPhasesDoc | null> {
  const abs = path.join(
    repoRoot,
    "factory/01_production_planning/01_02_phase_registry",
    orderId,
    "order-phases.json",
  );
  try {
    const text = await fs.readFile(abs, "utf8");
    return JSON.parse(text) as OrderPhasesDoc;
  } catch {
    return null;
  }
}

/**
 * Return paths to every per-phase breakdown proposal for this order
 * (`factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-*.json`).
 * Map keys are phase ids; values are repo-relative paths.
 */
export async function loadBreakdownPaths(
  repoRoot: string,
  orderId: string,
  phaseIds: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const dir = path.join(
    repoRoot,
    "factory/01_production_planning/01_03_task-registry",
    orderId,
  );
  let exists = true;
  try {
    await fs.access(dir);
  } catch {
    exists = false;
  }
  if (!exists) return out;
  for (const id of phaseIds) {
    const filename = `phase-breakdown-${safeFileToken(id)}.json`;
    const abs = path.join(dir, filename);
    try {
      await fs.access(abs);
      out[id] = relFromRepo(repoRoot, abs);
    } catch {
      // missing breakdown is fine; not every phase has one yet
    }
  }
  return out;
}

/** Load all tasks from the canonical queue (we filter to this order later). */
export async function loadAllTasks(repoRoot: string): Promise<FactoryTask[]> {
  const raw = await loadTaskQueueRaw(repoRoot);
  return raw.tasks;
}

export interface SprintFolder {
  number: number;
  folderAbs: string;
  /** Posix path, relative to repo root. */
  folderRel: string;
  record: SprintRecordDoc;
  recordPathRel: string;
  promptPathsRel: string[];
  /** Map of taskId → prompt .md repo-relative path (extracted from prompts/<taskId>.md). */
  promptByTaskId: Record<string, string>;
}

/**
 * Enumerate every `sprint-NNN/` folder under
 * `factory/03_assembly_lines/05-sprints/<orderId>/<productId>/`, returning the
 * sprint record + the list of agent prompt .md files inside each.
 */
export async function loadSprints(
  repoRoot: string,
  orderId: string,
  productId: string,
): Promise<SprintFolder[]> {
  const root = path.join(
    repoRoot,
    "factory/03_assembly_lines/05-sprints",
    orderId,
    productId,
  );
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const folders: SprintFolder[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const m = /^sprint-(\d+)$/.exec(e.name);
    if (!m) continue;
    const number = parseInt(m[1]!, 10);
    const folderAbs = path.join(root, e.name);
    const recordAbs = path.join(folderAbs, "sprint.json");
    let record: SprintRecordDoc;
    try {
      record = JSON.parse(await fs.readFile(recordAbs, "utf8")) as SprintRecordDoc;
    } catch {
      continue;
    }
    // Walk prompts/
    const promptByTaskId: Record<string, string> = {};
    const promptPathsRel: string[] = [];
    const promptsDir = path.join(folderAbs, "prompts");
    try {
      const promptEntries = await fs.readdir(promptsDir, { withFileTypes: true });
      for (const p of promptEntries) {
        if (!p.isFile() || !p.name.endsWith(".md")) continue;
        const abs = path.join(promptsDir, p.name);
        const rel = relFromRepo(repoRoot, abs);
        promptPathsRel.push(rel);
        promptByTaskId[p.name.replace(/\.md$/, "")] = rel;
      }
    } catch {
      // no prompts subfolder is fine
    }
    folders.push({
      number,
      folderAbs,
      folderRel: relFromRepo(repoRoot, folderAbs),
      record,
      recordPathRel: relFromRepo(repoRoot, recordAbs),
      promptPathsRel,
      promptByTaskId,
    });
  }
  folders.sort((a, b) => a.number - b.number);
  return folders;
}

export interface TelemetryRow {
  schema_version?: number;
  event_kind?: string;
  timestamp_utc?: string;
  workstation?: string;
  source?: string;
  correlation_id?: string;
  script?: string;
  command?: string;
  duration_ms?: number;
  exit_code?: number;
  outcome?: string;
  mfg_argv_tail?: string[];
  app?: string;
  /** Diagnostic — the JSONL file + line number we read this from. */
  _sourceLine?: string;
}

/**
 * Walk every `assembly-line-<date>.jsonl` under `factory/telemetry/assembly-line/`
 * and return rows that mention this order OR this slug somewhere in their
 * `mfg_argv_tail`, `command`, or `app` fields.
 *
 * Conservative: we only require a substring match (`<orderId>` or `<slug>`),
 * which is enough to keep noise low in practice because order ids include the
 * date and the slug, and slugs are typically distinctive.
 */
export async function loadTelemetryForOrder(
  repoRoot: string,
  orderId: string,
  productId: string,
): Promise<TelemetryRow[]> {
  const dir = path.join(repoRoot, "factory/telemetry/assembly-line");
  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }
  files.sort();
  const slug = productId.trim();
  const matchTokens = [orderId, slug].filter((s) => s.length > 0);

  const rows: TelemetryRow[] = [];
  for (const f of files) {
    const abs = path.join(dir, f);
    let text: string;
    try {
      text = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const fileRel = relFromRepo(repoRoot, abs);
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;
      // Cheap pre-filter: skip lines that don't mention either token.
      if (!matchTokens.some((t) => line.includes(t))) continue;
      let row: TelemetryRow;
      try {
        row = JSON.parse(line) as TelemetryRow;
      } catch {
        continue;
      }
      // Defensive second pass — confirm one of the structured fields matches.
      const argv = (row.mfg_argv_tail ?? []).join(" ");
      const haystack = `${argv} ${row.command ?? ""} ${row.app ?? ""}`;
      if (!matchTokens.some((t) => haystack.includes(t))) continue;
      // Skip our own meta-events: every `trace build` / `trace order` run
      // logs to telemetry, and we don't want the index to include events
      // ABOUT the index (which would make every rebuild change the hash
      // because the prior rebuild's start/end rows would now match).
      if (row.workstation === "08-traceability") continue;
      if ((row.script ?? "").includes("factory/08_traceability/")) continue;
      row._sourceLine = `${fileRel}:${i + 1}`;
      rows.push(row);
    }
  }
  rows.sort((a, b) => (a.timestamp_utc ?? "").localeCompare(b.timestamp_utc ?? ""));
  return rows;
}

/**
 * Read `configs/apps/<productId>/scaffold-run.json` and return its
 * `componentVersions` plus a best-effort `manifestPath` per entry.
 *
 * Returns an empty array (and no error) when:
 *   • the file doesn't exist yet (app was never scaffolded), or
 *   • the file is older and doesn't have a `componentVersions` field, or
 *   • the file is malformed (we log nothing; the trace index just shows zero
 *     components — auditors can still see this by reading scaffold-run.json).
 */
export async function loadComponentsForProduct(
  repoRoot: string,
  productId: string,
): Promise<{
  components: {
    capability: string;
    componentId: string;
    provider: string;
    version: string;
    sentinel: boolean;
    manifestPath?: string;
    applied: {
      filesWritten: number;
      filesSkipped: number;
      depsAdded: number;
      depsConflicted: number;
      envAdded: number;
    };
  }[];
}> {
  const abs = path.join(
    repoRoot,
    "configs",
    "apps",
    productId,
    "scaffold-run.json",
  );
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return { components: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { components: [] };
  }
  if (!parsed || typeof parsed !== "object") return { components: [] };
  const versions = (parsed as { componentVersions?: unknown }).componentVersions;
  if (!Array.isArray(versions)) return { components: [] };
  const out = versions
    .filter((v): v is Record<string, unknown> => v !== null && typeof v === "object")
    .map((v) => {
      const componentId = String(v.componentId ?? "");
      const manifestPath =
        componentId.length > 0
          ? `packages/components/${componentId}/manifest.json`
          : undefined;
      const applied = (v.applied ?? {}) as Record<string, unknown>;
      return {
        capability: String(v.capability ?? ""),
        componentId,
        provider: String(v.provider ?? ""),
        version: String(v.version ?? ""),
        sentinel: Boolean(v.sentinel),
        manifestPath,
        applied: {
          filesWritten: Number(applied.filesWritten ?? 0),
          filesSkipped: Number(applied.filesSkipped ?? 0),
          depsAdded: Number(applied.depsAdded ?? 0),
          depsConflicted: Number(applied.depsConflicted ?? 0),
          envAdded: Number(applied.envAdded ?? 0),
        },
      };
    });
  return { components: out };
}

/** Convenience: small set of source pointers we stamp into the index file. */
export function sourcePointers(
  repoRoot: string,
  orderId: string,
  productId: string,
): {
  orderFolder: string;
  phaseRegistry: string;
  taskRegistry: string;
  sprintsFolder: string;
  productConfigs: string;
} {
  const j = (...parts: string[]): string =>
    relFromRepo(repoRoot, path.join(repoRoot, ...parts));
  return {
    orderFolder: j("factory/01_production_planning/01_00_work_orders", orderId),
    phaseRegistry: j("factory/01_production_planning/01_02_phase_registry", orderId),
    taskRegistry: j("factory/01_production_planning/01_03_task-registry", orderId),
    sprintsFolder: j("factory/03_assembly_lines/05-sprints", orderId, productId),
    productConfigs: j("configs/apps", productId),
  };
}
