/**
 * Interactive factory metrics — probes + previous snapshot + prompts.
 *
 *   npm run mfg -- metrics collect [--day YYYY-MM-DD] [--probe-cli] [--from-probes-only|--yes] [--help]
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { input, select } from "@inquirer/prompts";

import {
  loadTaskQueueSummary,
  probeTelemetryDay,
  suggestedFromProbes,
} from "./lib/metrics-probes.js";
import {
  loadPreviousSnapshot,
  previousValueForId,
  writeSnapshot,
  type MetricsSnapshotFile,
  type SnapshotMetricValue,
} from "./lib/snapshot-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

type CatalogMetric = {
  id: string;
  title: string;
  kind: "number" | "text" | "choice";
  choices?: { value: string; label: string }[];
  description?: string;
};

type CatalogFile = {
  schema_version: number;
  metrics: CatalogMetric[];
};

function utcDayNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgValue(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1]!.startsWith("--")) return argv[idx + 1]!;
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  npm run mfg -- metrics collect [--day YYYY-MM-DD] [--probe-cli] [--from-probes-only|--yes] [--help]",
      "",
      "  --day              UTC calendar day for folder factory-metrics-YYYY-MM-DD (default: today)",
      "  --probe-cli        Run npm run check, mfg validate factory, mfg deploy preview --dry-run (slow)",
      "  --from-probes-only Same as --yes: write metrics.json from probes only (no prompts)",
      "",
      "Writes: factory/05_metrics/snapshots/factory-metrics-<day>/metrics.json",
      "Catalog: factory/05_metrics/catalog.json (extend with your KPIs).",
    ].join("\n"),
  );
}

async function loadCatalog(): Promise<CatalogFile> {
  const p = path.join(__dirname, "catalog.json");
  const raw = await readFile(p, "utf8");
  return JSON.parse(raw) as CatalogFile;
}

function runNpmScript(script: string, extra: string[] = []): number {
  const r = spawnSync("npm", ["run", script, ...extra], {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

function runMfg(args: string[]): number {
  const r = spawnSync("npx", ["tsx", "factory/factory_cli/mfg.ts", ...args], {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "--") argv.shift();
  const sub = argv[0];
  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    printHelp();
    return;
  }
  if (sub !== "collect") {
    console.error('mfg metrics: use "collect" (see --help)');
    process.exitCode = 1;
    return;
  }

  const tail = argv.slice(1);
  if (hasFlag(tail, "help") || hasFlag(tail, "h")) {
    printHelp();
    return;
  }
  const day = parseArgValue(tail, "day") ?? utcDayNow();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Invalid --day ${day} (want YYYY-MM-DD)`);
  }
  const probeCli = hasFlag(tail, "probe-cli");
  const probesOnly = hasFlag(tail, "from-probes-only") || hasFlag(tail, "yes");

  if (!process.stdin.isTTY && !probesOnly) {
    throw new Error("No TTY — re-run in a terminal, or pass --from-probes-only to write probe-only snapshot.");
  }

  const catalog = await loadCatalog();
  const tq = await loadTaskQueueSummary(repoRoot);
  const tel = await probeTelemetryDay(repoRoot, day);
  const cli: { check?: number; validateFactory?: number; deployDryRun?: number } = {};
  if (probeCli) {
    console.error("Probing CLI (npm run check) …");
    cli.check = runNpmScript("check");
    console.error("Probing mfg validate factory …");
    cli.validateFactory = runMfg(["validate", "factory"]);
    console.error("Probing mfg deploy preview --dry-run …");
    cli.deployDryRun = runMfg(["deploy", "preview", "--dry-run"]);
  }

  const suggestedMap = suggestedFromProbes(tq, tel, cli);
  const probesPayload = { task_queue: tq, telemetry_day: tel, cli_exit_codes: probeCli ? cli : undefined };

  const prevWrap = await loadPreviousSnapshot(repoRoot, day);
  const prev = prevWrap?.data ?? null;

  const metricsOut: Record<string, SnapshotMetricValue> = {};

  for (const m of catalog.metrics) {
    const previous = prev ? previousValueForId(prev, m.id) : null;
    const suggested = suggestedMap[m.id] ?? null;

    if (probesOnly) {
      const v = suggested ?? previous ?? (m.kind === "choice" ? "unknown" : m.kind === "number" ? "0" : "");
      metricsOut[m.id] = {
        title: m.title,
        kind: m.kind,
        previous,
        suggested,
        value: v,
        source: suggested !== null ? "probe_only" : previous !== null ? "left_previous" : "probe_only",
      };
      continue;
    }

    const header = [
      `\n── ${m.id} ──`,
      m.title,
      m.description ? `  (${m.description})` : "",
      `  Previous: ${previous ?? "—"}`,
      `  Suggested: ${suggested ?? "—"}`,
    ]
      .filter(Boolean)
      .join("\n");
    console.log(header);

    let value: string;
    let source: SnapshotMetricValue["source"];

    const inferSource = (): SnapshotMetricValue["source"] => {
      if (suggested !== null && value === suggested) return "probe_accepted";
      if (previous !== null && value === previous) return "left_previous";
      if (suggested !== null && value !== suggested) return "probe_edited";
      return "user";
    };

    if (m.kind === "choice" && m.choices?.length) {
      const choices = m.choices.map((c) => ({ name: c.label, value: c.value }));
      const def = suggested ?? previous ?? "unknown";
      const defaultVal = m.choices.some((c) => c.value === def) ? def : undefined;
      const pick =
        defaultVal !== undefined
          ? await select({ message: "Select value", choices, default: defaultVal })
          : await select({ message: "Select value", choices });
      value = pick;
      source = inferSource();
    } else if (m.kind === "number") {
      const defStr = suggested ?? previous ?? "";
      const raw = await input({
        message: "Enter number (Enter = default)",
        default: defStr,
      });
      const trimmed = raw.trim() === "" ? defStr : raw.trim();
      if (trimmed !== "" && !/^-?\d+(\.\d+)?$/.test(trimmed)) {
        throw new Error(`${m.id}: invalid number "${trimmed}"`);
      }
      value = trimmed;
      source = inferSource();
    } else {
      const defStr = suggested ?? previous ?? "";
      const raw = await input({
        message: "Enter text (Enter = default)",
        default: defStr,
      });
      value = raw.trim() === "" ? defStr : raw.trim();
      source = inferSource();
    }

    metricsOut[m.id] = {
      title: m.title,
      kind: m.kind,
      previous,
      suggested,
      value,
      source,
    };
  }

  let sessionNotes: string | undefined;
  if (!probesOnly) {
    const n = await input({
      message: "Session notes (optional, Enter to skip)",
      default: "",
    });
    sessionNotes = n.trim() || undefined;
  }

  const payload: MetricsSnapshotFile = {
    schema_version: 1,
    factory_metrics_day: day,
    captured_at_utc: new Date().toISOString(),
    catalog_schema_version: catalog.schema_version,
    session_notes: sessionNotes,
    metrics: metricsOut,
    probes: probesPayload,
  };

  const outPath = await writeSnapshot(repoRoot, payload);
  console.log(`\nWrote ${path.relative(repoRoot, outPath)}`);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
