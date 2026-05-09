import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ActiveTimer = {
  startedAtIso: string;
  app: string;
  agent?: string;
  note?: string;
};

type TimerEvent =
  | ({ type: "start" } & ActiveTimer)
  | { type: "stop"; stoppedAtIso: string; app: string; agent?: string; note?: string; startedAtIso: string };

function nowIso(): string {
  return new Date().toISOString();
}

function utcDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatHms(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function parseArgValue(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1]!;
  return undefined;
}

async function ensureLocalDir(repoRoot: string): Promise<string> {
  const dir = path.join(repoRoot, "factory", ".local");
  await mkdir(dir, { recursive: true });
  return dir;
}

async function readActiveTimer(localDir: string): Promise<ActiveTimer | null> {
  const p = path.join(localDir, "active-timer.json");
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as ActiveTimer;
  } catch {
    return null;
  }
}

async function writeActiveTimer(localDir: string, timer: ActiveTimer | null): Promise<void> {
  const p = path.join(localDir, "active-timer.json");
  if (timer === null) {
    await writeFile(p, JSON.stringify({ active: false }, null, 2) + "\n", "utf8");
    return;
  }
  await writeFile(p, JSON.stringify(timer, null, 2) + "\n", "utf8");
}

async function appendEvent(localDir: string, event: TimerEvent): Promise<void> {
  const day = utcDateKey(event.type === "stop" ? event.stoppedAtIso : event.startedAtIso);
  const logPath = path.join(localDir, `time-tracking-${day}.jsonl`);
  await appendFile(logPath, JSON.stringify(event) + "\n", "utf8");
}

async function report(localDir: string, day: string, appFilter?: string): Promise<void> {
  const logPath = path.join(localDir, `time-tracking-${day}.jsonl`);
  let raw: string;
  try {
    raw = await readFile(logPath, "utf8");
  } catch {
    console.log(`No time tracking log for ${day}.`);
    return;
  }

  const totals = new Map<string, number>(); // key = app|agent
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const e = JSON.parse(line) as TimerEvent;
    if (e.type !== "stop") continue;
    if (appFilter && e.app !== appFilter) continue;
    const ms = new Date(e.stoppedAtIso).getTime() - new Date(e.startedAtIso).getTime();
    const key = `${e.app}::${e.agent ?? "unknown"}`;
    totals.set(key, (totals.get(key) ?? 0) + Math.max(0, ms));
  }

  if (totals.size === 0) {
    console.log(`No completed sessions for ${day}${appFilter ? ` (app=${appFilter})` : ""}.`);
    return;
  }

  console.log(`Time report (UTC) — ${day}${appFilter ? ` — app=${appFilter}` : ""}`);
  const rows = [...totals.entries()]
    .map(([key, ms]) => {
      const [app, agent] = key.split("::");
      return { app, agent, ms };
    })
    .sort((a, b) => b.ms - a.ms);

  for (const r of rows) {
    console.log(`- ${r.app} / ${r.agent}: ${formatHms(r.ms)}`);
  }
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const localDir = await ensureLocalDir(repoRoot);

  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(
      [
        "Usage:",
        "  npm run factory:time -- start --app <app> [--agent <role>] [--note <text>]",
        "  npm run factory:time -- stop [--note <text>]",
        "  npm run factory:time -- report [--day YYYY-MM-DD] [--app <app>]",
        "",
        "Notes:",
        "- Logs are stored locally under factory/.local/ (gitignored).",
        "- Day boundaries are UTC.",
      ].join("\n"),
    );
    process.exitCode = 0;
    return;
  }

  if (cmd === "start") {
    const app = parseArgValue(argv, "app");
    if (!app) throw new Error("start requires --app <app> (e.g. apps/todo-instance)");
    const agent = parseArgValue(argv, "agent");
    const note = parseArgValue(argv, "note");
    const active = await readActiveTimer(localDir);
    if (active && (active as any).startedAtIso) {
      throw new Error(`A timer is already running for app=${active.app} since ${active.startedAtIso}. Stop it first.`);
    }
    const startedAtIso = nowIso();
    const timer: ActiveTimer = { startedAtIso, app, agent, note };
    await writeActiveTimer(localDir, timer);
    await appendEvent(localDir, { type: "start", ...timer });
    console.log(`Started timer: app=${app}${agent ? ` agent=${agent}` : ""} at ${startedAtIso}`);
    return;
  }

  if (cmd === "stop") {
    const note = parseArgValue(argv, "note");
    const active = await readActiveTimer(localDir);
    if (!active || !(active as any).startedAtIso) {
      throw new Error("No active timer. Start one first.");
    }
    const stoppedAtIso = nowIso();
    const event: TimerEvent = {
      type: "stop",
      stoppedAtIso,
      startedAtIso: active.startedAtIso,
      app: active.app,
      agent: active.agent,
      note: note ?? active.note,
    };
    await appendEvent(localDir, event);
    await writeActiveTimer(localDir, null);
    const ms = new Date(stoppedAtIso).getTime() - new Date(active.startedAtIso).getTime();
    console.log(`Stopped timer: app=${active.app}${active.agent ? ` agent=${active.agent}` : ""} (${formatHms(ms)})`);
    return;
  }

  if (cmd === "report") {
    const day = parseArgValue(argv, "day") ?? utcDateKey(nowIso());
    const app = parseArgValue(argv, "app");
    await report(localDir, day, app);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

