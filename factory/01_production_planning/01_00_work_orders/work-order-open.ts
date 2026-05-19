/**
 * Confirm a **sales order** (draft) and open a **work order** for manufacturing execution.
 *
 * Usage:
 *   npm run mfg -- wo -- <orderId>
 *   npm run mfg -- wo -- <orderId> --yes
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { confirm } from "@inquirer/prompts";

import type { SalesOrderDoc, WorkOrderDoc } from "../../factory_libs/commerce/sales-work-order-types.js";
import { ORDERS_DIR, REPO_ROOT } from "./sales-order-lib.js";

const ORDER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function parseArgs(argv: string[]): { orderId?: string; yes: boolean; json: boolean; help: boolean } {
  const yes = argv.includes("--yes") || argv.includes("-y");
  const json = argv.includes("--json");
  const help = argv.includes("--help") || argv.includes("-h");
  const orderId = argv.find((a) => !a.startsWith("--") && ORDER_ID_RE.test(a));
  return { orderId, yes, json, help };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help) {
    console.log(`Confirm sales order and open work order.

Usage:
  npm run mfg -- wo -- <orderId> [--yes] [--json]

Requires:
  factory/01_production_planning/01_00_work_orders/<orderId>/sales-order.json (status: draft)

Writes:
  sales-order.json (status → confirmed)
  work-order.json (status: open)
`);
    return;
  }

  if (!args.orderId?.trim()) {
    console.error('Usage: npm run mfg -- wo -- <orderId>');
    process.exitCode = 1;
    return;
  }

  const orderId = args.orderId.trim();
  const salesPath = path.join(ORDERS_DIR, orderId, "sales-order.json");

  let raw: string;
  try {
    raw = await readFile(salesPath, "utf8");
  } catch {
    console.error(`No sales order at ${path.relative(REPO_ROOT, salesPath)} — run \`npm run mfg -- so -- <slug>\` first.`);
    process.exitCode = 1;
    return;
  }

  let doc: SalesOrderDoc;
  try {
    doc = JSON.parse(raw) as SalesOrderDoc;
  } catch (e) {
    console.error("Invalid sales-order.json:", e);
    process.exitCode = 1;
    return;
  }

  if (doc.schemaVersion !== 1 || doc.salesOrderId !== orderId) {
    console.error("sales-order.json schema mismatch or salesOrderId vs folder.");
    process.exitCode = 1;
    return;
  }

  if (doc.status !== "draft") {
    console.error(`Sales order is not draft (status: ${doc.status}).`);
    process.exitCode = 1;
    return;
  }

  if (doc.clientScope.requireSaasAlignmentClean && doc.quoteSnapshot.saasAlignment && !doc.quoteSnapshot.saasAlignment.ok) {
    console.error(
      "SaaS alignment still has errors — resolve `npm run mfg -- app saas` first or recreate the sales order without requireSaasAlignmentClean.",
    );
    process.exitCode = 1;
    return;
  }

  if (!args.yes && process.stdin.isTTY) {
    const ok = await confirm({
      message: `Confirm sales order ${orderId} and open work order for "${doc.appSlug}"?`,
      default: true,
    });
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  const confirmedAt = new Date().toISOString();
  const workOrderId = `${orderId}-wo`;

  const updated: SalesOrderDoc = {
    ...doc,
    status: "confirmed",
    confirmedAt,
  };

  const wo: WorkOrderDoc = {
    schemaVersion: 1,
    workOrderId,
    salesOrderId: orderId,
    appSlug: doc.appSlug,
    status: "open",
    openedAt: confirmedAt,
    salesOrderConfirmedAt: confirmedAt,
    clientScope: doc.clientScope,
    quoteGeneratedAt: doc.quoteSnapshot.generatedAt,
    manufacturingTier: doc.quoteSnapshot.manufacturing.tier,
    taskBoardHint: `apps/${doc.appSlug}-instance — pull tasks: npm run mfg -- line next`,
  };

  await writeFile(salesPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
  const woPath = path.join(ORDERS_DIR, orderId, "work-order.json");
  await writeFile(woPath, JSON.stringify(wo, null, 2) + "\n", "utf8");

  const relSales = path.relative(REPO_ROOT, salesPath);
  const relWo = path.relative(REPO_ROOT, woPath);

  if (args.json) {
    console.log(JSON.stringify({ ok: true, orderId, workOrderId, workOrderPath: relWo }, null, 2));
  } else {
    console.log(`\nSales order confirmed: ${orderId}`);
    console.log(`Work order opened: ${workOrderId}`);
    console.log(`  ${relWo}`);
    console.log(`  updated ${relSales}`);
    console.log(`\n${wo.taskBoardHint}\n`);
  }

  process.exitCode = 0;
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]!) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
