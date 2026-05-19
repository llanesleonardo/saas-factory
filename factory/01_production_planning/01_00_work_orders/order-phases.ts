/**
 * Order-level phase roadmap (epics): copy from global phase-queue or PHASES.md headings.
 *
 *   npm run mfg -- app bdphase -- <orderId> [--from-md] [--json]
 *   npm run mfg -- order phases <orderId> init [--from-md] [--json]
 *   npm run mfg -- order phases <orderId> show [--json]
 *   npm run mfg -- order phases <orderId> set-status <phaseId> <status>
 *   npm run mfg -- app bdtask -- <orderId> <phaseId> [--lane …] [--json] [--dry-run]
 *   npm run mfg -- order phases <orderId> breakdown <phaseId> [--lane …] [--json] [--dry-run]
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { orderPhasesPath } from "../../factory_libs/paths/app-config-paths.js";
import type {
  OrderPhasesDoc,
  OrderPhaseBasis,
  OrderPhaseEntry,
  OrderPhaseLane,
  OrderPhaseStatus,
} from "../../factory_libs/orders/order-phases-types.js";

import { parseBreakdownFlags, runPhaseBreakdown, usageBreakdown } from "./phase-breakdown.js";
import {
  type OrderManifest,
  primaryProductId,
  validateOrderManifest,
} from "./validate-manifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

const PHASE_QUEUE_CANDIDATES = [
  path.join(REPO_ROOT, "factory", "03_assembly_lines", "03-registry", "registry", "phase-queue.json"),
];

const STATUSES: OrderPhaseStatus[] = ["backlog", "ready", "in_progress", "blocked", "done"];

const BASIS: OrderPhaseBasis[] = [
  "business_needs",
  "blueprint_stack",
  "saas_baseline",
  "delivery_surface",
  "mixed",
  "unspecified",
];

const LANES: OrderPhaseLane[] = [
  "frontend",
  "backend",
  "api",
  "data",
  "auth",
  "infra",
  "docs",
  "qa",
  "integration",
];

type GlobalPhaseQueue = {
  phases?: Array<{
    id: string;
    title: string;
    app?: string;
    basis?: OrderPhaseBasis;
    lanes?: OrderPhaseLane[];
    businessNeedsComponentRef?: string;
    status: OrderPhaseStatus;
    depends_on?: string[];
    pointers?: Record<string, string>;
  }>;
};

function usage(): void {
  console.error(`Usage:
  npm run mfg -- order phases <orderId> init [--from-md] [--json]
  npm run mfg -- order phases <orderId> show [--json]
  npm run mfg -- order phases <orderId> set-status <phaseId> <status>
  npm run mfg -- order phases <orderId> annotate <phaseId> [--basis ${BASIS[0]}] [--lane frontend] [--component-ref path-or-id]
  npm run mfg -- order phases <orderId> breakdown <phaseId> [--lane …] [--json] [--dry-run]

  init          Copy phases for this order's primary productId from factory phase-queue (preferred),
                or use --from-md to derive headings from configs/apps/<productId>/specs/PHASES.md.
                (Multi-app orders: first entry in manifest products[] or legacy productId.)
  show          Print order-phases.json (create empty stub if missing).
  set-status    Update one phase's status (${STATUSES.join(" | ")}).
  annotate      Set basis (${BASIS.join("|")}), lanes (repeat --lane), and/or business-needs component ref.
  breakdown     Propose tasks for one epic → 01_03_task-registry/<orderId>/phase-breakdown-<phaseId>.json (merge after review).

Epics can mix business needs, blueprint (stack IR), SaaS baseline specs, and delivery lanes (frontend, backend, api, …).
Tasks are created later from each epic; carry basis/lanes into task materials when decomposing.
`);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest(orderId: string): Promise<{ path: string; manifest: OrderManifest } | null> {
  const manifestPath = path.join(__dirname, orderId.trim(), "order-manifest.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    console.error(`Cannot read ${path.relative(REPO_ROOT, manifestPath)}`);
    return null;
  }
  try {
    const manifest = JSON.parse(raw) as OrderManifest;
    return { path: manifestPath, manifest };
  } catch (e) {
    console.error("Invalid order-manifest.json:", e);
    return null;
  }
}

async function resolvePhaseQueue(): Promise<string | null> {
  for (const p of PHASE_QUEUE_CANDIDATES) {
    if (await pathExists(p)) return p;
  }
  return null;
}

async function loadGlobalPhaseQueue(): Promise<GlobalPhaseQueue | null> {
  const p = await resolvePhaseQueue();
  if (!p) return null;
  try {
    return JSON.parse(await readFile(p, "utf8")) as GlobalPhaseQueue;
  } catch {
    return null;
  }
}

function phasesFromGlobalQueue(doc: GlobalPhaseQueue, productId: string): OrderPhaseEntry[] {
  const list = doc.phases ?? [];
  const trimmed = productId.trim();
  const filtered = list.filter((ph) => (ph.app ?? "").trim() === trimmed);
  return filtered.map((ph) => ({
    id: ph.id,
    title: ph.title,
    status: ph.status,
    depends_on: ph.depends_on ?? [],
    basis: ph.basis,
    lanes: ph.lanes,
    businessNeedsComponentRef: ph.businessNeedsComponentRef,
    pointers: ph.pointers,
  }));
}

/**
 * Built-in 6-phase SaaS template used when no `phase-queue.json` entry and no
 * `PHASES.md` exist for the product. Mirrors the canonical TODO_P0..TODO_P5
 * progression: intake → stack → scaffold → spec → build → ship.
 *
 * Lanes carry into phase-breakdown so the task-queue is populated with
 * lane-tagged tasks (frontend / backend / qa / docs / infra / api).
 *
 * Override by editing the resulting order-phases.json or by providing
 * `configs/apps/<productId>/specs/PHASES.md` and re-running with `--from-md`.
 */
function synthesizeDefaultPhases(productId: string): OrderPhaseEntry[] {
  const id = productId.trim();
  const prefix = id
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.toUpperCase())
    .join("_");
  const pointers = {
    product_ir: `configs/apps/${id}/${id}.json`,
    system_ir: `configs/apps/${id}/app.stack.json`,
    spec: `configs/apps/${id}/specs/${id}-spec.md`,
  };

  return [
    {
      id: `${prefix}_P0_INTAKE`,
      title: "Phase 0 — Intake + constraints (customer needs)",
      status: "ready",
      depends_on: [],
      basis: "business_needs",
      lanes: ["docs", "qa"],
      pointers: { product_ir: pointers.product_ir },
    },
    {
      id: `${prefix}_P1_STACK_CONTRACT`,
      title: "Phase 1 — Stack contract (System IR)",
      status: "ready",
      depends_on: [`${prefix}_P0_INTAKE`],
      basis: "blueprint_stack",
      lanes: ["backend", "infra", "docs"],
      pointers: { system_ir: pointers.system_ir },
    },
    {
      id: `${prefix}_P2_SCAFFOLD`,
      title: "Phase 2 — Scaffold (make the contract real)",
      status: "ready",
      depends_on: [`${prefix}_P1_STACK_CONTRACT`],
      basis: "delivery_surface",
      lanes: ["frontend", "backend", "infra"],
      pointers: {
        system_ir: pointers.system_ir,
        scaffold_command: `npm run mfg -- app scaffold -- ${id}`,
      },
    },
    {
      id: `${prefix}_P3_SPEC`,
      title: "Phase 3 — Spec (acceptance + boundaries)",
      status: "backlog",
      depends_on: [`${prefix}_P2_SCAFFOLD`],
      basis: "mixed",
      lanes: ["docs", "qa"],
      pointers: { spec: pointers.spec },
    },
    {
      id: `${prefix}_P4_BUILD`,
      title: "Phase 4 — Build (feature delivery)",
      status: "backlog",
      depends_on: [`${prefix}_P3_SPEC`],
      basis: "delivery_surface",
      lanes: ["frontend", "backend", "api", "qa"],
      pointers: { spec: pointers.spec, system_ir: pointers.system_ir },
    },
    {
      id: `${prefix}_P5_SHIP`,
      title: "Phase 5 — Ship + verify (gates + delivery)",
      status: "backlog",
      depends_on: [`${prefix}_P4_BUILD`],
      basis: "delivery_surface",
      lanes: ["infra", "qa", "docs"],
      pointers: { spec: pointers.spec },
    },
  ];
}

function parsePhasesMdHeadings(body: string): OrderPhaseEntry[] {
  const lines = body.split(/\r?\n/);
  const phases: OrderPhaseEntry[] = [];
  let i = 0;
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      const title = m[1]!.trim();
      const id = `EPIC_${i}`;
      i += 1;
      phases.push({
        id,
        title,
        status: "backlog",
        depends_on: [],
        basis: "unspecified",
      });
    }
  }
  return phases;
}

async function initPhases(
  orderId: string,
  fromMd: boolean,
  asJson: boolean,
): Promise<number> {
  const loaded = await loadManifest(orderId);
  if (!loaded) return 1;
  const { manifest } = loaded;
  const check = await validateOrderManifest(manifest, REPO_ROOT);
  if (!check.ok) {
    for (const e of check.errors) console.error("ERR:", e);
    return 1;
  }

  const outPath = orderPhasesPath(REPO_ROOT, orderId);
  let phases: OrderPhaseEntry[] = [];
  let source: OrderPhasesDoc["source"] = "manual";

  const primaryPid = primaryProductId(manifest);

  if (fromMd) {
    const mdPath = path.join(
      REPO_ROOT,
      "configs",
      "apps",
      primaryPid,
      "specs",
      "PHASES.md",
    );
    try {
      const md = await readFile(mdPath, "utf8");
      phases = parsePhasesMdHeadings(md);
      source = "phases_md";
      if (phases.length === 0) {
        console.warn(`No ## headings found in ${path.relative(REPO_ROOT, mdPath)}`);
      }
    } catch {
      console.error(`Cannot read ${path.relative(REPO_ROOT, mdPath)}`);
      return 1;
    }
  } else {
    const gq = await loadGlobalPhaseQueue();
    if (gq) {
      phases = phasesFromGlobalQueue(gq, primaryPid);
      source = "phase-queue";
    }
    if (phases.length === 0) {
      phases = synthesizeDefaultPhases(primaryPid);
      source = "default-template";
      console.warn(
        `No phase-queue.json entry or PHASES.md for "${primaryPid}". Wrote default 6-phase SaaS template (P0..P5). Override by editing the resulting order-phases.json or providing configs/apps/${primaryPid}/specs/PHASES.md and re-running with --from-md.`,
      );
    }
  }

  const doc: OrderPhasesDoc = {
    schemaVersion: 1,
    orderId: manifest.orderId,
    productId: primaryPid,
    updatedAt: new Date().toISOString(),
    source,
    phases,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
  if (asJson) {
    console.log(JSON.stringify(doc, null, 2));
  } else {
    console.log(`Wrote ${path.relative(REPO_ROOT, outPath)} (${doc.phases.length} phases).`);
  }
  return 0;
}

async function showPhases(orderId: string, asJson: boolean): Promise<number> {
  const p = orderPhasesPath(REPO_ROOT, orderId);
  try {
    const raw = await readFile(p, "utf8");
    const doc = JSON.parse(raw) as OrderPhasesDoc;
    if (asJson) {
      console.log(JSON.stringify(doc, null, 2));
    } else {
      console.log(`Order ${doc.orderId} — ${doc.phases.length} phases (${doc.source})`);
      for (const ph of doc.phases) {
        const meta = [
          ph.basis ? `basis=${ph.basis}` : null,
          ph.lanes?.length ? `lanes=${ph.lanes.join("+")}` : null,
          ph.businessNeedsComponentRef ? `bn=${ph.businessNeedsComponentRef}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        console.log(`  [${ph.status}] ${ph.id}: ${ph.title}${meta ? ` (${meta})` : ""}`);
      }
    }
    return 0;
  } catch {
    console.error(`No order-phases.json for "${orderId}". Run: npm run mfg -- order phases ${orderId} init`);
    return 1;
  }
}

function parseAnnotateArgv(argv: string[]): {
  phaseId: string;
  basis?: OrderPhaseBasis;
  lanes: OrderPhaseLane[];
  componentRef?: string;
} | null {
  if (argv.length < 1) {
    console.error("annotate: missing <phaseId>");
    return null;
  }
  const phaseId = argv[0]!;
  let basis: OrderPhaseBasis | undefined;
  const lanes: OrderPhaseLane[] = [];
  let componentRef: string | undefined;

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--basis" && argv[i + 1]) {
      const v = argv[++i] as OrderPhaseBasis;
      if (!BASIS.includes(v)) {
        console.error(`Invalid --basis "${v}". Use: ${BASIS.join(", ")}`);
        return null;
      }
      basis = v;
      continue;
    }
    if (a === "--lane" && argv[i + 1]) {
      const v = argv[++i] as OrderPhaseLane;
      if (!LANES.includes(v)) {
        console.error(`Invalid --lane "${v}". Use: ${LANES.join(", ")}`);
        return null;
      }
      lanes.push(v);
      continue;
    }
    if (a === "--component-ref" && argv[i + 1]) {
      componentRef = argv[++i]!.trim();
      continue;
    }
  }

  return { phaseId, basis, lanes, componentRef };
}

async function breakdownPhase(orderId: string, phaseId: string, flagArgv: string[]): Promise<number> {
  const id = phaseId.trim();
  if (!id) {
    usageBreakdown();
    return 1;
  }
  const parsed = parseBreakdownFlags(flagArgv);
  if (!parsed.ok) {
    console.error(parsed.message);
    return 1;
  }

  const loaded = await loadManifest(orderId);
  if (!loaded) return 1;
  const check = await validateOrderManifest(loaded.manifest, REPO_ROOT);
  if (!check.ok) {
    for (const e of check.errors) console.error("ERR:", e);
    return 1;
  }

  const phasesPath = orderPhasesPath(REPO_ROOT, orderId);
  return runPhaseBreakdown({
    orderPhasesPath: phasesPath,
    orderId: orderId.trim(),
    manifestProductId: primaryProductId(loaded.manifest),
    phaseId: id,
    repoRoot: REPO_ROOT,
    lanesOverride: parsed.lanes,
    jsonStdout: parsed.jsonStdout,
    dryRun: parsed.dryRun,
  });
}

async function annotatePhase(orderId: string, argv: string[]): Promise<number> {
  const parsed = parseAnnotateArgv(argv);
  if (!parsed) {
    return 1;
  }
  const { phaseId, basis, lanes, componentRef } = parsed;
  if (!basis && lanes.length === 0 && componentRef === undefined) {
    console.error("Pass at least one of --basis, --lane, or --component-ref");
    return 1;
  }

  const p = orderPhasesPath(REPO_ROOT, orderId);
  let raw: string;
  try {
    raw = await readFile(p, "utf8");
  } catch {
    console.error(`No order-phases.json for "${orderId}". Run init first.`);
    return 1;
  }
  const doc = JSON.parse(raw) as OrderPhasesDoc;
  const ph = doc.phases.find((x) => x.id === phaseId);
  if (!ph) {
    console.error(`Unknown phase id "${phaseId}"`);
    return 1;
  }

  if (basis !== undefined) ph.basis = basis;
  if (lanes.length > 0) ph.lanes = [...new Set([...(ph.lanes ?? []), ...lanes])];
  if (componentRef !== undefined) ph.businessNeedsComponentRef = componentRef;

  doc.updatedAt = new Date().toISOString();
  await writeFile(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log(`Annotated ${phaseId}`);
  return 0;
}

async function setPhaseStatus(orderId: string, phaseId: string, status: string): Promise<number> {
  if (!STATUSES.includes(status as OrderPhaseStatus)) {
    console.error(`Invalid status "${status}". Use: ${STATUSES.join(", ")}`);
    return 1;
  }
  const p = orderPhasesPath(REPO_ROOT, orderId);
  let raw: string;
  try {
    raw = await readFile(p, "utf8");
  } catch {
    console.error(`No order-phases.json for "${orderId}". Run init first.`);
    return 1;
  }
  const doc = JSON.parse(raw) as OrderPhasesDoc;
  const ph = doc.phases.find((x) => x.id === phaseId);
  if (!ph) {
    console.error(`Unknown phase id "${phaseId}"`);
    return 1;
  }
  ph.status = status as OrderPhaseStatus;
  doc.updatedAt = new Date().toISOString();
  await writeFile(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log(`Updated ${phaseId} → ${status}`);
  return 0;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  const json = argv.includes("--json");
  const fromMd = argv.includes("--from-md");
  const rest = argv.filter((a) => !a.startsWith("--"));

  if (rest.length < 2) {
    usage();
    return 1;
  }

  const orderId = rest[0]!;
  const sub = rest[1]!;

  if (sub === "breakdown") {
    const phaseId = rest[2];
    if (!phaseId) {
      usageBreakdown();
      return 1;
    }
    const idx = argv.indexOf(phaseId);
    const flagArgv = idx >= 0 ? argv.slice(idx + 1) : [];
    return breakdownPhase(orderId, phaseId, flagArgv);
  }

  if (sub === "init") {
    return initPhases(orderId, fromMd, json);
  }
  if (sub === "show") {
    return showPhases(orderId, json);
  }
  if (sub === "set-status") {
    const phaseId = rest[2];
    const status = rest[3];
    if (!phaseId || !status) {
      usage();
      return 1;
    }
    return setPhaseStatus(orderId, phaseId, status);
  }
  if (sub === "annotate") {
    const tail = rest.slice(2);
    if (tail.length < 1) {
      usage();
      return 1;
    }
    return annotatePhase(orderId, tail);
  }

  usage();
  return 1;
}

main().then((code) => {
  process.exitCode = code;
});
