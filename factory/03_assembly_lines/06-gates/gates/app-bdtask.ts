/**
 * Bootstrap proposed tasks for one order epic (phase).
 *
 *   npm run mfg -- app bdtask -- <orderId> <phaseId> [--lane <lane>]... [--json] [--dry-run]
 *
 * Writes factory/01_production_planning/01_03_task-registry/<orderId>/phase-breakdown-<phaseId>.json
 *
 * Equivalent to: npm run mfg -- order phases <orderId> breakdown <phaseId> ...
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const orderPhasesScript = path.join(repoRoot, "factory", "01_production_planning", "01_00_work_orders", "order-phases.ts");

function usage(): void {
  console.error(`Usage:
  npm run mfg -- app bdtask -- <orderId> <phaseId> [--lane <lane>]... [--json] [--dry-run]

Creates phase-breakdown-<phaseId>.json under factory/01_production_planning/01_03_task-registry/<orderId>/
Merge proposedTasks into factory/03_assembly_lines/03-registry/registry/task-queue.json after review; then run npm run mfg -- line next to confirm the board.

Examples:
  npm run mfg -- app bdtask -- example-order-001 TODO_P4_PHASE_PLANNING --dry-run
  npm run mfg -- app bdtask -- example-order-001 TODO_P4_PHASE_PLANNING --lane docs --lane qa

Same as: npm run mfg -- order phases <orderId> breakdown <phaseId> ...
`);
}

function forward(args: string[]): number {
  const r = spawnSync("npx", ["tsx", orderPhasesScript, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

function main(): number {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  const positional: string[] = [];
  const flags: string[] = [];
  for (const a of argv) {
    if (a.startsWith("--")) flags.push(a);
    else positional.push(a);
  }
  if (positional.length < 2) {
    usage();
    return 1;
  }
  const orderId = positional[0]!.trim();
  const phaseId = positional[1]!.trim();
  return forward([orderId, "breakdown", phaseId, ...flags]);
}

process.exit(main());
