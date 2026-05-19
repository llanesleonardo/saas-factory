/**
 * Writes per-app **contract** pointers under
 * `factory/01_production_planning/01_00_work_orders/<orderId>/contracts/<productId>/contract.json`.
 *
 * Each file lists repo-relative paths to Product IR, System IR, specs, business-needs — the persisted
 * engineering agreements under `configs/apps/<productId>/` (see assembly line `02-contracts`).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { appStackPath, businessNeedsPath, verticalBriefPath } from "../../factory_libs/paths/app-config-paths.js";
import { normalizeOrderProducts, type OrderManifest } from "./validate-manifest.js";

function toPosixRel(repoRoot: string, abs: string): string {
  return path.relative(repoRoot, abs).split(path.sep).join("/");
}

export type OrderAppContractDoc = {
  schema_version: 1;
  order_id: string;
  product_id: string;
  product_version: string;
  priority: number;
  paths: {
    product_ir: string;
    system_ir: string;
    specs_dir: string;
    business_needs: string;
  };
  generated_at_utc: string;
};

export async function writeOrderContracts(
  repoRoot: string,
  manifest: OrderManifest,
): Promise<{ written: string[] }> {
  const orderId = manifest.orderId.trim();
  const lines = normalizeOrderProducts(manifest);
  const written: string[] = [];
  const iso = new Date().toISOString();

  for (const line of lines) {
    const slug = line.productId;
    const orderDir = path.join(
      repoRoot,
      "factory",
      "01_production_planning",
      "01_00_work_orders",
      orderId,
    );
    const contractsDir = path.join(orderDir, "contracts", slug);
    await mkdir(contractsDir, { recursive: true });

    const brief = verticalBriefPath(repoRoot, slug);
    const stack = appStackPath(repoRoot, slug);
    const bn = businessNeedsPath(repoRoot, slug);
    const specsDir = path.join(repoRoot, "configs", "apps", slug, "specs");

    const doc: OrderAppContractDoc = {
      schema_version: 1,
      order_id: orderId,
      product_id: slug,
      product_version: line.productVersion,
      priority: line.priority,
      paths: {
        product_ir: toPosixRel(repoRoot, brief),
        system_ir: toPosixRel(repoRoot, stack),
        specs_dir: `${toPosixRel(repoRoot, specsDir)}/`,
        business_needs: toPosixRel(repoRoot, bn),
      },
      generated_at_utc: iso,
    };

    const outPath = path.join(contractsDir, "contract.json");
    await writeFile(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    written.push(toPosixRel(repoRoot, outPath));
  }

  return { written };
}
