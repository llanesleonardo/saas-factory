/**
 * Kaizen CLI — low-ceremony backlog + JSONL digest for continuous improvement.
 *
 *   npm run mfg -- kaizen new [--slug <id>] [--title "…"] [--force]
 *   npm run mfg -- kaizen summary [--day YYYY-MM-DD] [--top N] [--json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readAssemblyLineDay, type AssemblyLineLogEvent } from "../03_assembly_lines/07-telemetry/assembly-line-log.js";
import { readRunHistory, type RunEvent } from "../factory_internal_ops/telemetry.js";

function repoRootFromHere(importMetaUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..", "..");
}

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

function sanitizeSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length ? s.slice(0, 80) : "improvement";
}

async function readRunHistorySafe(repoRoot: string, day: string): Promise<RunEvent[]> {
  try {
    return await readRunHistory(repoRoot, day);
  } catch {
    return [];
  }
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  npm run mfg -- kaizen new [--slug <id>] [--title \"…\"] [--force]",
      "  npm run mfg -- kaizen summary [--day YYYY-MM-DD] [--top N] [--json]",
      "",
      "  new       Copy improvement template → factory/04_kaizen/backlog/YYYY-MM-DD-<slug>.md",
      "  summary   Parse assembly-line + run-history JSONL for that UTC day (Kaizen-oriented digest)",
      "",
      "Evidence paths are gitignored: factory/telemetry/ (see factory/04_kaizen/SIGNALS.md).",
    ].join("\n"),
  );
}

function cmdNew(repoRoot: string, argv: string[]): void {
  const slug = sanitizeSlug(parseArgValue(argv, "slug") ?? "improvement");
  const title = parseArgValue(argv, "title");
  const force = hasFlag(argv, "force");
  const day = utcDayNow();
  const kaizenDir = path.join(repoRoot, "factory", "04_kaizen");
  const templatePath = path.join(kaizenDir, "templates", "improvement-item.template.md");
  const backlogDir = path.join(kaizenDir, "backlog");
  mkdirSync(backlogDir, { recursive: true });
  const destPath = path.join(backlogDir, `${day}-${slug}.md`);

  if (!existsSync(templatePath)) {
    throw new Error(`Missing template: ${path.relative(repoRoot, templatePath)}`);
  }
  if (existsSync(destPath) && !force) {
    throw new Error(
      `Already exists: ${path.relative(repoRoot, destPath)} — pass --force to overwrite, or pick --slug other-${slug}`,
    );
  }

  let body = readFileSync(templatePath, "utf8");
  body = body.replace(/\*\*Date \(UTC\):\*\* YYYY-MM-DD/g, `**Date (UTC):** ${day}`);
  body = body.replace(/assembly-line-YYYY-MM-DD\.jsonl/g, `assembly-line-${day}.jsonl`);
  const headTitle = title?.trim() || slug.replace(/-/g, " ");
  body = body.replace(/^# Kaizen item — <short title>/m, `# Kaizen item — ${headTitle}`);

  writeFileSync(destPath, body, "utf8");
  console.log(`Wrote ${path.relative(repoRoot, destPath)}`);
}

type SummaryJson = {
  day: string;
  assembly_line: {
    total_events: number;
    by_event_kind: Record<string, number>;
    by_workstation: Record<string, number>;
    failure_like_events: number;
    top_slow_cli_ms: { duration_ms: number; script?: string; outcome?: string; correlation_id: string }[];
    failure_samples: {
      event_kind: string;
      workstation: string;
      correlation_id: string;
      script?: string;
      command?: string;
      error_message?: string;
    }[];
  };
  run_history: {
    present: boolean;
    total: number;
    by_outcome: Record<string, number>;
    by_kind: Record<string, number>;
  };
};

function summarizeAssemblyLine(events: AssemblyLineLogEvent[], topN: number): Omit<SummaryJson, "day" | "run_history"> {
  const byEvent = new Map<string, number>();
  const byWs = new Map<string, number>();
  let fails = 0;
  const ends: AssemblyLineLogEvent[] = [];
  const failureSamples: SummaryJson["assembly_line"]["failure_samples"] = [];

  for (const e of events) {
    byEvent.set(e.event_kind, (byEvent.get(e.event_kind) ?? 0) + 1);
    byWs.set(e.workstation, (byWs.get(e.workstation) ?? 0) + 1);
    if (e.event_kind === "operation_error" || e.outcome === "fail") fails += 1;
    if (e.event_kind === "cli_dispatch_end" && typeof e.duration_ms === "number") ends.push(e);
    const isFail =
      e.event_kind === "operation_error" ||
      (e.event_kind === "cli_dispatch_end" && e.outcome === "fail") ||
      (e.event_kind === "operation_complete" && e.outcome === "fail");
    if (isFail && failureSamples.length < 12) {
      failureSamples.push({
        event_kind: e.event_kind,
        workstation: e.workstation,
        correlation_id: e.correlation_id,
        script: e.script,
        command: e.command,
        error_message: e.error?.message,
      });
    }
  }

  ends.sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0));
  const topSlow = ends.slice(0, topN).map((e) => ({
    duration_ms: e.duration_ms ?? 0,
    script: e.script,
    outcome: e.outcome,
    correlation_id: e.correlation_id,
  }));

  return {
    assembly_line: {
      total_events: events.length,
      by_event_kind: Object.fromEntries(byEvent),
      by_workstation: Object.fromEntries(byWs),
      failure_like_events: fails,
      top_slow_cli_ms: topSlow,
      failure_samples: failureSamples,
    },
  };
}

function printSummaryHuman(day: string, data: SummaryJson): void {
  const al = data.assembly_line;
  console.log(`kaizen summary — UTC day ${day}`);
  console.log(`assembly-line: total_events=${al.total_events} failure_like~=${al.failure_like_events}`);
  const ek = Object.entries(al.by_event_kind)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`byEventKind: ${ek || "n/a"}`);
  const ws = Object.entries(al.by_workstation)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`byWorkstation: ${ws || "n/a"}`);
  console.log(`slowest cli_dispatch_end (top ${al.top_slow_cli_ms.length}):`);
  for (const row of al.top_slow_cli_ms) {
    console.log(
      `  ${row.duration_ms}ms\t${row.outcome ?? "?"}\t${row.script ?? row.correlation_id}\t${row.correlation_id}`,
    );
  }
  if (al.failure_samples.length) {
    console.log("failure / error samples (first few):");
    for (const f of al.failure_samples) {
      const err = f.error_message ? ` err=${JSON.stringify(f.error_message)}` : "";
      console.log(
        `  ${f.event_kind}\t${f.workstation}\t${f.script ?? f.command ?? ""}${err}\t${f.correlation_id}`,
      );
    }
  }
  const rh = data.run_history;
  console.log(
    `run-history: ${rh.present ? `total=${rh.total} byOutcome=${JSON.stringify(rh.by_outcome)} byKind=${JSON.stringify(rh.by_kind)}` : "no file for this day"}`,
  );
}

async function cmdSummary(repoRoot: string, argv: string[]): Promise<void> {
  const day = parseArgValue(argv, "day") ?? utcDayNow();
  const top = Math.min(50, Math.max(1, parseInt(parseArgValue(argv, "top") ?? "10", 10) || 10));
  const asJson = hasFlag(argv, "json");

  const alEvents = await readAssemblyLineDay(repoRoot, day);
  const partial = summarizeAssemblyLine(alEvents, top);
  const runEvents = await readRunHistorySafe(repoRoot, day);
  const byOutcome = new Map<string, number>();
  const byKind = new Map<string, number>();
  for (const e of runEvents) {
    byOutcome.set(e.outcome, (byOutcome.get(e.outcome) ?? 0) + 1);
    byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
  }
  const full: SummaryJson = {
    day,
    ...partial,
    run_history: {
      present: runEvents.length > 0,
      total: runEvents.length,
      by_outcome: Object.fromEntries(byOutcome),
      by_kind: Object.fromEntries(byKind),
    },
  };

  if (asJson) {
    console.log(JSON.stringify(full, null, 2));
    return;
  }
  printSummaryHuman(day, full);
}

async function main(): Promise<void> {
  let argv = process.argv.slice(2);
  if (argv[0] === "--") argv = argv.slice(1);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    printHelp();
    return;
  }

  const repoRoot = repoRootFromHere(import.meta.url);

  if (cmd === "new") {
    cmdNew(repoRoot, argv.slice(1));
    return;
  }
  if (cmd === "summary") {
    await cmdSummary(repoRoot, argv.slice(1));
    return;
  }

  throw new Error(`Unknown kaizen command: ${cmd}\n\n${["Usage:", "  npm run mfg -- kaizen new [--slug <id>] [--title \"…\"] [--force]", "  npm run mfg -- kaizen summary [--day YYYY-MM-DD] [--top N] [--json]"].join("\n")}`);
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
