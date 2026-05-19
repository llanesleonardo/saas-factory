/**
 * Apply a `ComponentPlan` to a scaffolded app on disk.
 *
 * Three independent merge passes:
 *
 *   1. **Files** — copy `template/...` files from each component package into
 *      the target workspace (`apps/<slug>/<slug>-{api|instance}/`).
 *      Respects per-file `strategy` (replace, append-if-missing, skip-if-exists).
 *   2. **Deps** — merge `manifest.deps[]` into the target's `package.json`,
 *      with conflict detection. If the existing range disagrees with the
 *      adapter, we record a warning and **keep the existing range** (apps
 *      already in production should never have their lockfile silently
 *      changed; humans review the warning).
 *   3. **Env** — append entries to `apps/<slug>/<slug>-{api|instance}/.env.example`
 *      under a clearly fenced block, idempotently.
 *
 * The function reports back what it did and what it skipped, so the scaffold
 * module can echo a useful summary and record it into `scaffold-run.json`.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  DepSpec,
  EnvSpec,
  TemplateFileSpec,
  TemplateTarget,
} from "./component-manifest-types.js";
import type { ComponentPlan, ComponentSelection } from "./composer.js";

/** Where each `TemplateTarget` writes inside the scaffolded app. */
export interface AppWorktrees {
  /** Absolute path: apps/<slug>/<slug>-instance/ */
  instanceDir: string;
  /** Absolute path: apps/<slug>/<slug>-api/ */
  apiDir: string;
  /** Absolute path: apps/<slug>/ */
  rootDir: string;
}

export interface ApplyResult {
  filesWritten: string[];
  filesSkipped: { path: string; reason: string }[];
  depsAdded: { target: TemplateTarget; name: string; version: string; bucket: string }[];
  depsConflicted: { target: TemplateTarget; name: string; existing: string; requested: string }[];
  envAdded: { target: TemplateTarget; key: string }[];
}

function targetDir(t: TemplateTarget, w: AppWorktrees): string {
  switch (t) {
    case "api":
      return w.apiDir;
    case "instance":
      return w.instanceDir;
    case "root":
      return w.rootDir;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readText(p: string): Promise<string | undefined> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return undefined;
  }
}

async function writeEnsured(p: string, content: string, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf8");
}

/** Per-selection record so we can map "what was applied" back to the component. */
interface FilePlanEntry {
  spec: TemplateFileSpec;
  packageRoot: string;
  componentId: string;
}

interface DepPlanEntry {
  spec: DepSpec;
  componentId: string;
}

interface EnvPlanEntry {
  spec: EnvSpec;
  componentId: string;
}

function flattenWithProvenance(
  plan: ComponentPlan,
  componentRoots: Map<string, string>,
): {
  files: FilePlanEntry[];
  deps: DepPlanEntry[];
  envs: EnvPlanEntry[];
} {
  const files: FilePlanEntry[] = [];
  const deps: DepPlanEntry[] = [];
  const envs: EnvPlanEntry[] = [];

  for (const sel of plan.selections) {
    const root = componentRoots.get(sel.componentId);
    if (!root) continue;
    // We need the *manifest* for this selection to walk files/deps/env in order;
    // composer already flattened plan.files/deps/env, but loses provenance.
    // Walk plan flat lists but keyed by selection slot is tricky — instead,
    // ask the caller (mod.ts) to provide a map. For simplicity we re-derive
    // from `plan.files` etc. by matching `from`/`name`/`key` to the selection
    // is fragile. Cleaner: accept the *manifests* directly.
    // We DON'T have manifests here; mod.ts will pass them via componentRoots'
    // sister structure (see applyPlanWithManifests below).
  }
  return { files, deps, envs };
}
void flattenWithProvenance; // suppress unused-warning while keeping the design note above

/**
 * Apply files + deps + env entries to disk.
 *
 * Caller is responsible for providing each selection's manifest so we can
 * produce a precise per-component report (which `componentId` contributed
 * each file, etc.). This is friendlier for `scaffold-run.json` than guessing.
 */
export async function applyComponentPlan(args: {
  plan: ComponentPlan;
  worktrees: AppWorktrees;
  /** componentId → its manifest's files/deps/env (already in the plan but
   *  with provenance restored). */
  perComponent: Map<
    string,
    { packageRoot: string; files: TemplateFileSpec[]; deps: DepSpec[]; env: EnvSpec[] }
  >;
  dryRun: boolean;
}): Promise<ApplyResult> {
  const { plan, worktrees, perComponent, dryRun } = args;
  const result: ApplyResult = {
    filesWritten: [],
    filesSkipped: [],
    depsAdded: [],
    depsConflicted: [],
    envAdded: [],
  };

  for (const sel of plan.selections) {
    if (sel.sentinel) continue;
    const meta = perComponent.get(sel.componentId);
    if (!meta) continue;

    await applyFilesForOne(sel, meta, worktrees, dryRun, result);
    await applyDepsForOne(sel, meta.deps, worktrees, dryRun, result);
    await applyEnvForOne(sel, meta.env, worktrees, dryRun, result);
  }

  return result;
}

async function applyFilesForOne(
  sel: ComponentSelection,
  meta: { packageRoot: string; files: TemplateFileSpec[] },
  worktrees: AppWorktrees,
  dryRun: boolean,
  result: ApplyResult,
): Promise<void> {
  for (const spec of meta.files) {
    const srcAbs = path.join(meta.packageRoot, spec.from);
    const dstAbs = path.join(targetDir(spec.target, worktrees), spec.to);

    const src = await readText(srcAbs);
    if (src === undefined) {
      result.filesSkipped.push({ path: dstAbs, reason: `source missing: ${srcAbs}` });
      continue;
    }

    const strategy = spec.strategy ?? "replace";

    if (strategy === "skip-if-exists" && (await pathExists(dstAbs))) {
      result.filesSkipped.push({ path: dstAbs, reason: "exists; strategy=skip-if-exists" });
      continue;
    }

    if (strategy === "append-if-missing") {
      const existing = (await readText(dstAbs)) ?? "";
      const marker = spec.marker ?? `/* component:${sel.componentId} */`;
      if (existing.includes(marker)) {
        result.filesSkipped.push({ path: dstAbs, reason: "marker already present" });
        continue;
      }
      const joined = existing + (existing.endsWith("\n") ? "" : "\n") + marker + "\n" + src;
      await writeEnsured(dstAbs, joined, dryRun);
      result.filesWritten.push(dstAbs);
      continue;
    }

    await writeEnsured(dstAbs, src, dryRun);
    result.filesWritten.push(dstAbs);
  }
}

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

async function applyDepsForOne(
  sel: ComponentSelection,
  deps: DepSpec[],
  worktrees: AppWorktrees,
  dryRun: boolean,
  result: ApplyResult,
): Promise<void> {
  const byTarget = new Map<TemplateTarget, DepSpec[]>();
  for (const d of deps) {
    if (!byTarget.has(d.target)) byTarget.set(d.target, []);
    byTarget.get(d.target)!.push(d);
  }
  for (const [target, list] of byTarget) {
    const pkgPath = path.join(targetDir(target, worktrees), "package.json");
    const raw = await readText(pkgPath);
    if (raw === undefined) {
      for (const d of list) {
        result.depsConflicted.push({
          target,
          name: d.name,
          existing: "<no package.json>",
          requested: d.version,
        });
      }
      continue;
    }
    let pkg: PackageJsonLike;
    try {
      pkg = JSON.parse(raw) as PackageJsonLike;
    } catch {
      for (const d of list) {
        result.depsConflicted.push({
          target,
          name: d.name,
          existing: "<invalid json>",
          requested: d.version,
        });
      }
      continue;
    }
    let changed = false;
    for (const d of list) {
      const bucket = d.bucket ?? "dependencies";
      const dest = (pkg[bucket] ?? {}) as Record<string, string>;
      const existing = dest[d.name];
      if (existing && existing !== d.version) {
        result.depsConflicted.push({
          target,
          name: d.name,
          existing,
          requested: d.version,
        });
        continue;
      }
      if (existing === d.version) continue;
      dest[d.name] = d.version;
      pkg[bucket] = dest;
      changed = true;
      result.depsAdded.push({ target, name: d.name, version: d.version, bucket });
    }
    void sel;
    if (changed) {
      await writeEnsured(pkgPath, JSON.stringify(pkg, null, 2) + "\n", dryRun);
    }
  }
}

const ENV_BLOCK_START_PREFIX = "# >>> component:";
const ENV_BLOCK_END_PREFIX = "# <<< component:";

async function applyEnvForOne(
  sel: ComponentSelection,
  env: EnvSpec[],
  worktrees: AppWorktrees,
  dryRun: boolean,
  result: ApplyResult,
): Promise<void> {
  if (env.length === 0) return;
  const byTarget = new Map<TemplateTarget, EnvSpec[]>();
  for (const e of env) {
    const targets: TemplateTarget[] =
      e.scope === "both" ? ["api", "instance"] : [e.scope as TemplateTarget];
    for (const t of targets) {
      if (!byTarget.has(t)) byTarget.set(t, []);
      byTarget.get(t)!.push(e);
    }
  }

  for (const [target, list] of byTarget) {
    const filePath = path.join(targetDir(target, worktrees), ".env.example");
    const existing = (await readText(filePath)) ?? "";
    const startMarker = `${ENV_BLOCK_START_PREFIX}${sel.componentId}`;
    const endMarker = `${ENV_BLOCK_END_PREFIX}${sel.componentId}`;
    const re = new RegExp(
      `${startMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(
        /[.*+?^${}()|[\\]\\\\]/g,
        "\\$&",
      )}\\n?`,
      "m",
    );
    const block = renderEnvBlock(sel.componentId, list, startMarker, endMarker);
    const next = re.test(existing)
      ? existing.replace(re, block + "\n")
      : (existing.endsWith("\n") || existing.length === 0 ? existing : existing + "\n") +
        (existing.length === 0 ? "" : "\n") +
        block +
        "\n";
    if (next !== existing) {
      await writeEnsured(filePath, next, dryRun);
      for (const e of list) result.envAdded.push({ target, key: e.key });
    }
  }
}

function renderEnvBlock(
  componentId: string,
  env: EnvSpec[],
  startMarker: string,
  endMarker: string,
): string {
  const lines: string[] = [startMarker];
  lines.push(`# Auto-managed by scaffold; edit values in .env, not here.`);
  for (const e of env) {
    if (e.description) lines.push(`# ${e.description}`);
    const tag = e.required ? "" : " # optional";
    lines.push(`${e.key}=${e.example ?? ""}${tag}`);
  }
  lines.push(endMarker);
  void componentId;
  return lines.join("\n");
}
