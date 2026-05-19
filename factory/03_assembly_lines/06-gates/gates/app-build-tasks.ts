/**
 * Build proposed tasks for ALL phases in `order-phases.json` and (by default)
 * append them into the canonical `task-queue.json`. One-shot automation step
 * used by `pipeline run`.
 *
 *   npm run mfg -- app build-tasks -- <orderId> [--no-merge] [--dry-run] [--json]
 *
 * Writes factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-<phaseId>.json
 * for every phase, then (unless --no-merge) appends the new tasks into
 * factory/03_assembly_lines/03-registry/registry/task-queue.json.
 *
 * Single-phase partner: `mfg app bdtask -- <orderId> <phaseId>` (keeps the
 * human-review gate; does not auto-merge).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const buildTasksScript = path.join(
  repoRoot,
  "factory",
  "01_production_planning",
  "01_00_work_orders",
  "build-tasks.ts",
);

function usage(): void {
  console.error(`Usage:
  npm run mfg -- app build-tasks -- <orderId> [--no-merge] [--dry-run] [--json]

Loops every phase in order-phases.json, writes per-phase breakdown files, and
appends proposedTasks into the canonical task-queue.json. Pipeline runs this
between bdphase and sprint-init so new apps come out with a populated queue.

Flags:
  --no-merge   Only write the per-phase breakdown files.
  --dry-run    Print the plan; don't write anything.
  --json       Emit a single JSON summary at the end.

Single-phase partner (manual review):
  npm run mfg -- app bdtask -- <orderId> <phaseId>
`);
}

function forward(args: string[]): number {
  const r = spawnSync("npx", ["tsx", buildTasksScript, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

function main(): number {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    usage();
    return argv.length === 0 ? 1 : 0;
  }
  return forward(argv);
}

process.exit(main());
