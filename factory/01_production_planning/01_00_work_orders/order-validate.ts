/**
 * CLI: `npm run mfg -- order validate <orderId>`
 * Loads `factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json`
 * and validates against `configs/apps/<productId>/` (+ optional plan folder).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type OrderManifest,
  normalizeOrderProducts,
  validateOrderManifest,
} from "./validate-manifest.js";
import { writeOrderContracts } from "./write-order-contracts.js";
import { writeOrderWorkforceRegistries } from "./write-order-workforce-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..");

function usage(): void {
  console.error(
    "Usage: npm run mfg -- order validate <orderId>\n" +
      "  orderId = folder name under factory/01_production_planning/01_00_work_orders/",
  );
}

async function main(): Promise<void> {
  const orderId = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!orderId?.trim()) {
    usage();
    process.exitCode = 1;
    return;
  }

  const manifestPath = path.join(__dirname, orderId.trim(), "order-manifest.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    console.error(`Cannot read ${path.relative(repoRoot, manifestPath)}`);
    process.exitCode = 1;
    return;
  }

  let manifest: OrderManifest;
  try {
    manifest = JSON.parse(raw) as OrderManifest;
  } catch (e) {
    console.error("Invalid JSON:", e);
    process.exitCode = 1;
    return;
  }

  const result = await validateOrderManifest(manifest, repoRoot);
  for (const w of result.warnings) {
    console.warn("WARN:", w);
  }
  if (!result.ok) {
    for (const err of result.errors) {
      console.error("ERR:", err);
    }
    process.exitCode = 1;
    return;
  }

  const { written } = await writeOrderContracts(repoRoot, manifest);
  const { written: workforceWritten } = await writeOrderWorkforceRegistries(repoRoot, manifest);
  const apps = normalizeOrderProducts(manifest).map((p) => p.productId);
  console.log(`OK: order ${manifest.orderId} → app(s): ${apps.join(", ")}`);
  console.log(`Contracts (${written.length}):`);
  for (const w of written) {
    console.log(`  ${w}`);
  }
  console.log(`Workforce registry slices (${workforceWritten.length}):`);
  for (const w of workforceWritten) {
    console.log(`  ${w}`);
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
