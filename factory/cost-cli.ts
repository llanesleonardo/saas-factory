import path from "node:path";
import { pathToFileURL } from "node:url";

import { repoRootFromHere, type EvidencePointer } from "./telemetry.js";
import {
  appendCostEvent,
  makeCostEvent,
  readCostEvents,
  rollupDay,
  rollupRun,
  type CostKind,
  type CostSource,
} from "./cost.js";

type ProviderId = "aws" | "azure" | "gcp" | "digitalocean";
type AppSize = "tiny" | "small" | "medium";

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

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function die(msg: string): never {
  throw new Error(msg);
}

function parseKind(v: string | undefined): CostKind {
  if (v === "model" || v === "runtime" || v === "infra" || v === "SaaS" || v === "other") return v;
  die(`Missing/invalid --kind (model|runtime|infra|SaaS|other). Got: ${JSON.stringify(v)}`);
}

function parseSource(v: string | undefined): CostSource {
  if (v === "manual" || v === "measured" || v === "estimated") return v;
  die(`Missing/invalid --source (manual|measured|estimated). Got: ${JSON.stringify(v)}`);
}

function parseAmountUsd(v: string | undefined): number {
  if (!v) die("Missing --amount-usd");
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) die(`Invalid --amount-usd (must be >= 0). Got: ${JSON.stringify(v)}`);
  return n;
}

function parseProvider(v: string | undefined): ProviderId {
  if (v === "aws" || v === "azure" || v === "gcp" || v === "digitalocean") return v;
  die(`Missing/invalid --provider (aws|azure|gcp|digitalocean). Got: ${JSON.stringify(v)}`);
}

function parseSize(v: string | undefined): AppSize {
  if (!v) return "small";
  if (v === "tiny" || v === "small" || v === "medium") return v;
  die(`Invalid --size (tiny|small|medium). Got: ${JSON.stringify(v)}`);
}

function labelForHostingBaseline(provider: ProviderId, size: AppSize): string {
  return `${provider}_${size}_baseline`;
}

async function cmdAdd(argv: string[], repoRoot: string): Promise<void> {
  const app = parseArgValue(argv, "app");
  if (!app) die("Missing --app (e.g. apps/todo-instance)");

  const e = makeCostEvent({
    app,
    kind: parseKind(parseArgValue(argv, "kind")),
    source: parseSource(parseArgValue(argv, "source")),
    label: parseArgValue(argv, "label") ?? die("Missing --label"),
    amount_usd: parseAmountUsd(parseArgValue(argv, "amount-usd")),
    run_id: parseArgValue(argv, "run-id"),
    job_id: parseArgValue(argv, "job-id"),
    task_id_primary: parseArgValue(argv, "task-id-primary"),
    task_ids: parseArgValue(argv, "task-ids")?.split(",").map((s) => s.trim()).filter(Boolean),
    agent_role: parseArgValue(argv, "agent-role"),
    tool_id: parseArgValue(argv, "tool-id"),
    notes: parseArgValue(argv, "notes"),
    evidence: (() => {
      const p = parseArgValue(argv, "evidence-path");
      if (!p) return undefined;
      const ev: EvidencePointer = { type: "file", label: "evidence", path: p };
      return [ev];
    })(),
  });

  const logPath = await appendCostEvent(repoRoot, e);
  console.log(JSON.stringify({ status: "ok", written_to: logPath, event: e }, null, 2));
}

async function cmdAddHostingBaseline(argv: string[], repoRoot: string): Promise<void> {
  const app = parseArgValue(argv, "app");
  if (!app) die("Missing --app (e.g. apps/todo-instance)");
  const provider = parseProvider(parseArgValue(argv, "provider"));
  const size = parseSize(parseArgValue(argv, "size"));

  // Import baseline cost logic (no shelling out / no dependency on npm scripts).
  const { estimateHostingBaseline } = await import("./hosting-cost-shared.js");
  const estimate = estimateHostingBaseline(app, provider, size);

  const e = makeCostEvent({
    app,
    kind: "infra",
    source: "estimated",
    label: labelForHostingBaseline(provider, size),
    amount_usd: estimate.monthly_usd,
    notes: `Baseline compute-only estimate via hosting-cost baselines (provider=${provider} size=${size}). Excludes: ${estimate.excludes.join(
      ", ",
    )}`,
  });

  const logPath = await appendCostEvent(repoRoot, e);
  console.log(JSON.stringify({ status: "ok", written_to: logPath, estimate, event: e }, null, 2));
}

async function cmdReport(argv: string[], repoRoot: string): Promise<void> {
  const day = parseArgValue(argv, "day") ?? utcDayNow();
  const app = parseArgValue(argv, "app");
  const runId = parseArgValue(argv, "run-id");
  const asJson = hasFlag(argv, "--json");

  const events = await readCostEvents(repoRoot, day);

  if (runId) {
    const rr = rollupRun(events, runId);
    if (asJson) {
      console.log(JSON.stringify(rr, null, 2));
      return;
    }
    console.log(`run: ${runId}`);
    console.log(`total_usd: ${rr.total_usd}`);
    console.log(`byKind: ${Object.entries(rr.totals_by_kind).map(([k, v]) => `${k}=${v}`).join(" ") || "n/a"}`);
    return;
  }

  const r = rollupDay(events, day, app);
  if (asJson) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.log(`day: ${day}${app ? ` app=${app}` : ""}`);
  console.log(`events: ${r.count_events}`);
  console.log(`total_usd: ${r.total_usd}`);
  console.log(`byKind: ${Object.entries(r.totals_by_kind).map(([k, v]) => `${k}=${v}`).join(" ") || "n/a"}`);
  console.log(`bySource: ${Object.entries(r.totals_by_source).map(([k, v]) => `${k}=${v}`).join(" ") || "n/a"}`);
  if (r.top_labels.length) {
    console.log(`topLabels: ${r.top_labels.map((x) => `${x.label}=${x.total_usd}`).join(" ")}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(
      [
        "Usage:",
        "  npm run factory:cost -- <command> [args]",
        "",
        "Commands:",
        "  add --app <app> --kind <kind> --source <source> --label <label> --amount-usd <n> [--day YYYY-MM-DD] [--run-id ...] [--task-id-primary ...]",
        "  add-hosting-baseline --app <app> --provider <aws|azure|gcp|digitalocean> [--size tiny|small|medium]",
        "  report [--day YYYY-MM-DD] [--app <app>] [--run-id <runId>] [--json]",
        "",
        "Notes:",
        "- Costs are stored locally under factory/.local/ (gitignored).",
        "- Day boundaries are UTC.",
      ].join("\n"),
    );
    process.exitCode = 0;
    return;
  }

  const repoRoot = repoRootFromHere(import.meta.url);

  if (cmd === "add") return cmdAdd(argv, repoRoot);
  if (cmd === "add-hosting-baseline") return cmdAddHostingBaseline(argv, repoRoot);
  if (cmd === "report") return cmdReport(argv, repoRoot);

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

