import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

import { readRunHistory, repoRootFromHere, type RunEvent } from "../factory_internal_ops/telemetry.js";
import { readAssemblyLineDay, type AssemblyLineLogEvent } from "../03_assembly_lines/07-telemetry/assembly-line-log.js";

function utcDayNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgValue(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1]!;
  return undefined;
}

function formatAssemblyLineCounts(events: AssemblyLineLogEvent[]): void {
  const byStation = new Map<string, number>();
  const byKind = new Map<string, number>();
  let fails = 0;
  for (const e of events) {
    byStation.set(e.workstation, (byStation.get(e.workstation) ?? 0) + 1);
    byKind.set(e.event_kind, (byKind.get(e.event_kind) ?? 0) + 1);
    if (e.outcome === "fail" || e.event_kind === "operation_error") fails += 1;
  }
  const showMap = (m: Map<string, number>): string => [...m.entries()].map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`assembly-line: total_events=${events.length} failures_or_error_events~=${fails}`);
  console.log(`byWorkstation: ${showMap(byStation) || "n/a"}`);
  console.log(`byEventKind: ${showMap(byKind) || "n/a"}`);
}

function formatCounts(events: RunEvent[], appFilter?: string): void {
  const filtered = appFilter ? events.filter((e) => e.app === appFilter) : events;
  const byOutcome = new Map<string, number>();
  const byKind = new Map<string, number>();
  for (const e of filtered) {
    byOutcome.set(e.outcome, (byOutcome.get(e.outcome) ?? 0) + 1);
    byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
  }
  const showMap = (m: Map<string, number>): string => [...m.entries()].map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`counts: total=${filtered.length}${appFilter ? ` app=${appFilter}` : ""}`);
  console.log(`byOutcome: ${showMap(byOutcome) || "n/a"}`);
  console.log(`byKind: ${showMap(byKind) || "n/a"}`);
}

async function main(): Promise<void> {
  let argv = process.argv.slice(2);
  if (argv[0] === "--") argv = argv.slice(1);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(
      [
        "Usage:",
        "  npm run mfg -- telemetry report [--day YYYY-MM-DD] [--app <app>]",
        "  npm run mfg -- telemetry assembly-line [--day YYYY-MM-DD]",
        "  npm run mfg -- line telemetry -- report | assembly-line …   # legacy alias",
        "",
        "Notes:",
        "- Run history: factory/telemetry/run/ (gitignored).",
        "- Assembly-line log: factory/telemetry/assembly-line/ (gitignored) — all mfg dispatches + recordRun ops, including errors.",
        "- Day boundaries are UTC.",
      ].join("\n"),
    );
    process.exitCode = 0;
    return;
  }

  const repoRoot = repoRootFromHere(import.meta.url);

  if (cmd === "report") {
    const day = parseArgValue(argv, "day") ?? utcDayNow();
    const app = parseArgValue(argv, "app");
    const events = await readRunHistory(repoRoot, day);
    formatCounts(events, app);
    return;
  }

  if (cmd === "assembly-line") {
    const day = parseArgValue(argv, "day") ?? utcDayNow();
    const events = await readAssemblyLineDay(repoRoot, day);
    formatAssemblyLineCounts(events);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
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

