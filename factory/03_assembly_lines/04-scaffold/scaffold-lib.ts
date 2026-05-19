import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { appStackPath, configsAppsRoot } from "../../factory_libs/paths/app-config-paths.js";
import type { SaaSAppBlueprint } from "../06-gates/gates/app-blueprint-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo root: …/factory/03_assembly_lines/04-scaffold → three levels up. */
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

export const SCAFFOLD_STATE_FILE = "scaffold-state.json";
export const SCAFFOLD_LOG_FILE = "scaffold-log.jsonl";

export type ScaffoldState = {
  schemaVersion: 1;
  appSlug: string;
  updatedAt: string;
  modules: Record<string, number>;
};

export type ScaffoldModule = {
  id: string;
  version: number;
  apply: () => Promise<void>;
};

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function writeFileEnsured(filePath: string, content: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would write ${path.relative(REPO_ROOT, filePath)}`);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function rmrf(target: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would remove ${path.relative(REPO_ROOT, target)}`);
    return;
  }
  await fs.rm(target, { recursive: true, force: true });
}

export async function readJsonIfExists<T>(absPath: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(absPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function writeJsonPretty(absPath: string, value: unknown, dryRun: boolean): Promise<void> {
  await writeFileEnsured(absPath, JSON.stringify(value, null, 2) + "\n", dryRun);
}

export function scaffoldStatePath(slug: string): string {
  return path.join(configsAppsRoot(REPO_ROOT), slug, SCAFFOLD_STATE_FILE);
}

export function scaffoldLogPath(slug: string): string {
  return path.join(configsAppsRoot(REPO_ROOT), slug, SCAFFOLD_LOG_FILE);
}

export async function appendScaffoldLog(slug: string, entry: unknown, dryRun: boolean): Promise<void> {
  const p = scaffoldLogPath(slug);
  if (dryRun) {
    console.log(`[dry-run] would append ${path.relative(REPO_ROOT, p)}`);
    return;
  }
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.appendFile(p, JSON.stringify(entry) + "\n", "utf8");
}

export async function loadScaffoldState(slug: string): Promise<ScaffoldState> {
  const p = scaffoldStatePath(slug);
  const existing = await readJsonIfExists<ScaffoldState>(p);
  if (existing?.schemaVersion === 1 && existing.appSlug === slug && existing.modules) return existing;
  return { schemaVersion: 1, appSlug: slug, updatedAt: new Date().toISOString(), modules: {} };
}

export async function saveScaffoldState(slug: string, state: ScaffoldState, dryRun: boolean): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await writeJsonPretty(scaffoldStatePath(slug), state, dryRun);
}

export async function applyModules(opts: {
  slug: string;
  force: boolean;
  dryRun: boolean;
  modules: ScaffoldModule[];
  phaseContext?: {
    phaseId?: string;
    orderId?: string;
    phaseTitle?: string;
    phaseLabel?: string;
  };
}): Promise<{ appliedIds: string[] }> {
  const state = await loadScaffoldState(opts.slug);
  const appliedBefore = { ...state.modules };
  const applied: { id: string; from?: number; to: number; status: "applied" | "skipped" }[] = [];

  for (const m of opts.modules) {
    const prev = state.modules[m.id] ?? 0;
    const shouldApply = opts.force || prev < m.version;
    if (!shouldApply) {
      applied.push({ id: m.id, from: prev, to: prev, status: "skipped" });
      continue;
    }
    await m.apply();
    state.modules[m.id] = m.version;
    applied.push({ id: m.id, from: prev || undefined, to: m.version, status: "applied" });
  }

  await saveScaffoldState(opts.slug, state, opts.dryRun);
  await appendScaffoldLog(
    opts.slug,
    {
      ts: new Date().toISOString(),
      appSlug: opts.slug,
      force: opts.force,
      phase: opts.phaseContext,
      applied,
      before: appliedBefore,
      after: state.modules,
    },
    opts.dryRun,
  );

  const appliedIds = applied.filter((x) => x.status === "applied").map((x) => x.id);
  return { appliedIds };
}

const SKIP_VALUE_FLAGS = new Set([
  "--from",
  "--phase",
  "--order-id",
  "--phase-label",
]);

export function extractAppPositional(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (SKIP_VALUE_FLAGS.has(a)) {
      i++;
      continue;
    }
    if (a === "--dry-run" || a === "--force" || a === "--skip-install" || a === "--help" || a === "-h") continue;
    if (a.startsWith("--")) continue;
    return a.trim();
  }
  return undefined;
}

export function parseScaffoldArgs(argv: string[]): {
  from: string;
  dryRun: boolean;
  force: boolean;
  skipInstall: boolean;
  help: boolean;
  phaseId?: string;
  orderId?: string;
  phaseLabel?: string;
} {
  let from: string | undefined;
  let dryRun = false;
  let force = false;
  let skipInstall = false;
  let help = false;
  let phaseId: string | undefined;
  let orderId: string | undefined;
  let phaseLabel: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--force") force = true;
    else if (a === "--skip-install") skipInstall = true;
    else if (a === "--from") {
      const p = argv[++i];
      if (!p) throw new Error("--from needs path");
      from = path.resolve(REPO_ROOT, p);
    } else if (a === "--phase") {
      const p = argv[++i];
      if (!p) throw new Error("--phase needs id (epic id from order-phases or phase-queue, e.g. TODO_P2_SCAFFOLD)");
      phaseId = p.trim();
    } else if (a === "--order-id") {
      const p = argv[++i];
      if (!p) throw new Error("--order-id needs shop order folder id");
      orderId = p.trim();
    } else if (a === "--phase-label") {
      const p = argv[++i];
      if (!p) throw new Error("--phase-label needs text");
      phaseLabel = p.trim();
    }
  }
  const app = extractAppPositional(argv);
  const resolvedFrom = from ?? (app ? appStackPath(REPO_ROOT, app) : "");
  return { from: resolvedFrom, dryRun, force, skipInstall, help, phaseId, orderId, phaseLabel };
}

export function assertScaffoldSupported(bp: SaaSAppBlueprint): void {
  if (bp.frontend.stack !== "vite-react-ts") {
    throw new Error(
      `Scaffold v1 supports frontend "vite-react-ts" only (got "${bp.frontend.stack}"). Edit blueprint or extend scaffold modules.`,
    );
  }
  const be = bp.backend.runtime;
  if (be !== "nodejs-express" && be !== "nodejs-fastify" && be !== "nodejs-hono") {
    throw new Error(
      `Scaffold v1 supports backend nodejs-express | nodejs-fastify | nodejs-hono (got "${be}"). Next/Python/Go scaffolds not generated yet.`,
    );
  }
}

export async function mergeRootWorkspaces(relDirs: string[], dryRun: boolean): Promise<void> {
  function workspacePathForPkg(relDir: string): string {
    return relDir.split(path.sep).join("/");
  }
  // Drop an explicit workspace entry when an existing glob already covers it
  // (e.g. "apps/*" covers "apps/foo"; "apps/*/*" covers "apps/foo/foo-api").
  // This keeps the workspaces list short and stable, and avoids re-introducing
  // stale per-slug entries (which break npm install once a slug is purged).
  function isCoveredByGlob(entry: string, list: string[]): boolean {
    return list.some((g) => {
      if (!g.includes("*")) return false;
      const re = new RegExp(
        "^" +
          g
            .split("/")
            .map((seg) =>
              seg === "*" ? "[^/]+" : seg.replace(/[.+^${}()|[\]\\]/g, "\\$&"),
            )
            .join("/") +
          "$",
      );
      return re.test(entry);
    });
  }
  const pkgPath = path.join(REPO_ROOT, "package.json");
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { workspaces?: string[] };
  const existing = (pkg.workspaces ?? []).map(workspacePathForPkg);
  const incoming = relDirs.map(workspacePathForPkg).filter((e) => !isCoveredByGlob(e, existing));
  const next = new Set<string>([...existing, ...incoming]);
  pkg.workspaces = [...next].sort();
  if (dryRun) {
    console.log("[dry-run] would update package.json workspaces:", pkg.workspaces);
    return;
  }
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

export async function runRootInstall(dryRun: boolean): Promise<void> {
  if (dryRun) return;
  console.log("\nRunning npm install at repo root (workspaces)…");
  try {
    execSync("npm install", { cwd: REPO_ROOT, stdio: "inherit" });
  } catch {
    console.warn("npm install failed — run manually from repo root.");
  }
}

