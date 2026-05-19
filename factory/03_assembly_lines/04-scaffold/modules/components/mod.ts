/**
 * Scaffold module: **components**.
 *
 * Runs after the base API + base frontend modules have already laid down the
 * skeleton of `apps/<slug>/<slug>-{api,instance}/`. Reads the blueprint,
 * walks `packages/components/`, asks the composer which adapter wins per
 * capability, and applies each chosen adapter's template files + deps + env
 * entries on top of the skeleton.
 *
 * Sentinel adapters (e.g. `auth-none`) produce no work — they exist only so
 * the composer always has exactly one selection per capability.
 *
 * Why this lives as its own module (rather than being inlined into
 * `base-api`):
 *   • The base API module is intentionally minimal — a "hello world" Express
 *     skeleton everyone gets. The components module is what makes apps
 *     differ.
 *   • Versioning is independent: a base-api bump shouldn't force re-applying
 *     every adapter; an adapter bump shouldn't force re-applying the base
 *     skeleton.
 *   • Failure isolation: a broken component manifest can't corrupt the base
 *     scaffold.
 */

import * as path from "node:path";

import type { SaaSAppBlueprint } from "../../../06-gates/gates/app-blueprint-config.js";
import type { ScaffoldModule } from "../../scaffold-lib.js";
import { REPO_ROOT } from "../../scaffold-lib.js";

import { discoverComponents } from "../../../../factory_libs/components/component-registry.js";
import {
  buildComponentPlan,
  ComposerError,
  type ComponentPlan,
  type ComposerBlueprint,
} from "../../../../factory_libs/components/composer.js";
import {
  applyComponentPlan,
  type ApplyResult,
} from "../../../../factory_libs/components/template-merge.js";
import type {
  DepSpec,
  EnvSpec,
  TemplateFileSpec,
} from "../../../../factory_libs/components/component-manifest-types.js";

/** What the scaffold-run record captures for one selected component. */
export interface ComponentVersionRecord {
  capability: string;
  componentId: string;
  provider: string;
  version: string;
  sentinel: boolean;
  /** Human summary of writes from this adapter. */
  applied: {
    filesWritten: number;
    filesSkipped: number;
    depsAdded: number;
    depsConflicted: number;
    envAdded: number;
  };
}

export interface ComponentsModuleArgs {
  slug: string;
  bp: SaaSAppBlueprint;
  instDir: string;
  apiDir: string;
  dryRun: boolean;
  /**
   * Out-param the module fills as it works. Caller (app-scaffold.ts) reads it
   * after `applyModules(...)` returns and stamps it into `scaffold-run.json`.
   */
  versionsOut: ComponentVersionRecord[];
}

const MODULE_ID = "components";
const MODULE_VERSION = 1;

export function componentsModule(args: ComponentsModuleArgs): ScaffoldModule {
  return {
    id: MODULE_ID,
    version: MODULE_VERSION,
    apply: async () => {
      const { slug, bp, instDir, apiDir, dryRun, versionsOut } = args;

      const { components, warnings } = await discoverComponents(REPO_ROOT);

      for (const w of warnings) {
        if (w.kind === "missing-manifest") continue; /** empty stubs — fine. */
        console.warn(`[components] ${w.componentDir}: ${w.kind} — ${w.detail}`);
      }

      if (components.length === 0) {
        console.log(`[components] no components registered; nothing to apply for ${slug}.`);
        return;
      }

      const composerInput: ComposerBlueprint = bp as unknown as ComposerBlueprint;

      let plan: ComponentPlan;
      try {
        plan = buildComponentPlan(composerInput, components);
      } catch (e) {
        if (e instanceof ComposerError) {
          console.error(`[components] composer refused to plan for ${slug}:`);
          for (const r of e.reasons) console.error(`  - ${r}`);
          throw e;
        }
        throw e;
      }

      for (const n of plan.notes) console.log(`[components] ${n}`);

      const perComponent = new Map<
        string,
        { packageRoot: string; files: TemplateFileSpec[]; deps: DepSpec[]; env: EnvSpec[] }
      >();
      for (const sel of plan.selections) {
        const found = components.find((c) => c.manifest.componentId === sel.componentId);
        if (!found) continue;
        perComponent.set(sel.componentId, {
          packageRoot: found.packageRoot,
          files: found.manifest.files,
          deps: found.manifest.deps,
          env: found.manifest.env,
        });
      }

      const result: ApplyResult = await applyComponentPlan({
        plan,
        worktrees: {
          apiDir,
          instanceDir: instDir,
          rootDir: path.dirname(apiDir),
        },
        perComponent,
        dryRun,
      });

      for (const sel of plan.selections) {
        const meta = perComponent.get(sel.componentId);
        versionsOut.push({
          capability: sel.capability,
          componentId: sel.componentId,
          provider: sel.provider,
          version: sel.version,
          sentinel: sel.sentinel,
          applied: {
            filesWritten: result.filesWritten.filter((p) =>
              meta
                ? meta.files.some((f) => p.endsWith(f.to))
                : false,
            ).length,
            filesSkipped: result.filesSkipped.filter((p) =>
              meta ? meta.files.some((f) => p.path.endsWith(f.to)) : false,
            ).length,
            depsAdded: result.depsAdded.filter((d) =>
              meta ? meta.deps.some((dd) => dd.name === d.name) : false,
            ).length,
            depsConflicted: result.depsConflicted.filter((d) =>
              meta ? meta.deps.some((dd) => dd.name === d.name) : false,
            ).length,
            envAdded: result.envAdded.filter((e) =>
              meta ? meta.env.some((ee) => ee.key === e.key) : false,
            ).length,
          },
        });
      }

      if (result.depsConflicted.length > 0) {
        console.warn(
          `[components] ${result.depsConflicted.length} dep conflict(s) — kept existing range. Review:`,
        );
        for (const d of result.depsConflicted) {
          console.warn(
            `  - ${d.target}/${d.name}: existing=${d.existing}  requested=${d.requested}`,
          );
        }
      }

      console.log(
        `[components] ${slug}: applied ${plan.selections.length} selection(s) — ${result.filesWritten.length} file(s), ${result.depsAdded.length} dep(s), ${result.envAdded.length} env key(s).`,
      );
    },
  };
}
