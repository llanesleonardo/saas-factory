import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

import { readRunHistory, repoRootFromHere, type RunEvent } from "./telemetry.js";

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
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(
      [
        "Usage:",
        "  npm run factory:telemetry -- report [--day YYYY-MM-DD] [--app <app>]",
        "",
        "Notes:",
        "- Logs are stored locally under factory/.local/ (gitignored).",
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

