/**
 * Assembly-line telemetry: append-only JSONL of everything dispatched on the line
 * (all stations / workstations), including failures. Storage: factory/telemetry/assembly-line/ (gitignored).
 */
import { mkdirSync, appendFileSync } from "node:fs";
import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";

export const ASSEMBLY_LINE_LOG_SCHEMA_VERSION = 1 as const;

export type AssemblyLineLogSource = "mfg_dispatch" | "record_run" | "manual";

export type AssemblyLineLogEventKind =
  | "cli_dispatch_start"
  | "cli_dispatch_end"
  | "operation_start"
  | "operation_complete"
  | "operation_error";

/** Serializable error snapshot (never throw from logger). */
export type AssemblyLineErrorSnapshot = {
  message: string;
  name?: string;
  stack?: string;
};

export type AssemblyLineLogEvent = {
  schema_version: typeof ASSEMBLY_LINE_LOG_SCHEMA_VERSION;
  event_kind: AssemblyLineLogEventKind;
  timestamp_utc: string;
  workstation: string;
  source: AssemblyLineLogSource;
  correlation_id: string;
  /** High-level command label (e.g. mfg argv prefix). */
  command?: string;
  /** tsx entry script relative to repo root. */
  script?: string;
  script_args?: string[];
  exit_code?: number;
  duration_ms?: number;
  outcome?: "pass" | "fail";
  error?: AssemblyLineErrorSnapshot;
  /** mfg process argv tail (bounded) when source is mfg_dispatch */
  mfg_argv_tail?: string[];
  extra?: Record<string, unknown>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

export function newAssemblyLineCorrelationId(): string {
  return `al-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function serializeUnknownError(e: unknown): AssemblyLineErrorSnapshot {
  if (e instanceof Error) {
    return { message: e.message, name: e.name, stack: e.stack };
  }
  return { message: String(e) };
}

/**
 * Map a repo-relative script path to a VSM workstation / station id for logs.
 *
 * Workstation naming rule:
 *  - Scripts under `factory/03_assembly_lines/<NN-name>/...` → workstation `NN-name`
 *    (e.g. `01-intake`, `04-scaffold`, `05-sprints`, `06-gates`, `08-delivery`).
 *  - `06-gates/validation/...` is a distinct sub-workstation: `06-gates-validation`.
 *  - Scripts outside `03_assembly_lines/` use their top-level folder under `factory/`
 *    as the workstation id (with `_` rewritten to `-`):
 *      `factory/00_product_definitions/...` → `00-product-definitions`
 *      `factory/01_production_planning/...` → `01-production-planning`
 *      `factory/factory_cli/...`            → `factory-cli`
 *  - Per-script overrides handle scripts that physically live in a shared
 *    station folder (e.g. `06-gates/gates/`) but conceptually belong to a
 *    different workstation (product-shape, planning, intake, delivery).
 */
export function inferWorkstationFromScriptPath(relFromRepoRoot: string): string {
  const s = relFromRepoRoot.replace(/\\/g, "/");

  // --- 1. Per-script overrides (cross-cutting scripts in shared folders) ---
  // Sales / product-shape scripts live under 06-gates/gates/ today but author
  // product definitions (vertical brief, app.stack.json, business needs, quote).
  if (
    s.endsWith("/06-gates/gates/new-vertical-config.ts") ||
    s.endsWith("/06-gates/gates/app-blueprint-config.ts") ||
    s.endsWith("/06-gates/gates/app-business-needs.ts") ||
    s.endsWith("/06-gates/gates/app-quote.ts")
  ) {
    return "00-product-definitions";
  }
  // BD-phase bootstrap = production planning, even though the script sits in 06-gates/gates/.
  if (s.endsWith("/06-gates/gates/app-bdphase.ts")) return "01-production-planning";
  // Delivery review is the delivery checklist, not a gate validator.
  if (s.endsWith("/06-gates/gates/delivery-review.ts")) return "08-delivery";
  // Verified-product promotion writes to factory/07_verified_product/ — that's its workstation.
  if (s.endsWith("/06-gates/gates/app-verified.ts")) return "07-verified-product";
  // Order intake validation runs against the order doc but is the 01-intake workstation.
  if (s.endsWith("/01_00_work_orders/order-validate.ts")) return "01-intake";

  // --- 2. Assembly-line workstations: factory/03_assembly_lines/<NN-name>/... ---
  if (s.includes("/06-gates/validation/")) return "06-gates-validation";
  const al = s.match(/\/03_assembly_lines\/([^/]+)\//);
  if (al && al[1]) return al[1];

  // --- 3. Non-assembly-line top-level folders under factory/ ---
  const top = s.match(/^factory\/([^/]+)\//);
  if (top && top[1] && top[1] !== "03_assembly_lines") {
    return top[1].replace(/_/g, "-").toLowerCase();
  }

  return "unknown-station";
}

function assemblyLineDir(repoRoot: string): string {
  return path.join(repoRoot, "factory", "telemetry", "assembly-line");
}

function logPathForDay(repoRoot: string, day: string): string {
  return path.join(assemblyLineDir(repoRoot), `assembly-line-${day}.jsonl`);
}

export function ensureAssemblyLineLogDirSync(repoRoot: string): string {
  const dir = assemblyLineDir(repoRoot);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function ensureAssemblyLineLogDir(repoRoot: string): Promise<string> {
  const dir = assemblyLineDir(repoRoot);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function appendAssemblyLineEventSync(repoRoot: string, e: AssemblyLineLogEvent): void {
  try {
    ensureAssemblyLineLogDirSync(repoRoot);
    const day = utcDay(e.timestamp_utc);
    const p = logPathForDay(repoRoot, day);
    appendFileSync(p, JSON.stringify(e) + "\n", "utf8");
  } catch {
    /* never break callers */
  }
}

export async function appendAssemblyLineEvent(repoRoot: string, e: AssemblyLineLogEvent): Promise<void> {
  try {
    await ensureAssemblyLineLogDir(repoRoot);
    const day = utcDay(e.timestamp_utc);
    const p = logPathForDay(repoRoot, day);
    await appendFile(p, JSON.stringify(e) + "\n", "utf8");
  } catch {
    /* never break callers */
  }
}

export async function readAssemblyLineDay(repoRoot: string, day: string): Promise<AssemblyLineLogEvent[]> {
  const p = logPathForDay(repoRoot, day);
  let raw: string;
  try {
    raw = await readFile(p, "utf8");
  } catch {
    return [];
  }
  const out: AssemblyLineLogEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as AssemblyLineLogEvent);
    } catch {
      /* skip corrupt line */
    }
  }
  return out;
}
