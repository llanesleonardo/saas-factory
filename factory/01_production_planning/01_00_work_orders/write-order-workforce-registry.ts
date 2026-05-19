/**
 * Per-order, per-app **workforce registry slice** under
 * `factory/03_assembly_lines/03-registry/orders/<orderId>/<productId>/workforce-registry.json`.
 *
 * Mirrors the assembly-line registry station for the apps on a shop order: pointers to global
 * registries plus the full workstation roster (who may act, which tools attach to each station).
 * Generated together with `contracts/<productId>/contract.json`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeOrderProducts, type OrderManifest } from "./validate-manifest.js";

function toPosixRel(repoRoot: string, abs: string): string {
  return path.relative(repoRoot, abs).split(path.sep).join("/");
}

type WorkstationMapFile = {
  version?: number;
  model?: unknown;
  stations?: Record<string, unknown>;
};

export type OrderWorkforceRegistryDoc = {
  schema_version: 1;
  order_id: string;
  product_id: string;
  generated_at_utc: string;
  /** Repo-relative path to the companion contract snapshot for this order line. */
  contract_pointer: string;
  /** Global registries the line uses (authoritative copies under `registry/`). */
  canonical_global_registries: {
    agent_registry: string;
    tool_registry: string;
    workflow_state_machine: string;
    task_queue: string;
    phase_queue: string;
    verified_apps: string;
  };
  workstation_map_pointer: string;
  workstation_map_version?: number;
  /** Agile + SE framing from `workstation-map.json`. */
  model?: unknown;
  /** Full station roster — primary roles, assists, tools — same keys as workforce `workstation-map.json`. */
  stations: Record<string, unknown>;
};

const WORKSTATION_MAP_REL = "factory/02_workforce/02_02_workstations/workstation-map.json";

async function loadWorkstationMap(repoRoot: string): Promise<WorkstationMapFile> {
  const abs = path.join(repoRoot, ...WORKSTATION_MAP_REL.split("/"));
  const raw = await readFile(abs, "utf8");
  return JSON.parse(raw) as WorkstationMapFile;
}

export async function writeOrderWorkforceRegistries(
  repoRoot: string,
  manifest: OrderManifest,
): Promise<{ written: string[] }> {
  const orderId = manifest.orderId.trim();
  const lines = normalizeOrderProducts(manifest);
  const written: string[] = [];
  const iso = new Date().toISOString();

  const wm = await loadWorkstationMap(repoRoot);
  const stations = wm.stations ?? {};
  const model = wm.model;

  for (const line of lines) {
    const slug = line.productId;
    const outDir = path.join(
      repoRoot,
      "factory",
      "03_assembly_lines",
      "03-registry",
      "orders",
      orderId,
      slug,
    );
    await mkdir(outDir, { recursive: true });

    const contractPointer = toPosixRel(
      repoRoot,
      path.join(
        repoRoot,
        "factory",
        "01_production_planning",
        "01_00_work_orders",
        orderId,
        "contracts",
        slug,
        "contract.json",
      ),
    );

    const doc: OrderWorkforceRegistryDoc = {
      schema_version: 1,
      order_id: orderId,
      product_id: slug,
      generated_at_utc: iso,
      contract_pointer: contractPointer,
      canonical_global_registries: {
        agent_registry: "factory/02_workforce/02_00_agents/agent-registry.json",
        tool_registry: "factory/03_assembly_lines/03-registry/registry/tool-registry.json",
        workflow_state_machine:
          "factory/03_assembly_lines/03-registry/registry/workflow-state-machine.json",
        task_queue: "factory/03_assembly_lines/03-registry/registry/task-queue.json",
        phase_queue: "factory/03_assembly_lines/03-registry/registry/phase-queue.json",
        verified_apps: "factory/03_assembly_lines/03-registry/registry/verified-apps.json",
      },
      workstation_map_pointer: WORKSTATION_MAP_REL,
      workstation_map_version: wm.version,
      model,
      stations,
    };

    const outPath = path.join(outDir, "workforce-registry.json");
    await writeFile(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    written.push(toPosixRel(repoRoot, outPath));
  }

  return { written };
}
