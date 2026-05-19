/**
 * Modular scaffold runner.
 *
 * Reads configs/apps/<app>/app.stack.json (or --from) and scaffolds
 *   apps/<slug>/<slug>-instance  (frontend)
 *   apps/<slug>/<slug>-api       (backend)
 * Future infra services (postgres / redis / mqtt / …) also live under the same
 * `apps/<slug>/` parent, e.g. `apps/<slug>/<slug>-postgres`. The repeated
 * `<slug>` prefix on the inner folder keeps the npm workspace name unambiguous
 * even when several apps are present.
 *
 * Tracks iterations via configs/apps/<slug>/scaffold-state.json + scaffold-log.jsonl.
 * Writes configs/apps/<slug>/scaffold-run.json (+ copy under apps/<slug>/<slug>-instance/) with registry + tech snapshot.
 */
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildScaffoldRunDoc,
  resolvePhaseTitle,
  stationRecordsOrderSegment,
  writeScaffoldRunArtifacts,
} from "../../factory_libs/scaffold/scaffold-run-manifest.js";
import { loadBlueprintFromPath } from "../06-gates/gates/app-blueprint-config.js";

import { assertScaffoldSupported, applyModules, parseScaffoldArgs, REPO_ROOT, rmrf, runRootInstall } from "./scaffold-lib.js";
import { baseFrontendModule } from "./modules/base-frontend/mod.js";
import { baseApiModule } from "./modules/base-api/mod.js";
import { githubCiModule } from "./modules/github-ci/mod.js";
import { workspaceMergeModule } from "./modules/workspace-merge/mod.js";
import { componentsModule, type ComponentVersionRecord } from "./modules/components/mod.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let opts: ReturnType<typeof parseScaffoldArgs>;
  try {
    opts = parseScaffoldArgs(argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (opts.help) {
    console.log(`mfg app scaffold — generate apps/<slug>/<slug>-instance + apps/<slug>/<slug>-api from app.stack.json.

  npm run mfg -- app scaffold -- todo
  npm run mfg -- app scaffold -- --from configs/apps/todo/app.stack.json
  npm run mfg -- app scaffold -- todo --force --dry-run
  npm run mfg -- app scaffold -- todo --skip-install

  npm run mfg -- app scaffold -- todo --phase TODO_P2_SCAFFOLD
  npm run mfg -- app scaffold -- todo --phase TODO_P2_SCAFFOLD --order-id example-order-001
  npm run mfg -- app scaffold -- todo --phase-label "Phase 1 — skeleton"

First positional <appSlug> sets default --from configs/apps/<appSlug>/app.stack.json

Flags:
  --from <path>      Stack JSON (overrides positional app default)
  --phase <id>       Epic / phase id (e.g. from order-phases.json or phase-queue)
  --order-id <id>    Shop order id (resolves epic title from 01_02_phase_registry/<id>/order-phases.json when paired with --phase)
  --phase-label <t>  Free-form label when you do not use queue ids
  --force            Replace existing app folders (re-applies all modules)
  --dry-run          Print actions only
  --skip-install     Do not run npm install at repo root after merge
`);
    return;
  }

  if (!opts.from) {
    console.error(
      "Missing app: npm run mfg -- app scaffold -- <appSlug>   OR   npm run mfg -- app scaffold -- --from <path/to/app.stack.json>",
    );
    process.exitCode = 1;
    return;
  }

  const bp = await loadBlueprintFromPath(opts.from);
  assertScaffoldSupported(bp);

  const slug = bp.appSlug;
  // New layout: every vertical product gets its own parent folder under apps/
  // so frontend, backend, and any future infra services (postgres, redis, mqtt,
  // …) live side by side. Inner folder keeps the `<slug>-` prefix so the npm
  // workspace name stays unique.
  const appRoot = path.join("apps", slug);
  const instRel = path.join(appRoot, `${slug}-instance`);
  const apiRel = path.join(appRoot, `${slug}-api`);
  const instDir = path.join(REPO_ROOT, instRel);
  const apiDir = path.join(REPO_ROOT, apiRel);

  let phaseTitle: string | undefined;
  if (opts.orderId && opts.phaseId) {
    phaseTitle = await resolvePhaseTitle(REPO_ROOT, opts.orderId, opts.phaseId);
  }

  const phaseIdFinal = opts.phaseId ?? (opts.phaseLabel ? "custom" : undefined);
  /** Omit run-doc phase block when only `--order-id` is passed (need `--phase` or `--phase-label`). */
  const includePhase = Boolean(opts.phaseId || opts.phaseLabel);
  const phaseContext = includePhase
    ? {
        phaseId: phaseIdFinal,
        orderId: opts.orderId,
        phaseTitle,
        phaseLabel: opts.phaseLabel,
      }
    : undefined;

  if (opts.force && !opts.dryRun) {
    await rmrf(instDir, false);
    await rmrf(apiDir, false);
  }

  const componentVersions: ComponentVersionRecord[] = [];

  const { appliedIds } = await applyModules({
    slug,
    force: opts.force,
    dryRun: opts.dryRun,
    phaseContext,
    modules: [
      baseFrontendModule({ slug, bp, instDir, dryRun: opts.dryRun }),
      baseApiModule({ slug, bp, apiDir, dryRun: opts.dryRun }),
      componentsModule({
        slug,
        bp,
        instDir,
        apiDir,
        dryRun: opts.dryRun,
        versionsOut: componentVersions,
      }),
      githubCiModule({ slug, bp, dryRun: opts.dryRun }),
      workspaceMergeModule({ instRel, apiRel, dryRun: opts.dryRun }),
    ],
  });

  const runDoc = buildScaffoldRunDoc({
    repoRoot: REPO_ROOT,
    appSlug: slug,
    stackContractAbsolutePath: opts.from,
    bp,
    instanceRelative: instRel,
    apiRelative: apiRel,
    modulesAppliedIds: appliedIds,
    componentVersions,
    phase: includePhase
      ? {
          id: phaseIdFinal ?? "custom",
          title: phaseTitle,
          orderId: opts.orderId,
          label: opts.phaseLabel,
        }
      : undefined,
  });

  await writeScaffoldRunArtifacts(REPO_ROOT, runDoc, slug, instDir, opts.dryRun, opts.orderId);

  if (!opts.dryRun && !opts.skipInstall) {
    await runRootInstall(false);
  }

  const orderSeg = stationRecordsOrderSegment(opts.orderId);
  console.log(`
Done.
  • Frontend workspace (code): ${instRel}
  • API workspace (code):       ${apiRel}
  • State:    configs/apps/${slug}/scaffold-state.json + scaffold-log.jsonl
  • Run log:  configs/apps/${slug}/scaffold-run.json + ${instRel}/scaffold-run.json
  • Station record (audit): factory/03_assembly_lines/04-scaffold/records/${orderSeg}/${slug}/scaffold-run.json
`);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
