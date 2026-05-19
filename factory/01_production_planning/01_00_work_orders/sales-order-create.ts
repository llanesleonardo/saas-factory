/**
 * Create a **sales order** from an app quote + client scope (what they actually want delivered).
 *
 * Usage:
 *   npm run mfg -- so -- <appSlug>
 *   npm run mfg -- so -- <appSlug> --yes
 *   npm run mfg -- so -- <appSlug> --order-id my-order-001 --strict
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkbox, confirm, input } from "@inquirer/prompts";

import type { AppQuoteBundle } from "../../factory_libs/commerce/app-quote-types.js";
import type { SalesOrderClientScope, SalesOrderDoc } from "../../factory_libs/commerce/sales-work-order-types.js";
import {
  defaultOrderId,
  isSlug,
  loadQuoteBundleJson,
  ORDERS_DIR,
  REPO_ROOT,
} from "./sales-order-lib.js";
import type { OrderManifest } from "./validate-manifest.js";

function parseArgs(argv: string[]): {
  slug?: string;
  strict: boolean;
  yes: boolean;
  json: boolean;
  orderId?: string;
  priority: number;
  productVersion: string;
  planRef?: string;
  help: boolean;
} {
  const strict = argv.includes("--strict");
  const yes = argv.includes("--yes") || argv.includes("-y");
  const json = argv.includes("--json");
  const help = argv.includes("--help") || argv.includes("-h");

  function opt(flag: string): string | undefined {
    const i = argv.indexOf(flag);
    if (i < 0 || !argv[i + 1] || argv[i + 1].startsWith("--")) return undefined;
    return argv[i + 1];
  }

  let priority = 2;
  const prVal = opt("--priority");
  if (prVal !== undefined) {
    const n = Number(prVal);
    if (!Number.isNaN(n) && n >= 0) priority = n;
  }

  const orderId = opt("--order-id")?.trim();
  const productVersion = opt("--product-version")?.trim() ?? "1.0.0";
  const planRef = opt("--plan-ref")?.trim();

  const slug = argv.find((a) => !a.startsWith("--") && isSlug(a));

  return { slug, strict, yes, json, orderId, priority, productVersion, planRef, help };
}

function defaultScopeFromQuote(q: AppQuoteBundle, yes: boolean): SalesOrderClientScope {
  const hasBrief = q.artifacts.verticalBrief.present;
  const hasBn = q.artifacts.businessNeeds.present;
  const hasStack = q.artifacts.appStack.present;
  const needInstance = q.manufacturing.firstManufacture || q.manufacturing.scaffoldedInstancePresent;

  if (yes) {
    return {
      deliverVerticalBrief: hasBrief,
      deliverBusinessNeeds: hasBn,
      deliverStackBlueprint: hasStack,
      deliverInstanceManufacturing: Boolean(needInstance && hasStack),
      requireSaasAlignmentClean: q.saasAlignment ? q.saasAlignment.errorCount === 0 : true,
    };
  }

  return {
    deliverVerticalBrief: hasBrief,
    deliverBusinessNeeds: hasBn,
    deliverStackBlueprint: hasStack,
    deliverInstanceManufacturing: Boolean(hasStack && needInstance),
    requireSaasAlignmentClean: true,
  };
}

async function promptScope(q: AppQuoteBundle): Promise<SalesOrderClientScope> {
  const choices: { value: keyof Omit<SalesOrderClientScope, "requireSaasAlignmentClean">; name: string; checked: boolean; disabled?: string }[] =
    [
      {
        value: "deliverVerticalBrief",
        name: "Vertical brief (product definition)",
        checked: q.artifacts.verticalBrief.present,
        disabled: q.artifacts.verticalBrief.present ? undefined : "missing on disk",
      },
      {
        value: "deliverBusinessNeeds",
        name: "Business needs bundle",
        checked: q.artifacts.businessNeeds.present,
        disabled: q.artifacts.businessNeeds.present ? undefined : "missing on disk",
      },
      {
        value: "deliverStackBlueprint",
        name: "App stack blueprint (app.stack.json)",
        checked: q.artifacts.appStack.present,
        disabled: q.artifacts.appStack.present ? undefined : "missing on disk",
      },
      {
        value: "deliverInstanceManufacturing",
        name:
          q.manufacturing.scaffoldedInstancePresent
            ? "Manufacturing / evolution of scaffolded instance"
            : "Manufacturing new instance (scaffold + iterations)",
        checked: Boolean(q.artifacts.appStack.present),
      },
    ];

  const selected = await checkbox({
    message: "What should this sales order include? (client scope)",
    choices,
    validate: (sel) => (sel.length > 0 ? true : "Pick at least one deliverable"),
  });

  const scope: SalesOrderClientScope = {
    deliverVerticalBrief: selected.includes("deliverVerticalBrief"),
    deliverBusinessNeeds: selected.includes("deliverBusinessNeeds"),
    deliverStackBlueprint: selected.includes("deliverStackBlueprint"),
    deliverInstanceManufacturing: selected.includes("deliverInstanceManufacturing"),
    requireSaasAlignmentClean: true,
  };

  if (q.saasAlignment && (q.saasAlignment.errorCount > 0 || q.saasAlignment.warnCount > 0)) {
    scope.requireSaasAlignmentClean = await confirm({
      message: `Require SaaS alignment clean (zero errors) before manufacturing? (${q.saasAlignment.errorCount} errors, ${q.saasAlignment.warnCount} warnings today)`,
      default: q.saasAlignment.errorCount === 0,
    });
  }

  return scope;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help) {
    console.log(`Create sales order from quote + client scope.

Usage:
  npm run mfg -- so -- <appSlug> [--yes] [--strict] [--json]
  npm run mfg -- so -- <appSlug> --order-id <id> --priority <n> --product-version <semver> [--plan-ref <folder>]

Writes:
  factory/01_production_planning/01_00_work_orders/<orderId>/sales-order.json
  factory/01_production_planning/01_00_work_orders/<orderId>/order-manifest.json

Next: npm run mfg -- wo -- <orderId>
`);
    return;
  }

  if (!args.slug || !isSlug(args.slug)) {
    console.error('Usage: npm run mfg -- so -- <appSlug> [--yes] [--order-id ...]');
    process.exitCode = 1;
    return;
  }

  const slug = args.slug;
  const quote = loadQuoteBundleJson(slug, args.strict);

  let clientScope = defaultScopeFromQuote(quote, args.yes);
  if (!args.yes && process.stdin.isTTY) {
    clientScope = await promptScope(quote);
  }

  let orderId = args.orderId?.trim();
  if (!orderId) {
    if (args.yes || !process.stdin.isTTY) {
      orderId = defaultOrderId(slug);
    } else {
      orderId = await input({
        message: "Sales order id (folder name under 01_00_work_orders/)",
        default: defaultOrderId(slug),
      });
    }
  }

  if (!orderId || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(orderId)) {
    console.error("Invalid --order-id (use letters, numbers, dot, hyphen, underscore).");
    process.exitCode = 1;
    return;
  }

  let planRef = args.planRef;
  if (!planRef && !args.yes && process.stdin.isTTY) {
    planRef =
      (await input({
        message: "Plan folder under factory/01_production_planning/plans/ (optional, Enter to skip)",
        default: "",
      })).trim() || undefined;
  }

  const salesDir = path.join(ORDERS_DIR, orderId);
  await mkdir(salesDir, { recursive: true });

  const salesDoc: SalesOrderDoc = {
    schemaVersion: 1,
    salesOrderId: orderId,
    appSlug: slug,
    status: "draft",
    createdAt: new Date().toISOString(),
    quoteSnapshot: quote,
    clientScope,
    productVersion: args.productVersion,
    priority: args.priority,
    planRef,
    notes: "Created via `npm run mfg -- so`. Confirm with `npm run mfg -- wo`.",
  };

  const manifest: OrderManifest = {
    orderId,
    productId: slug,
    productVersion: args.productVersion,
    priority: args.priority,
    planRef,
    notes: `Sales order ${orderId}: client scope in sales-order.json`,
  };

  await writeFile(path.join(salesDir, "sales-order.json"), JSON.stringify(salesDoc, null, 2) + "\n", "utf8");
  await writeFile(path.join(salesDir, "order-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const rel = path.relative(REPO_ROOT, salesDir);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          orderId,
          salesOrderPath: `${rel}/sales-order.json`,
          manifestPath: `${rel}/order-manifest.json`,
          clientScope,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`\nSales order draft created: ${orderId}`);
    console.log(`  ${rel}/sales-order.json`);
    console.log(`  ${rel}/order-manifest.json`);
    console.log("\nClient scope:");
    console.log(`  vertical brief: ${clientScope.deliverVerticalBrief}`);
    console.log(`  business needs: ${clientScope.deliverBusinessNeeds}`);
    console.log(`  stack blueprint: ${clientScope.deliverStackBlueprint}`);
    console.log(`  instance manufacturing: ${clientScope.deliverInstanceManufacturing}`);
    console.log(`  require SaaS alignment clean: ${clientScope.requireSaasAlignmentClean}`);
    console.log("\nConfirm (opens work order): npm run mfg -- wo -- " + orderId + "\n");
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
