/**
 * CLI: `npm run mfg -- order contracts <orderId>`
 * Validates `order-manifest.json`, (re)writes `contracts/<productId>/contract.json`, and
 * `03-registry/orders/<orderId>/<productId>/workforce-registry.json` for each app on the order.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type OrderManifest, normalizeOrderProducts, validateOrderManifest } from "./validate-manifest.js";
import { writeOrderContracts } from "./write-order-contracts.js";
import { writeOrderWorkforceRegistries } from "./write-order-workforce-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..");

function usage(): void {
  console.error(
    "Usage: npm run mfg -- order contracts <orderId>\n" +
      "  Writes contracts/<productId>/contract.json and 03-registry/orders/<orderId>/<productId>/workforce-registry.json",
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
  const { written: wf } = await writeOrderWorkforceRegistries(repoRoot, manifest);
  const lines = normalizeOrderProducts(manifest).map((p) => p.productId);
  console.log(`OK: order ${manifest.orderId} — ${written.length} contract(s), ${wf.length} workforce slice(s) for: ${lines.join(", ")}`);
  for (const w of written) {
    console.log(`  contract: ${w}`);
  }
  for (const w of wf) {
    console.log(`  workforce: ${w}`);
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
