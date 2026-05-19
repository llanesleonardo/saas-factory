/**
 * Bootstrap per-order epic roadmap (order-phases.json).
 *
 *   npm run mfg -- app bdphase -- <orderId> [--from-md] [--json]
 *
 * Requires `factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json`.
 * Writes `factory/01_production_planning/01_02_phase_registry/<orderId>/order-phases.json`.
 *
 * Equivalent to: npm run mfg -- order phases <orderId> init ...
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const orderPhasesScript = path.join(repoRoot, "factory", "01_production_planning", "01_00_work_orders", "order-phases.ts");

function usage(): void {
  console.error(`Usage:
  npm run mfg -- app bdphase -- <orderId> [--from-md] [--json]

Creates folder factory/01_production_planning/01_02_phase_registry/<orderId>/ with order-phases.json
(requires factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json).

Same as: npm run mfg -- order phases <orderId> init ...
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
  const flags: string[] = [];
  let orderId: string | undefined;
  for (const a of argv) {
    if (a.startsWith("--")) {
      flags.push(a);
      continue;
    }
    if (!orderId) orderId = a;
    else {
      console.error(`Unexpected argument: ${a}`);
      usage();
      return 1;
    }
  }
  if (!orderId?.trim()) {
    usage();
    return 1;
  }
  return forward([orderId.trim(), "init", ...flags]);
}

process.exit(main());
