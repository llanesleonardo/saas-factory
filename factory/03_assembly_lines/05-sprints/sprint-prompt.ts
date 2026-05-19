/**
 * `mfg sprint task prompt <taskId> [--sprint N] [--no-write]`
 *
 * Build a structured agent-handoff prompt for one task: phase context, lane,
 * materials, what "done" looks like for THIS task, and the command to run
 * when finished. Writes the prompt to
 *
 *   factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-NNN/prompts/<taskId>.md
 *
 * and also prints it to stdout. Open the .md from the second Cursor window
 * pointed at the app folder, or just paste the stdout block.
 *
 * Discovers the orderId/productId from the task itself: every task created by
 * `app build-tasks` carries `order_phase_id` + `app`. We scan order-phases.json
 * files under `factory/01_production_planning/01_02_phase_registry/*` for a
 * matching `order_phase_id`; the matching folder name IS the orderId.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { FactoryTask } from "../../factory_libs/planning/task-graph.js";
import type { OrderPhaseEntry, OrderPhasesDoc } from "../../factory_libs/orders/order-phases-types.js";
import { sprintProductDir, sprintFolderName } from "../../factory_libs/sprints/sprint-paths.js";
import { findTaskById, filterTasksForOrder } from "../../factory_libs/sprints/sprint-task-selection.js";
import { loadTaskQueueRaw } from "../../factory_libs/sprints/sprint-task-queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

interface Opts {
  taskId: string;
  sprintNumber?: number;
  noWrite: boolean;
}

function usage(): void {
  console.error(`Usage:
  npm run mfg -- sprint task prompt <taskId> [--sprint N] [--no-write]

Builds the agent handoff prompt for one task and writes it to
  factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-NNN/prompts/<taskId>.md

Also prints the same content to stdout. Open the .md from the Cursor window
focused on apps/<slug>/ and tell the agent: "please follow this task".

Flags:
  --sprint N    Pick a specific sprint folder (default: highest-numbered).
  --no-write    Skip writing the .md file (stdout only).
`);
}

function parseCli(argv: string[]): Opts {
  let taskId: string | undefined;
  let sprintNumber: number | undefined;
  let noWrite = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    }
    if (a === "--no-write") { noWrite = true; continue; }
    if (a === "--sprint" && argv[i + 1]) {
      const n = parseInt(argv[++i]!, 10);
      if (!Number.isFinite(n) || n < 1) {
        console.error(`sprint task prompt: --sprint must be a positive integer`);
        process.exit(1);
      }
      sprintNumber = n;
      continue;
    }
    if (a.startsWith("--")) {
      console.error(`sprint task prompt: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    if (!taskId) {
      taskId = a;
      continue;
    }
    console.error(`sprint task prompt: unexpected positional "${a}".`);
    process.exit(1);
  }
  if (!taskId) {
    usage();
    process.exit(1);
  }
  return { taskId: taskId.trim(), sprintNumber, noWrite };
}

/**
 * Scan every order-phases.json under 01_02_phase_registry/ for one containing
 * the task's `order_phase_id`. The folder name is the orderId.
 */
async function findOrderForTask(task: FactoryTask): Promise<
  { orderId: string; productId: string; doc: OrderPhasesDoc; phase: OrderPhaseEntry } | null
> {
  const opid = (task.order_phase_id ?? "").trim();
  if (!opid) return null;
  const root = path.join(REPO_ROOT, "factory", "01_production_planning", "01_02_phase_registry");
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const filePath = path.join(root, e.name, "order-phases.json");
    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch {
      continue;
    }
    let doc: OrderPhasesDoc;
    try {
      doc = JSON.parse(raw) as OrderPhasesDoc;
    } catch {
      continue;
    }
    const phase = doc.phases.find((p) => p.id === opid);
    if (phase) {
      return { orderId: e.name, productId: doc.productId, doc, phase };
    }
  }
  return null;
}

async function latestSprintNumber(orderId: string, productId: string): Promise<number | null> {
  const root = sprintProductDir(REPO_ROOT, orderId, productId);
  try {
    const ents = await readdir(root, { withFileTypes: true });
    const nums: number[] = [];
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      const m = /^sprint-(\d+)$/.exec(e.name);
      if (m) nums.push(parseInt(m[1]!, 10));
    }
    nums.sort((a, b) => b - a);
    return nums[0] ?? null;
  } catch {
    return null;
  }
}

interface PromptCtx {
  task: FactoryTask;
  phase: OrderPhaseEntry;
  orderId: string;
  productId: string;
  sprintNumber: number;
  appInstance: string;
  appApi: string;
  appParent: string;
  scopedTasks: FactoryTask[];
}

function chooseAppFolders(productId: string, scoped: FactoryTask[]): { instance: string; api: string; parent: string } {
  const apps = new Set(scoped.map((t) => (t.app ?? "").trim()).filter(Boolean));
  const nestedInst = `apps/${productId}/${productId}-instance`;
  const nestedApi = `apps/${productId}/${productId}-api`;
  const flatInst = `apps/${productId}-instance`;
  const flatApi = `apps/${productId}-api`;
  if (apps.has(nestedInst) || !apps.has(flatInst)) {
    return { instance: nestedInst, api: nestedApi, parent: `apps/${productId}` };
  }
  return { instance: flatInst, api: flatApi, parent: `apps/${productId}` };
}

function laneAgentRole(lane: string | undefined): string {
  switch (lane) {
    case "frontend":
    case "backend":
    case "api":
    case "data":
      return "dev / builder";
    case "infra":
      return "devops";
    case "qa":
      return "quality";
    case "docs":
      return "docs";
    case "auth":
      return "security / dev";
    case "integration":
      return "dev / quality";
    default:
      return "dev";
  }
}

function laneDoDChecklist(lane: string | undefined, appInstance: string, appApi: string): string[] {
  const lines: string[] = [];
  switch (lane) {
    case "frontend":
      lines.push(`Code lives under ${appInstance}/`);
      lines.push(`\`npm run -w ${appInstance} build\` passes`);
      lines.push(`UI matches the spec's acceptance bullets`);
      break;
    case "backend":
    case "api":
      lines.push(`Code lives under ${appApi}/`);
      lines.push(`\`npm run -w ${appApi} build\` passes`);
      lines.push(`API contract matches app.stack.json`);
      break;
    case "infra":
      lines.push(`Config additions (compose, env, workflows) committed`);
      lines.push(`\`npm run mfg -- validate factory\` still green`);
      break;
    case "qa":
      lines.push(`Tests added under ${appInstance}/ or ${appApi}/__tests__/`);
      lines.push(`Tests pass when run with the workspace's test script`);
      break;
    case "docs":
      lines.push(`Docs added/updated under configs/apps/<slug>/specs/ or the app folder's README`);
      lines.push(`Cross-references kept consistent with the spec`);
      break;
    default:
      lines.push(`Code lives under ${appInstance}/ (or ${appApi}/ for API work)`);
      lines.push(`Build for the affected workspace passes`);
  }
  lines.push(`No work outside ${appInstance}/ or ${appApi}/ (factory tooling stays read-only)`);
  return lines;
}

function dependsTitleList(deps: string[], allTasks: FactoryTask[]): string {
  if (!deps.length) return "(none)";
  return deps
    .map((id) => {
      const t = allTasks.find((x) => x.id === id);
      const title = t ? ` — ${t.title}` : "";
      const status = t ? ` [${t.status ?? "backlog"}]` : "";
      return `  - ${id}${status}${title}`;
    })
    .join("\n");
}

function unblocksList(taskId: string, allTasks: FactoryTask[]): string {
  const downstream = allTasks.filter((t) => (t.depends_on ?? []).includes(taskId));
  if (downstream.length === 0) return "(none)";
  return downstream
    .map((t) => `  - ${t.id} — ${t.title}`)
    .join("\n");
}

function materialsList(phase: OrderPhaseEntry, task: FactoryTask): string {
  const pointerSources = Object.entries(phase.pointers ?? {});
  const taskMats = task.materials ?? [];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const [k, v] of pointerSources) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    lines.push(`  - ${v}    (${k})`);
  }
  for (const m of taskMats) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    lines.push(`  - ${m}`);
  }
  if (lines.length === 0) lines.push("  (no materials declared — check configs/apps/<slug>/ for context)");
  return lines.join("\n");
}

function buildPromptBody(ctx: PromptCtx): string {
  const { task, phase } = ctx;
  const lane = task.workcenters?.[0];
  const role = laneAgentRole(lane);
  const dod = laneDoDChecklist(lane, ctx.appInstance, ctx.appApi);
  const deps = dependsTitleList(task.depends_on ?? [], ctx.scopedTasks);
  const unblocks = unblocksList(task.id, ctx.scopedTasks);
  const materials = materialsList(phase, task);

  return `# Agent handoff — ${task.id}

You are working on a SaaS factory task.

| | |
|--|--|
| **Task ID**     | \`${task.id}\` |
| **Title**       | ${task.title} |
| **Phase**       | \`${phase.id}\` — ${phase.title} |
| **Lane**        | \`${lane ?? "(unspecified)"}\` (primary agent role: ${role}) |
| **Sprint**      | #${ctx.sprintNumber} of order \`${ctx.orderId}\` |
| **App folder**  | \`${ctx.appParent}/\` (frontend: \`${ctx.appInstance}/\`, API: \`${ctx.appApi}/\`) |

## Materials (read these first)

${materials}

## Depends on (should already be done)

${deps}

## Will unblock (next in line)

${unblocks}

## Definition of done for THIS task

${dod.map((d) => `- [ ] ${d}`).join("\n")}

## Constraints

- Do **not** edit anything under \`factory/\` (that's factory tooling, owned by the factory orchestrator).
- Stick to the lane: this task is the **${lane ?? "—"}** slice of ${phase.title}.
- Keep diffs small enough to review per task; one task = one logical change.

## When you finish

\`\`\`bash
npm run mfg -- line done ${task.id}
\`\`\`

If you're blocked, mark it so the human in the factory shell can intervene:

\`\`\`bash
npm run mfg -- line done ${task.id} --status blocked --reason "<short why>"
\`\`\`

After either, re-run \`npm run mfg -- sprint board ${ctx.orderId} ${ctx.productId}\` to see the updated board and the next ready task.
`;
}

async function main(): Promise<number> {
  const opts = parseCli(process.argv.slice(2));

  const queue = await loadTaskQueueRaw(REPO_ROOT);
  const task = findTaskById(queue.tasks, opts.taskId);
  if (!task) {
    console.error(`sprint task prompt: task "${opts.taskId}" not found in task-queue.json`);
    return 1;
  }

  const found = await findOrderForTask(task);
  if (!found) {
    console.error(
      `sprint task prompt: cannot locate the order for task "${opts.taskId}".\n` +
        `  - The task has no \`order_phase_id\`, or\n` +
        `  - No order-phases.json under 01_02_phase_registry/ contains that phase.\n` +
        `Run \`mfg app bdphase\` + \`mfg app build-tasks\` to regenerate, or pick a task created by build-tasks.`,
    );
    return 1;
  }
  const { orderId, productId, doc, phase } = found;

  const sprintN = opts.sprintNumber ?? (await latestSprintNumber(orderId, productId));
  if (!sprintN) {
    console.error(
      `No sprint folder under ${path.relative(REPO_ROOT, sprintProductDir(REPO_ROOT, orderId, productId))}.\n` +
        `Run: npm run mfg -- sprint init ${orderId} ${productId}`,
    );
    return 1;
  }

  const scopedTasks = filterTasksForOrder(queue.tasks, doc, productId);
  const folders = chooseAppFolders(productId, scopedTasks);

  const ctx: PromptCtx = {
    task,
    phase,
    orderId,
    productId,
    sprintNumber: sprintN,
    appInstance: folders.instance,
    appApi: folders.api,
    appParent: folders.parent,
    scopedTasks,
  };

  const body = buildPromptBody(ctx);

  if (!opts.noWrite) {
    const outDir = path.join(
      sprintProductDir(REPO_ROOT, orderId, productId),
      sprintFolderName(sprintN),
      "prompts",
    );
    await mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${task.id}.md`);
    await writeFile(outPath, body, "utf8");
    console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
    console.log("Open it from the Cursor window scoped to the app folder, or paste the block below.\n");
  }

  console.log(body);
  return 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { main as runSprintPrompt };
