// Purge — remove all known factory artifacts produced for one or more app slugs.
//
// This is the cleanup partner of `mfg pipeline run`. The factory produces ~10
// spots of state per slug; this script knows where they live and removes them
// in one shot. It deletes ONLY artifacts derived from the pipeline:
//   - app folder (new)     : apps/<slug>/                          (frontend + api + infra services)
//   - app workspaces (old) : apps/<slug>-api/ , apps/<slug>-instance/   (legacy flat layout)
//   - product configs      : configs/apps/<slug>/
//   - work orders          : factory/01_production_planning/01_00_work_orders/<slug>-so-<date>/
//   - phase registry       : factory/01_production_planning/01_02_phase_registry/<slug>-so-<date>/
//   - task registry        : factory/01_production_planning/01_03_task-registry/<slug>-so-<date>/   (phase-breakdown-*.json)
//   - task-queue entries   : strips rows in task-queue.json whose `app` matches `apps/<slug>(/<slug>-…)`
//                            (skip with --keep-queue-entries to preserve queue rows)
//   - registry slice       : factory/03_assembly_lines/03-registry/orders/<slug>-so-<date>/
//   - sprint folder        : factory/03_assembly_lines/05-sprints/<slug>-so-<date>/
//   - traceability index   : factory/08_traceability/orders/<slug>-so-<date>.json (derived; rebuildable)
//   - scaffold record      : factory/03_assembly_lines/04-scaffold/records/_unscoped/<slug>/
//   - sprint folder        : factory/03_assembly_lines/05-sprints/<slug>-so-<date>/
//   - kaizen note          : factory/04_kaizen/backlog/<date>-<slug>.md
//   - CI workflow          : .github/workflows/app-<slug>-ci.yml
//
// It deliberately does NOT touch:
//   - factory/telemetry/**            — append-only historical record
//   - factory/05_metrics/snapshots/** — daily snapshots are factory-level, not per-app
//   - organizational_memory/**        — QMS / lessons-learned
//   - task-queue rows that don't match the slug (other apps' work stays)
//
// Usage:
//   npm run mfg -- app purge -- <slug> [<slug> ...]
//   npm run mfg -- app purge -- <slug> --dry-run
//   npm run mfg -- app purge -- <slug> --yes               # skip interactive confirmation
//   npm run mfg -- app purge -- <slug> --keep-queue-entries # leave task-queue.json untouched
//   npm run mfg -- app purge -- <slug> --json
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as readline from "node:readline/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

interface Opts {
  slugs: string[];
  yes: boolean;
  dryRun: boolean;
  json: boolean;
  keepQueueEntries: boolean;
}

const TASK_QUEUE_REL = "factory/03_assembly_lines/03-registry/registry/task-queue.json";

interface Target {
  /** Pretty label for output. */
  label: string;
  /** Resolved absolute paths (after glob expansion). */
  paths: string[];
}

interface SlugReport {
  slug: string;
  targets: Target[];
  removed: string[];
  missing: string[];
  errors: { path: string; error: string }[];
  /** Task ids stripped from task-queue.json for this slug. */
  queueRowsRemoved: string[];
}

function printUsage(): void {
  console.log(`Purge — remove all factory artifacts for one or more app slugs.

Usage:
  npm run mfg -- app purge -- <slug> [<slug> ...] [options]

Options:
  --dry-run             Show what would be removed; do nothing.
  --yes                 Skip the interactive y/N confirmation.
  --keep-queue-entries  Leave task-queue.json untouched (default: strip any rows whose 'app' matches the slug).
  --json                Print the report as JSON.

Per slug, the following paths are checked and removed when present:
  apps/<slug>/                                                (whole app folder — new layout)
  apps/<slug>-api/    , apps/<slug>-instance/                 (legacy flat layout)
  configs/apps/<slug>/                                        (brief + stack + state)
  factory/01_production_planning/01_00_work_orders/<slug>-so-<date>/
  factory/01_production_planning/01_02_phase_registry/<slug>-so-<date>/
  factory/01_production_planning/01_03_task-registry/<slug>-so-<date>/
  factory/03_assembly_lines/03-registry/orders/<slug>-so-<date>/
  factory/03_assembly_lines/04-scaffold/records/_unscoped/<slug>/
  factory/03_assembly_lines/05-sprints/<slug>-so-<date>/
  factory/08_traceability/orders/<slug>-so-<date>.json
  factory/04_kaizen/backlog/<date>-<slug>.md
  .github/workflows/app-<slug>-ci.yml

Not removed (intentional):
  factory/telemetry/**                              (append-only history)
  factory/05_metrics/snapshots/**                   (factory-level daily snapshots)
  organizational_memory/**                          (QMS / lessons-learned)
  factory/03_assembly_lines/03-registry/registry/task-queue.json   (global queue)

Examples:
  npm run mfg -- app purge -- hello hello-world-2 hello-world-3 hello-world-4 --yes
  npm run mfg -- app purge -- hello-world-2 --dry-run
`);
}

function parseCli(argv: string[]): Opts {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  const slugs: string[] = [];
  let yes = false;
  let dryRun = false;
  let json = false;
  let keepQueueEntries = false;
  for (const a of argv) {
    if (a === "--") continue;
    if (a === "--yes" || a === "-y") { yes = true; continue; }
    if (a === "--dry-run") { dryRun = true; continue; }
    if (a === "--json") { json = true; continue; }
    if (a === "--keep-queue-entries") { keepQueueEntries = true; continue; }
    if (a.startsWith("--")) {
      console.error(`app purge: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    slugs.push(a);
  }
  if (slugs.length === 0) {
    console.error("app purge: pass at least one <slug>.\n");
    printUsage();
    process.exit(1);
  }
  for (const s of slugs) {
    if (!SLUG_RE.test(s)) {
      console.error(`app purge: invalid slug "${s}" (expected ${SLUG_RE.source}).`);
      process.exit(1);
    }
  }
  return { slugs, yes, dryRun, json, keepQueueEntries };
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listChildrenStartingWith(
  parent: string,
  prefix: string,
): Promise<string[]> {
  try {
    const entries = await fs.readdir(parent, { withFileTypes: true });
    return entries
      .filter((e) => e.name.startsWith(prefix))
      .map((e) => path.join(parent, e.name));
  } catch {
    return [];
  }
}

async function listFilesEndingWith(
  parent: string,
  suffix: string,
): Promise<string[]> {
  try {
    const entries = await fs.readdir(parent, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(suffix))
      .map((e) => path.join(parent, e.name));
  } catch {
    return [];
  }
}

async function planSlug(slug: string): Promise<Target[]> {
  const R = REPO_ROOT;
  const targets: Target[] = [];

  async function exactDir(label: string, rel: string): Promise<void> {
    const abs = path.join(R, rel);
    if (await exists(abs)) targets.push({ label, paths: [abs] });
  }

  // New layout: one parent folder per app. Removing it nukes -instance, -api,
  // and any infra service folders (postgres, redis, mqtt, …) in one step.
  await exactDir("app folder", `apps/${slug}`);
  // Legacy flat layout fallback (kept so we can still purge older slugs).
  await exactDir("app workspace (api, legacy)", `apps/${slug}-api`);
  await exactDir("app workspace (instance, legacy)", `apps/${slug}-instance`);
  await exactDir("product configs", `configs/apps/${slug}`);
  await exactDir(
    "scaffold record",
    `factory/03_assembly_lines/04-scaffold/records/_unscoped/${slug}`,
  );
  // CI workflow generated by the scaffold's github-ci module.
  const ciWf = path.join(R, ".github", "workflows", `app-${slug}-ci.yml`);
  if (await exists(ciWf)) targets.push({ label: "CI workflow", paths: [ciWf] });

  const workOrderRoots = [
    {
      label: "work order",
      parent: path.join(R, "factory/01_production_planning/01_00_work_orders"),
    },
    {
      label: "phase registry",
      parent: path.join(R, "factory/01_production_planning/01_02_phase_registry"),
    },
    {
      label: "task registry",
      parent: path.join(R, "factory/01_production_planning/01_03_task-registry"),
    },
    {
      label: "registry slice",
      parent: path.join(R, "factory/03_assembly_lines/03-registry/orders"),
    },
    {
      label: "sprint folder",
      parent: path.join(R, "factory/03_assembly_lines/05-sprints"),
    },
    {
      // Per-order traceability index file (derived; safe to remove since it's
      // rebuildable with `mfg trace build <orderId>`). Matches files like
      // `factory/08_traceability/orders/<slug>-so-<date>.json`.
      label: "traceability index",
      parent: path.join(R, "factory/08_traceability/orders"),
    },
  ];
  for (const { label, parent } of workOrderRoots) {
    const matches = await listChildrenStartingWith(parent, `${slug}-so-`);
    if (matches.length) targets.push({ label, paths: matches });
  }

  const kaizenDir = path.join(R, "factory/04_kaizen/backlog");
  const kaizenMatches = await listFilesEndingWith(kaizenDir, `-${slug}.md`);
  if (kaizenMatches.length) targets.push({ label: "kaizen note", paths: kaizenMatches });

  return targets;
}

function relFromRoot(p: string): string {
  const rel = path.relative(REPO_ROOT, p);
  return rel || ".";
}

function printPlan(reports: SlugReport[], queuePlan: QueueStripPlan, keepQueueEntries: boolean): void {
  console.log("\nPurge plan (paths relative to repo root):\n");
  let total = 0;
  for (const r of reports) {
    const allPaths = r.targets.flatMap((t) => t.paths);
    const queueIds = queuePlan.bySlug.get(r.slug) ?? [];
    total += allPaths.length;
    console.log(
      `  ${r.slug}  (${allPaths.length} target${allPaths.length === 1 ? "" : "s"}` +
        (queueIds.length > 0 ? ` + ${queueIds.length} task-queue row${queueIds.length === 1 ? "" : "s"}` : "") +
        ")",
    );
    if (allPaths.length === 0 && queueIds.length === 0) {
      console.log("    · (nothing to do — no artifacts found)");
      continue;
    }
    for (const t of r.targets) {
      for (const p of t.paths) {
        console.log(`    · [${t.label.padEnd(22)}] ${relFromRoot(p)}`);
      }
    }
    if (queueIds.length > 0) {
      const preview = queueIds.slice(0, 5).join(", ") + (queueIds.length > 5 ? `, … +${queueIds.length - 5} more` : "");
      console.log(`    · [${"task-queue rows".padEnd(22)}] ${preview}`);
    }
  }
  const queueNote = keepQueueEntries
    ? "task-queue.json (kept by --keep-queue-entries)"
    : queuePlan.total === 0
      ? "task-queue.json (no matching rows)"
      : `task-queue.json (${queuePlan.total} rows scheduled to strip)`;
  console.log(
    `\nTotals: slugs=${reports.length}  paths=${total}  queueRows=${queuePlan.total}` +
      `\nNot touched: factory/telemetry/**, organizational_memory/**, metrics snapshots.` +
      `\nQueue: ${queueNote}.`,
  );
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ans = (await rl.question(message)).trim().toLowerCase();
    return ans === "y" || ans === "yes";
  } finally {
    rl.close();
  }
}

async function removePath(p: string): Promise<void> {
  await fs.rm(p, { recursive: true, force: true });
}

/**
 * Match any `app` path that belongs to this slug, both the new nested layout
 * (`apps/<slug>/<slug>-instance`, `apps/<slug>/<slug>-api`) and the legacy
 * flat one (`apps/<slug>-instance`, `apps/<slug>-api`). We do NOT match by
 * task-id prefix because product slugs map 1:1 to apps and this is the
 * authoritative association in `task-queue.json`.
 */
function taskBelongsToSlug(taskApp: unknown, slug: string): boolean {
  if (typeof taskApp !== "string") return false;
  const a = taskApp.trim();
  if (!a.startsWith("apps/")) return false;
  const rest = a.slice("apps/".length);
  if (rest === slug) return true;
  if (rest.startsWith(`${slug}/`)) return true;
  if (rest === `${slug}-instance` || rest === `${slug}-api`) return true;
  if (rest.startsWith(`${slug}-`) && /^[a-z0-9-]+$/.test(rest.split("/")[0]!)) {
    // Catch hyphenated infra workspaces from the legacy flat layout
    // (e.g. `apps/<slug>-postgres`, `apps/<slug>-redis`).
    return true;
  }
  return false;
}

interface QueueStripPlan {
  /** Map of slug → task ids that would be stripped. */
  bySlug: Map<string, string[]>;
  total: number;
}

async function planQueueStrip(slugs: string[]): Promise<QueueStripPlan> {
  const bySlug = new Map<string, string[]>(slugs.map((s) => [s, [] as string[]]));
  const queuePath = path.join(REPO_ROOT, TASK_QUEUE_REL);
  if (!(await exists(queuePath))) return { bySlug, total: 0 };
  let raw: string;
  try {
    raw = await fs.readFile(queuePath, "utf8");
  } catch {
    return { bySlug, total: 0 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { bySlug, total: 0 };
  }
  const tasks = Array.isArray(parsed)
    ? (parsed as Array<Record<string, unknown>>)
    : Array.isArray((parsed as { tasks?: unknown }).tasks)
      ? ((parsed as { tasks: Array<Record<string, unknown>> }).tasks)
      : [];
  let total = 0;
  for (const t of tasks) {
    for (const slug of slugs) {
      if (taskBelongsToSlug(t["app"], slug)) {
        bySlug.get(slug)!.push(String(t["id"] ?? ""));
        total += 1;
        break;
      }
    }
  }
  return { bySlug, total };
}

async function applyQueueStrip(slugs: string[]): Promise<{ stripped: Map<string, string[]>; before: number; after: number }> {
  const queuePath = path.join(REPO_ROOT, TASK_QUEUE_REL);
  const stripped = new Map<string, string[]>(slugs.map((s) => [s, [] as string[]]));
  if (!(await exists(queuePath))) return { stripped, before: 0, after: 0 };
  const raw = await fs.readFile(queuePath, "utf8");
  const parsed = JSON.parse(raw) as
    | Array<Record<string, unknown>>
    | { tasks: Array<Record<string, unknown>> };
  const wrapped = !Array.isArray(parsed);
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  const before = tasks.length;
  const kept: typeof tasks = [];
  for (const t of tasks) {
    let hit: string | null = null;
    for (const slug of slugs) {
      if (taskBelongsToSlug(t["app"], slug)) {
        hit = slug;
        break;
      }
    }
    if (hit) {
      stripped.get(hit)!.push(String(t["id"] ?? ""));
    } else {
      kept.push(t);
    }
  }
  const out = wrapped ? { ...(parsed as { tasks: typeof tasks }), tasks: kept } : kept;
  await fs.writeFile(queuePath, JSON.stringify(out, null, 2) + "\n", "utf8");
  return { stripped, before, after: kept.length };
}

async function main(): Promise<number> {
  const opts = parseCli(process.argv.slice(2));

  const reports: SlugReport[] = [];
  for (const slug of opts.slugs) {
    const targets = await planSlug(slug);
    reports.push({ slug, targets, removed: [], missing: [], errors: [], queueRowsRemoved: [] });
  }

  // Queue strip plan is independent of files-on-disk plan; show both before confirming.
  const queuePlan = opts.keepQueueEntries
    ? { bySlug: new Map<string, string[]>(opts.slugs.map((s) => [s, []])), total: 0 }
    : await planQueueStrip(opts.slugs);

  printPlan(reports, queuePlan, opts.keepQueueEntries);

  const allPaths = reports.flatMap((r) => r.targets.flatMap((t) => t.paths));
  if (allPaths.length === 0 && queuePlan.total === 0) {
    console.log("\nNothing to purge. Done.");
    return 0;
  }

  if (opts.dryRun) {
    console.log("\nDRY RUN — no changes made.");
    if (opts.json) emitJson(reports, { dryRun: true, queueRowsBySlug: queuePlan.bySlug });
    return 0;
  }

  if (!opts.yes) {
    const ok = await confirm(
      `\nProceed and delete ${allPaths.length} path${allPaths.length === 1 ? "" : "s"}` +
        (queuePlan.total > 0 ? ` + ${queuePlan.total} task-queue row${queuePlan.total === 1 ? "" : "s"}` : "") +
        ` above? [y/N] `,
    );
    if (!ok) {
      console.log("Aborted.");
      return 1;
    }
  }

  console.log("\nPurging…");
  for (const r of reports) {
    for (const t of r.targets) {
      for (const p of t.paths) {
        try {
          await removePath(p);
          r.removed.push(p);
          console.log(`  ✓ removed  ${relFromRoot(p)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          r.errors.push({ path: p, error: msg });
          console.log(`  ✗ failed   ${relFromRoot(p)}  (${msg})`);
        }
      }
    }
  }

  if (!opts.keepQueueEntries && queuePlan.total > 0) {
    try {
      const res = await applyQueueStrip(opts.slugs);
      for (const r of reports) {
        r.queueRowsRemoved = res.stripped.get(r.slug) ?? [];
        for (const id of r.queueRowsRemoved) {
          console.log(`  ✓ stripped  task-queue row  ${id}`);
        }
      }
      console.log(`  ✓ rewrote   ${TASK_QUEUE_REL}  (${res.before} → ${res.after} rows)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ failed    rewriting task-queue.json  (${msg})`);
    }
  }

  const removedTotal = reports.reduce((a, r) => a + r.removed.length, 0);
  const queueRowsTotal = reports.reduce((a, r) => a + r.queueRowsRemoved.length, 0);
  const errorTotal = reports.reduce((a, r) => a + r.errors.length, 0);
  console.log(
    `\nDone. removed=${removedTotal}  queueRows=${queueRowsTotal}  errors=${errorTotal}  slugs=${opts.slugs.length}`,
  );
  console.log(
    "Telemetry was kept (factory/telemetry/**) — the historical record of these runs is intact.",
  );
  if (opts.json) emitJson(reports, { dryRun: false });
  return errorTotal === 0 ? 0 : 1;
}

function emitJson(
  reports: SlugReport[],
  extra: { dryRun: boolean; queueRowsBySlug?: Map<string, string[]> },
): void {
  console.log("\n" + JSON.stringify(
    {
      dryRun: extra.dryRun,
      slugs: reports.map((r) => ({
        slug: r.slug,
        targets: r.targets.map((t) => ({
          label: t.label,
          paths: t.paths.map(relFromRoot),
        })),
        removed: r.removed.map(relFromRoot),
        errors: r.errors.map((e) => ({ path: relFromRoot(e.path), error: e.error })),
        queueRowsRemoved: r.queueRowsRemoved.length > 0 ? r.queueRowsRemoved : (extra.queueRowsBySlug?.get(r.slug) ?? []),
      })),
    },
    null,
    2,
  ));
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { planSlug };
export type { Opts, SlugReport, Target };
