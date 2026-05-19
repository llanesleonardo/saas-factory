/**
 * Sprint records: many sprints per order + product, each tracking workstation pass-through.
 *
 *   npm run mfg -- sprint init <orderId> <productId> [--number N] [--title "…"] [--goal "…"]
 *   npm run mfg -- sprint list <orderId> <productId>
 *   npm run mfg -- sprint show <orderId> <productId> <sprintNumber>
 *   npm run mfg -- sprint workstation <orderId> <productId> <sprintNumber> <workstationId> <status> [--notes "…"]
 *   npm run mfg -- sprint summary <orderId> <productId> <sprintNumber>   # rewrite summary from workstation rows
 *
 * Files: factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-<NNN>/sprint.json
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sprintFolderName, sprintJsonPath, sprintProductDir } from "../../factory_libs/sprints/sprint-paths.js";
import {
  SPRINT_WORKSTATION_IDS,
  type SprintRecordDoc,
  type SprintWorkstationId,
  type SprintWorkstationPass,
} from "../../factory_libs/sprints/sprint-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

type WsMap = Record<string, { label?: string }>;

async function loadWorkstationLabels(): Promise<Record<SprintWorkstationId, string>> {
  const mapPath = path.join(
    REPO_ROOT,
    "factory",
    "02_workforce",
    "02_02_workstations",
    "workstation-map.json",
  );
  const labels: Record<SprintWorkstationId, string> = {
    backlog_plan: "Backlog & planning",
    increment_build: "Increment build",
    integrate_verify: "Integrate & verify",
    release_transition: "Release & transition",
  };
  try {
    const raw = await readFile(mapPath, "utf8");
    const j = JSON.parse(raw) as { stations?: WsMap };
    const st = j.stations ?? {};
    for (const id of SPRINT_WORKSTATION_IDS) {
      const lab = st[id]?.label;
      if (lab) labels[id] = lab;
    }
  } catch {
    // defaults above
  }
  return labels;
}

function emptyWorkstations(): SprintRecordDoc["workstations"] {
  const row = (): SprintWorkstationPass => ({ status: "not_started" });
  return {
    backlog_plan: row(),
    increment_build: row(),
    integrate_verify: row(),
    release_transition: row(),
  };
}

function usage(): void {
  console.error(`Sprint records (workstation pass-through per order + product)

  npm run mfg -- sprint init <orderId> <productId> [--number N] [--title "…"] [--goal "…"]
  npm run mfg -- sprint list <orderId> <productId>
  npm run mfg -- sprint show <orderId> <productId> <sprintNumber>
  npm run mfg -- sprint workstation <orderId> <productId> <sprintNumber> <workstationId> <status> [--notes "…"]
  npm run mfg -- sprint summary <orderId> <productId> <sprintNumber>

workstationId: ${SPRINT_WORKSTATION_IDS.join(" | ")}
status: not_started | in_progress | done | skipped | blocked

Storage: factory/03_assembly_lines/05-sprints/<orderId>/<productId>/sprint-<NNN>/sprint.json
`);
}

function parseFlags(argv: string[]): { rest: string[]; title?: string; goal?: string; notes?: string } {
  const rest: string[] = [];
  let title: string | undefined;
  let goal: string | undefined;
  let notes: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--title" && argv[i + 1]) {
      title = argv[++i];
    } else if (a === "--goal" && argv[i + 1]) {
      goal = argv[++i];
    } else if (a === "--notes" && argv[i + 1]) {
      notes = argv[++i];
    } else if (a !== "--") {
      rest.push(a);
    }
  }
  return { rest, title, goal, notes };
}

async function listSprintNumbers(repoRoot: string, orderId: string, productId: string): Promise<number[]> {
  const root = sprintProductDir(repoRoot, orderId, productId);
  let names: string[];
  try {
    names = await readdir(root, { withFileTypes: true }).then((ents) =>
      ents.filter((e) => e.isDirectory() && e.name.startsWith("sprint-")).map((e) => e.name),
    );
  } catch {
    return [];
  }
  const nums: number[] = [];
  for (const n of names) {
    const m = /^sprint-(\d+)$/.exec(n);
    if (m) nums.push(parseInt(m[1]!, 10));
  }
  return nums.sort((a, b) => a - b);
}

async function nextSprintNumber(repoRoot: string, orderId: string, productId: string): Promise<number> {
  const nums = await listSprintNumbers(repoRoot, orderId, productId);
  return nums.length ? nums[nums.length - 1]! + 1 : 1;
}

function buildSummary(doc: SprintRecordDoc, labels: Record<SprintWorkstationId, string>): string {
  const parts: string[] = [];
  parts.push(
    `Sprint #${doc.sprintNumber} (${doc.orderId} / ${doc.productId}): workstation pass-through — `,
  );
  const segs: string[] = [];
  for (const id of SPRINT_WORKSTATION_IDS) {
    const w = doc.workstations[id];
    const label = labels[id] ?? id;
    segs.push(`${label}: ${w.status}${w.notes ? ` (${w.notes})` : ""}`);
  }
  parts.push(segs.join("; "));
  parts.push(".");
  return parts.join("");
}

async function readDoc(
  repoRoot: string,
  orderId: string,
  productId: string,
  sprintNumber: number,
): Promise<{ filePath: string; doc: SprintRecordDoc } | { error: string }> {
  const p = sprintJsonPath(repoRoot, orderId, productId, sprintNumber);
  let raw: string;
  try {
    raw = await readFile(p, "utf8");
  } catch {
    return { error: `Missing ${path.relative(repoRoot, p)}` };
  }
  let doc: SprintRecordDoc;
  try {
    doc = JSON.parse(raw) as SprintRecordDoc;
  } catch {
    return { error: "Invalid sprint.json JSON" };
  }
  if (doc.kind !== "sprint-record" || doc.schemaVersion !== 1) {
    return { error: "Not a sprint-record v1 document" };
  }
  return { filePath: p, doc };
}

async function writeDoc(p: string, doc: SprintRecordDoc): Promise<void> {
  doc.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

async function cmdInit(
  repoRoot: string,
  orderId: string,
  productId: string,
  flags: ReturnType<typeof parseFlags>,
): Promise<number> {
  const { rest, title, goal } = flags;
  let numArg: number | undefined;
  const numIdx = rest.indexOf("--number");
  if (numIdx >= 0 && rest[numIdx + 1]) {
    numArg = parseInt(rest[numIdx + 1]!, 10);
    rest.splice(numIdx, 2);
  }
  const sprintNumber = Number.isFinite(numArg!) && numArg! >= 1 ? numArg! : await nextSprintNumber(repoRoot, orderId, productId);
  const p = sprintJsonPath(repoRoot, orderId, productId, sprintNumber);
  try {
    await readFile(p, "utf8");
    console.error(`Refusing to overwrite existing ${path.relative(repoRoot, p)} (pick another --number or delete folder).`);
    return 1;
  } catch {
    /* ok */
  }
  const now = new Date().toISOString();
  const workstations = emptyWorkstations();
  const labels = await loadWorkstationLabels();
  const doc: SprintRecordDoc = {
    schemaVersion: 1,
    kind: "sprint-record",
    orderId: orderId.trim(),
    productId: productId.trim(),
    sprintNumber,
    title,
    goal,
    createdAt: now,
    updatedAt: now,
    workstations,
    summary: "",
  };
  doc.summary = buildSummary(doc, labels);
  await writeDoc(p, doc);
  console.log(`Wrote ${path.relative(repoRoot, p)}`);
  return 0;
}

async function cmdList(repoRoot: string, orderId: string, productId: string): Promise<number> {
  const nums = await listSprintNumbers(repoRoot, orderId, productId);
  if (nums.length === 0) {
    console.log(`No sprints under ${path.relative(repoRoot, sprintProductDir(repoRoot, orderId, productId))}`);
    return 0;
  }
  for (const n of nums) {
    const hit = await readDoc(repoRoot, orderId, productId, n);
    if ("error" in hit) {
      console.log(`  sprint-${String(n).padStart(3, "0")}: ${hit.error}`);
      continue;
    }
    const t = hit.doc.title ? ` — ${hit.doc.title}` : "";
    console.log(`  sprint-${String(n).padStart(3, "0")}${t}`);
  }
  return 0;
}

async function cmdShow(repoRoot: string, orderId: string, productId: string, sprintNumber: number): Promise<number> {
  const hit = await readDoc(repoRoot, orderId, productId, sprintNumber);
  if ("error" in hit) {
    console.error(hit.error);
    return 1;
  }
  console.log(JSON.stringify(hit.doc, null, 2));
  return 0;
}

async function cmdWorkstation(
  repoRoot: string,
  orderId: string,
  productId: string,
  sprintNumber: number,
  wsId: string,
  status: SprintWorkstationPass["status"],
  notes?: string,
): Promise<number> {
  if (!SPRINT_WORKSTATION_IDS.includes(wsId as SprintWorkstationId)) {
    console.error(`Invalid workstationId "${wsId}". Use: ${SPRINT_WORKSTATION_IDS.join(", ")}`);
    return 1;
  }
  const allowed: SprintWorkstationPass["status"][] = ["not_started", "in_progress", "done", "skipped", "blocked"];
  if (!allowed.includes(status)) {
    console.error(`Invalid status "${status}". Use: ${allowed.join(", ")}`);
    return 1;
  }
  const hit = await readDoc(repoRoot, orderId, productId, sprintNumber);
  if ("error" in hit) {
    console.error(hit.error);
    return 1;
  }
  const { doc, filePath: fp } = hit;
  const ws = doc.workstations[wsId as SprintWorkstationId];
  const now = new Date().toISOString();
  if (status === "in_progress" && ws.status !== "in_progress") {
    ws.enteredAt = now;
  }
  if (["done", "skipped", "blocked", "not_started"].includes(status) && ws.status === "in_progress") {
    ws.exitedAt = now;
  }
  ws.status = status;
  if (notes !== undefined) ws.notes = notes;
  const labels = await loadWorkstationLabels();
  doc.summary = buildSummary(doc, labels);
  await writeDoc(fp, doc);
  console.log(`Updated ${path.relative(repoRoot, fp)} — ${wsId} → ${status}`);
  return 0;
}

async function cmdSummary(repoRoot: string, orderId: string, productId: string, sprintNumber: number): Promise<number> {
  const hit = await readDoc(repoRoot, orderId, productId, sprintNumber);
  if ("error" in hit) {
    console.error(hit.error);
    return 1;
  }
  const labels = await loadWorkstationLabels();
  hit.doc.summary = buildSummary(hit.doc, labels);
  await writeDoc(hit.filePath, hit.doc);
  console.log(hit.doc.summary);
  return 0;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  if (argv.length < 2) {
    usage();
    return 1;
  }
  const sub = argv[0]!;
  const flags = parseFlags(argv.slice(1));
  const rest = flags.rest;

  if (sub === "init") {
    if (rest.length < 2) {
      usage();
      return 1;
    }
    return cmdInit(REPO_ROOT, rest[0]!, rest[1]!, flags);
  }

  if (sub === "list") {
    if (rest.length < 2) {
      usage();
      return 1;
    }
    return cmdList(REPO_ROOT, rest[0]!, rest[1]!);
  }

  if (sub === "show") {
    if (rest.length < 3) {
      usage();
      return 1;
    }
    const n = parseInt(rest[2]!, 10);
    if (!Number.isFinite(n) || n < 1) {
      console.error("sprintNumber must be a positive integer");
      return 1;
    }
    return cmdShow(REPO_ROOT, rest[0]!, rest[1]!, n);
  }

  if (sub === "workstation") {
    if (rest.length < 5) {
      usage();
      return 1;
    }
    const n = parseInt(rest[2]!, 10);
    if (!Number.isFinite(n) || n < 1) {
      console.error("sprintNumber must be a positive integer");
      return 1;
    }
    return cmdWorkstation(REPO_ROOT, rest[0]!, rest[1]!, n, rest[3]!, rest[4]! as SprintWorkstationPass["status"], flags.notes);
  }

  if (sub === "summary") {
    if (rest.length < 3) {
      usage();
      return 1;
    }
    const n = parseInt(rest[2]!, 10);
    if (!Number.isFinite(n) || n < 1) {
      console.error("sprintNumber must be a positive integer");
      return 1;
    }
    return cmdSummary(REPO_ROOT, rest[0]!, rest[1]!, n);
  }

  usage();
  return 1;
}

void main().then((c) => {
  process.exitCode = c;
});
