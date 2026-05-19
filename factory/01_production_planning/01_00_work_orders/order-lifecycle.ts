/**
 * Record factory lifecycle on the shop order (separate from sales-order commercial status).
 *
 *   npm run mfg -- order lifecycle <orderId> set <status> [--note "…"]
 *
 * Appends an audit line to order-events.jsonl and updates order-manifest.json lifecycleStatus.
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { OrderLifecycleStatus } from "../../factory_libs/orders/order-phases-types.js";

import { type OrderManifest, validateOrderManifest } from "./validate-manifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

const ALLOWED: OrderLifecycleStatus[] = [
  "intake",
  "quoted",
  "confirmed",
  "scheduled",
  "phases_defined",
  "executing",
  "completed",
  "cancelled",
];

function usage(): void {
  console.error(
    `Usage: npm run mfg -- order lifecycle <orderId> set <status> [--note "..."]\n` +
      `  status: ${ALLOWED.join(" | ")}\n`,
  );
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  let note: string | undefined;
  const noteIdx = argv.indexOf("--note");
  if (noteIdx >= 0 && argv[noteIdx + 1]) {
    note = argv[noteIdx + 1];
    argv.splice(noteIdx, 2);
  }

  const rest = argv.filter((a) => !a.startsWith("--"));
  if (rest.length < 3 || rest[1] !== "set") {
    usage();
    return 1;
  }

  const orderId = rest[0]!.trim();
  const status = rest[2]!.trim() as OrderLifecycleStatus;

  if (!ALLOWED.includes(status)) {
    console.error(`Invalid status. Use one of: ${ALLOWED.join(", ")}`);
    return 1;
  }

  const dir = path.join(__dirname, orderId);
  const manifestPath = path.join(dir, "order-manifest.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    console.error(`Missing ${path.relative(REPO_ROOT, manifestPath)}`);
    return 1;
  }

  let manifest: OrderManifest;
  try {
    manifest = JSON.parse(raw) as OrderManifest;
  } catch {
    console.error("Invalid order-manifest.json");
    return 1;
  }

  const prev = manifest.lifecycleStatus;
  manifest.lifecycleStatus = status;
  manifest.lastLifecycleEventAt = new Date().toISOString();

  const check = await validateOrderManifest(manifest, REPO_ROOT);
  if (!check.ok) {
    for (const e of check.errors) console.error("ERR:", e);
    return 1;
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const eventsPath = path.join(dir, "order-events.jsonl");
  const line = JSON.stringify({
    at: manifest.lastLifecycleEventAt,
    kind: "lifecycle",
    from: prev ?? null,
    to: status,
    note: note ?? null,
  });
  await appendFile(eventsPath, line + "\n", "utf8");

  console.log(`lifecycle ${orderId}: ${prev ?? "(none)"} → ${status}`);
  console.log(`appended ${path.relative(REPO_ROOT, eventsPath)}`);
  return 0;
}

main().then((c) => {
  process.exitCode = c;
});
