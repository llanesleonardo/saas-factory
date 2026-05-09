import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadTaskQueue } from "./task-graph.js";
import { nextAgentPromptLine, planNext, planNextToJson, qualityAgentPromptLine } from "./planner.js";
import { recordRun, repoRootFromHere } from "./telemetry.js";

function parseWipCap(argv: string[]): number {
  const fromEnv = Number.parseInt(process.env.FACTORY_WIP_CAP ?? "", 10);
  if (!Number.isNaN(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  const eq = argv.find((a) => a.startsWith("--wip="));
  if (eq) {
    const n = Number.parseInt(eq.slice("--wip=".length), 10);
    if (Number.isNaN(n) || n < 1) {
      throw new Error(`Invalid --wip= value: ${eq}`);
    }
    return n;
  }

  const idx = argv.indexOf("--wip");
  if (idx !== -1 && argv[idx + 1] !== undefined) {
    const n = Number.parseInt(argv[idx + 1]!, 10);
    if (Number.isNaN(n) || n < 1) {
      throw new Error(`Invalid --wip value: ${argv[idx + 1]}`);
    }
    return n;
  }

  return 2;
}

function parseQueuePath(argv: string[]): string | undefined {
  const eq = argv.find((a) => a.startsWith("--queue="));
  if (eq) {
    return path.resolve(eq.slice("--queue=".length));
  }
  return undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const wipCap = parseWipCap(argv);
  const queuePath = parseQueuePath(argv);

  const repoRoot = repoRootFromHere(import.meta.url);
  const tasks = queuePath !== undefined ? await loadTaskQueue(queuePath) : await loadTaskQueue();
  const result = await recordRun(repoRoot, {
    kind: "command",
    command: `npm run factory:next${asJson ? " -- --json" : ""}${queuePath ? ` -- --queue=${queuePath}` : ""}`,
    queue_path: queuePath,
    app: "factory/",
  }, async () => planNext(tasks, wipCap));

  if (asJson) {
    console.log(JSON.stringify(planNextToJson(result), null, 2));
    return;
  }

  if (result.kind === "all_done") {
    console.log(result.message);
    return;
  }

  if (result.kind === "empty") {
    console.log(result.message);
    return;
  }

  if (result.kind === "wip_full") {
    console.log(
      `WIP full (${result.wip.current}/${result.wip.cap}). In progress:`,
    );
    for (const t of result.inProgress) {
      console.log(`  - ${t.id}: ${t.title}`);
    }
    return;
  }

  const t = result.task;
  console.log(`Next task (WIP ${result.wip.current}/${result.wip.cap}):`);
  console.log("");
  console.log(`  id:      ${t.id}`);
  console.log(`  title:   ${t.title}`);
  if (t.phase !== undefined) console.log(`  phase:   ${t.phase}`);
  if (t.status !== undefined) console.log(`  status:  ${t.status}`);
  if (t.priority !== undefined) console.log(`  priority: ${t.priority}`);
  if (t.owner !== undefined) console.log(`  owner:   ${t.owner}`);
  if (t.app !== undefined) console.log(`  app:     ${t.app}`);
  console.log("");
  console.log("Next agent line (paste into Cursor):");
  console.log("");
  console.log(nextAgentPromptLine(t));
  console.log("");
  // Quality follow-up is meaningful primarily for code/automation changes.
  const assigned = (t as any).assigned_agent;
  const includeQuality =
    assigned === undefined ||
    assigned === "dev" ||
    assigned === "tooling" ||
    assigned === "fix" ||
    assigned === "devops";
  if (includeQuality) {
    console.log("Quality agent line (after implementation — harness + gates):");
    console.log("");
    console.log(qualityAgentPromptLine(t));
  }
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
