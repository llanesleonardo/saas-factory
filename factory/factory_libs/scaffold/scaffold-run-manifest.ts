/**
 * Build **`scaffold-run.json`** — audit object for a scaffold pass (phase, registry, technologies, outputs).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { orderPhasesPath } from "../paths/app-config-paths.js";
import type { SaaSAppBlueprint } from "../../03_assembly_lines/06-gates/gates/app-blueprint-config.js";

import type { OrderPhasesDoc } from "../orders/order-phases-types.js";
import type {
  ScaffoldComponentVersion,
  ScaffoldMaterialization,
  ScaffoldRunDoc,
} from "./scaffold-run-types.js";

const REGISTRY_FILES = [
  "agent-registry.json",
  "tool-registry.json",
  "workflow-state-machine.json",
  "task-queue.json",
  "phase-queue.json",
  "verified-apps.json",
] as const;

/** Repo-root paths for registry JSON (single source per artifact type). */
const CANONICAL_REGISTRY_PATH: Record<(typeof REGISTRY_FILES)[number], string> = {
  "agent-registry.json": "factory/02_workforce/02_00_agents/agent-registry.json",
  "tool-registry.json": "factory/03_assembly_lines/03-registry/registry/tool-registry.json",
  "workflow-state-machine.json":
    "factory/03_assembly_lines/03-registry/registry/workflow-state-machine.json",
  "task-queue.json": "factory/03_assembly_lines/03-registry/registry/task-queue.json",
  "phase-queue.json": "factory/03_assembly_lines/03-registry/registry/phase-queue.json",
  "verified-apps.json": "factory/03_assembly_lines/03-registry/registry/verified-apps.json",
};

export function registryParticipationMaps(repoRoot: string): Pick<
  ScaffoldRunDoc,
  "registryParticipation"
>["registryParticipation"] {
  const assemblyLineRegistryStation = "factory/03_assembly_lines/03-registry";
  const mirrored: Record<string, string> = {};
  const canonical: Record<string, string> = {};
  for (const f of REGISTRY_FILES) {
    const key = f.replace(/\.json$/, "").replace(/-/g, "_");
    mirrored[key] = path.posix.join(assemblyLineRegistryStation, "registry", f);
    canonical[key] = CANONICAL_REGISTRY_PATH[f];
  }
  return {
    assemblyLineRegistryStation,
    mirroredRegistryFiles: mirrored,
    canonicalRegistryFiles: canonical,
  };
}

function buildMaterialization(
  bp: SaaSAppBlueprint,
  instanceRelative: string,
  apiRelative: string,
  modulesAppliedIds: string[],
): ScaffoldMaterialization {
  const has = (id: string): boolean => modulesAppliedIds.includes(id);
  const inst = instanceRelative.split(path.sep).join("/");
  const api = apiRelative.split(path.sep).join("/");
  return {
    station_note:
      "Orchestrator lives under factory/03_assembly_lines/04-scaffold/. This file is an audit record under the scaffold station (`04-scaffold/records/<order-id>/<slug>/`, or `records/_unscoped/<slug>/` when no `--order-id`). Generated application code exists only under `apps/` (see code_roots).",
    code_roots: {
      apps_instance: inst,
      apps_api: api,
    },
    what_ran: {
      frontend_workspace: has("base-frontend"),
      api_workspace: has("base-api"),
      github_ci_workflows: has("github-ci"),
      workspace_merge_root_package: has("workspace-merge"),
    },
    stack_contract_summary: {
      frontend_framework: bp.frontend.stack,
      frontend_styling: bp.frontendDetail?.styling,
      backend_runtime: bp.backend.runtime,
      database: bp.database,
      redis: bp.redis,
      object_storage: bp.objectStorage,
      ai_integration: bp.ai,
      auth_system: bp.authSystem ?? "none",
    },
  };
}

function technologiesSnapshot(bp: SaaSAppBlueprint): Record<string, unknown> {
  return {
    integrationMode: bp.integrationMode,
    frontendStack: bp.frontend.stack,
    backendRuntime: bp.backend.runtime,
    database: bp.database,
    redis: bp.redis,
    objectStorage: bp.objectStorage,
    apiContract: bp.apiContract,
    authSystem: bp.authSystem,
    dataMode: bp.dataMode,
    ai: bp.ai,
    observability: bp.observability,
    frontendDetail: bp.frontendDetail,
    backendDetail: bp.backendDetail,
    databaseDetail: bp.databaseDetail,
  };
}

export async function resolvePhaseTitle(
  repoRoot: string,
  orderId: string | undefined,
  phaseId: string | undefined,
): Promise<string | undefined> {
  if (!orderId?.trim() || !phaseId?.trim()) return undefined;
  const id = orderId.trim();
  const primary = orderPhasesPath(repoRoot, id);
  const legacy = path.join(
    repoRoot,
    "factory",
    "01_production_planning",
    "01_00_work_orders",
    id,
    "order-phases.json",
  );
  let raw: string;
  try {
    raw = await readFile(primary, "utf8");
  } catch {
    try {
      raw = await readFile(legacy, "utf8");
    } catch {
      return undefined;
    }
  }
  try {
    const doc = JSON.parse(raw) as OrderPhasesDoc;
    const hit = doc.phases.find((ph) => ph.id === phaseId.trim());
    return hit?.title;
  } catch {
    return undefined;
  }
}

export function buildScaffoldRunDoc(input: {
  repoRoot: string;
  appSlug: string;
  stackContractAbsolutePath: string;
  bp: SaaSAppBlueprint;
  instanceRelative: string;
  apiRelative: string;
  modulesAppliedIds: string[];
  /** Optional list of components applied by the composer this pass. */
  componentVersions?: ScaffoldComponentVersion[];
  phase?: {
    id?: string;
    orderId?: string;
    label?: string;
    title?: string;
  };
}): ScaffoldRunDoc {
  const stackContractRelativePath = path.relative(input.repoRoot, input.stackContractAbsolutePath).split(path.sep).join("/");

  const phase =
    input.phase?.id !== undefined && input.phase.id.length > 0
      ? {
          id: input.phase.id,
          title: input.phase.title,
          orderId: input.phase.orderId,
          label: input.phase.label,
        }
      : undefined;

  const instRel = input.instanceRelative.split(path.sep).join("/");
  const apiRel = input.apiRelative.split(path.sep).join("/");

  return {
    schemaVersion: 1,
    kind: "scaffold-run",
    scaffoldAt: new Date().toISOString(),
    appSlug: input.appSlug,
    stackContractRelativePath,
    outputs: {
      instanceRelative: instRel,
      apiRelative: apiRel,
    },
    phase,
    registryParticipation: registryParticipationMaps(input.repoRoot),
    technologies: technologiesSnapshot(input.bp),
    toolingSnapshot: {
      packageManager: input.bp.tooling.packageManager,
      monorepo: input.bp.tooling.monorepo,
      cicd: input.bp.cicd,
      containers: input.bp.tooling.containers,
      testing: input.bp.tooling.testing,
      apiStyle: input.bp.tooling.apiStyle,
    },
    modulesAppliedIds: input.modulesAppliedIds,
    componentVersions: input.componentVersions ?? [],
    materialization: buildMaterialization(input.bp, input.instanceRelative, input.apiRelative, input.modulesAppliedIds),
  };
}

/** Safe single path segment for `records/<segment>/<slug>/` (shop order id, or `_unscoped`). */
export function stationRecordsOrderSegment(orderId: string | undefined): string {
  const raw = orderId?.trim();
  if (!raw) return "_unscoped";
  const seg = raw.replace(/[/\\]+/g, "_").replace(/^\.+/, "_") || "_invalid";
  return seg;
}

export async function writeScaffoldRunArtifacts(
  repoRoot: string,
  doc: ScaffoldRunDoc,
  slug: string,
  instanceDir: string,
  dryRun: boolean,
  stationOrderId?: string,
): Promise<void> {
  const configsPath = path.join(repoRoot, "configs", "apps", slug, "scaffold-run.json");
  const appPath = path.join(instanceDir, "scaffold-run.json");
  const orderSegment = stationRecordsOrderSegment(stationOrderId);
  const stationRecordPath = path.join(
    repoRoot,
    "factory",
    "03_assembly_lines",
    "04-scaffold",
    "records",
    orderSegment,
    slug,
    "scaffold-run.json",
  );
  const raw = JSON.stringify(doc, null, 2) + "\n";
  if (dryRun) {
    console.log("[dry-run] would write scaffold-run.json →");
    console.log(" ", path.relative(repoRoot, configsPath));
    console.log(" ", path.relative(repoRoot, appPath));
    console.log(" ", path.relative(repoRoot, stationRecordPath));
    return;
  }
  await mkdir(path.dirname(configsPath), { recursive: true });
  await writeFile(configsPath, raw, "utf8");
  await mkdir(path.dirname(appPath), { recursive: true });
  await writeFile(appPath, raw, "utf8");
  await mkdir(path.dirname(stationRecordPath), { recursive: true });
  await writeFile(stationRecordPath, raw, "utf8");
}
