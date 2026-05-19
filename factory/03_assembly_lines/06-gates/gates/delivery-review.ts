/**
 * Delivery gate — checklist + optional validator runs for one order + product.
 *
 * Covers: task queue / proposed work → automated checks → sprint narrative vs contract
 * artifacts → where the app actually lives.
 *
 *   npm run mfg -- gates review <orderId> <productId> [--sprint N] [--run]
 *
 * --run   Also executes stack validation for <productId> (same as `mfg stack validate -- <slug>`).
 */
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appStackPath, verticalBriefPath } from "../../../factory_libs/paths/app-config-paths.js";
import { sprintJsonPath, sprintProductDir } from "../../../factory_libs/sprints/sprint-paths.js";
import type { SprintRecordDoc } from "../../../factory_libs/sprints/sprint-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const GATES_ROOT = path.join(__dirname, "..");
const VALIDATION = path.join(GATES_ROOT, "validation");

function usage(): void {
  console.error(`Usage: npm run mfg -- gates review <orderId> <productId> [--sprint N] [--run]`);
}

async function latestSprintNumber(orderId: string, productId: string): Promise<number | undefined> {
  const root = sprintProductDir(REPO_ROOT, orderId, productId);
  let names: string[];
  try {
    names = await readdir(root, { withFileTypes: true }).then((ents) =>
      ents.filter((e) => e.isDirectory() && e.name.startsWith("sprint-")).map((e) => e.name),
    );
  } catch {
    return undefined;
  }
  const nums: number[] = [];
  for (const n of names) {
    const m = /^sprint-(\d+)$/.exec(n);
    if (m) nums.push(parseInt(m[1]!, 10));
  }
  if (nums.length === 0) return undefined;
  return nums.sort((a, b) => a - b)[nums.length - 1];
}

function runValidator(relScript: string, args: string[]): number {
  const script = path.join(REPO_ROOT, relScript);
  const r = spawnSync("npx", ["tsx", script, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  let sprintArg: number | undefined;
  let runValidators = false;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--sprint" && argv[i + 1]) {
      sprintArg = parseInt(argv[++i]!, 10);
    } else if (a === "--run") runValidators = true;
    else rest.push(a);
  }

  if (rest.length < 2) {
    usage();
    return 1;
  }

  const orderId = rest[0]!.trim();
  const productId = rest[1]!.trim();
  let sprintN: number | undefined = Number.isFinite(sprintArg!) && sprintArg! >= 1 ? sprintArg! : await latestSprintNumber(orderId, productId);

  const inst = path.join("apps", `${productId}-instance`);
  const api = path.join("apps", `${productId}-api`);
  const specsDir = path.join("configs", "apps", productId, "specs");
  const phaseReg = path.join("factory", "01_production_planning", "01_03_task-registry", orderId);
  const taskQueue = path.join("factory", "03_assembly_lines", "03-registry", "registry", "task-queue.json");
  const sprintRel =
    sprintN !== undefined
      ? path.relative(REPO_ROOT, sprintJsonPath(REPO_ROOT, orderId, productId, sprintN))
      : "(no sprint yet — run: mfg sprint init …)";

  console.log(`
=== 06-gates delivery review ===
orderId=${orderId}  productId=${productId}  sprint#=${sprintN ?? "—"}
`);

  console.log(`--- 1) Review tasks (queue + order proposals) ---
Machine state:
  • Global pull queue:  ${taskQueue}
  • Order phase proposals:  ${path.relative(REPO_ROOT, path.join(REPO_ROOT, phaseReg))}/
Human / PM gate: pull next work, match tasks to acceptance criteria, clear blocked_reason when unblocked.
Validators (fixtures + schema):  mfg validate factory  →  task-queue, task-queue-fixtures, agent-output, …
`);

  console.log(`--- 2) Test the work (automation + app harness) ---
Repo checks:
  • mfg validate apps     — vertical brief + all app.stack.json
  • mfg stack validate -- ${productId}  — System IR cross-field rules for this product
App workspaces (run package scripts locally / CI):
  • ${inst}/   (frontend / instance)
  • ${api}/    (API)
Station fixtures:  ${path.relative(REPO_ROOT, path.join(GATES_ROOT, "fixtures"))}/
`);

  let sprintSummary = "(no sprint.json for this sprint number)";
  if (sprintN !== undefined) {
    try {
      const raw = await readFile(sprintJsonPath(REPO_ROOT, orderId, productId, sprintN), "utf8");
      const doc = JSON.parse(raw) as SprintRecordDoc;
      if (doc.kind === "sprint-record") {
        sprintSummary = doc.summary;
      }
    } catch {
      sprintSummary = "(missing or invalid sprint.json)";
    }
  } else {
    sprintSummary = "(create a sprint: mfg sprint init <orderId> <productId>)";
  }

  console.log(`--- 3) Sprint outcome vs contract intent ---
Sprint record (workstation pass-through):  ${sprintRel}
Summary: ${sprintSummary}

Contract / spec artifacts (compare “what we wanted”):
  • Vertical brief:     ${path.relative(REPO_ROOT, verticalBriefPath(REPO_ROOT, productId))}
  • System IR (stack):  ${path.relative(REPO_ROOT, appStackPath(REPO_ROOT, productId))}
  • Specs / phases:     ${path.relative(REPO_ROOT, path.join(REPO_ROOT, specsDir))}/
Use sprint workstation statuses + notes against specs and business-needs.json (if present).
`);

  console.log(`--- 4) Review actual app implementation ---
Generated / maintained code (diff vs scaffold, security, API contracts):
  • ${inst}/
  • ${api}/
Optional: app quote / verified gates —  mfg app quote -- ${productId}   |   mfg app verified -- …

Deploy where it runs (preview → staging → prod):
  • Visual / smoke:   npm run mfg -- deploy preview [--dry-run]
  • Staging / UAT:    npm run mfg -- deploy staging [--dry-run]   (clean main; OK to stop here)
  • Production:      npm run mfg -- deploy prod [--dry-run]     (when system is ready)
  • Equivalent:      npm run mfg -- line deploy -- --env preview|staging|prod […]
`);

  if (runValidators) {
    console.log(`--- --run: executing stack validate for ${productId} ---\n`);
    const code = runValidator(
      path.posix.join("factory", "03_assembly_lines", "06-gates", "validation", "validate-app-stack.ts"),
      [productId],
    );
    if (code !== 0) return code;
    console.log("\n(Also run: npm run mfg -- validate apps   and app-level npm test / lint in workspaces.)\n");
  }

  return 0;
}

void main().then((c) => {
  process.exitCode = c;
});
