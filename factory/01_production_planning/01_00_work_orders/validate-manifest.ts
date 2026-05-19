/**
 * Shop order manifest validation: links `01_production_planning/01_00_work_orders/*`
 * to `configs/apps/<productId>/` (customer needs) and optional `plans/<planRef>/`.
 *
 * Manifest shapes:
 * - **Legacy (single app):** top-level `productId`, `productVersion`, `priority`.
 * - **Multi-app:** non-empty `products[]` — each entry is one app line item (`productId` required per row).
 */
import { access } from "node:fs/promises";
import path from "node:path";

import { appStackPath, verticalBriefPath } from "../../factory_libs/paths/app-config-paths.js";
import type { OrderLifecycleStatus } from "../../factory_libs/orders/order-phases-types.js";

/** One app line item inside `order-manifest.json` when using `products[]`. */
export type OrderProductLineInput = {
  productId: string;
  productVersion?: string;
  priority?: number;
};

export type OrderManifest = {
  orderId: string;
  /** Legacy single-product line — required when `products` is absent or empty. */
  productId?: string;
  productVersion?: string;
  priority?: number;
  /** Multi-product order — when non-empty, each row is one app on this order (folder `01_00_work_orders/<orderId>/`). */
  products?: OrderProductLineInput[];
  /** Optional folder under `factory/01_production_planning/plans/<planRef>/`. */
  planRef?: string;
  notes?: string;
  /** Factory-side lifecycle (intake → scheduled → phases → execution). Commercial status stays in sales-order.json. */
  lifecycleStatus?: OrderLifecycleStatus;
  lastLifecycleEventAt?: string;
};

/** Normalized line item after defaults (use after `validateOrderManifest` succeeds). */
export type OrderProductLine = {
  productId: string;
  productVersion: string;
  priority: number;
};

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

const LIFECYCLE: OrderLifecycleStatus[] = [
  "intake",
  "quoted",
  "confirmed",
  "scheduled",
  "phases_defined",
  "executing",
  "completed",
  "cancelled",
];

/** True when manifest uses the `products[]` multi-app shape. */
export function usesProductList(manifest: OrderManifest): boolean {
  return Array.isArray(manifest.products) && manifest.products.length > 0;
}

/**
 * Resolved apps on this order (folder `contracts/<productId>/contract.json` targets these slugs).
 * Call only after validation passes (or handle missing legacy fields).
 */
export function normalizeOrderProducts(manifest: OrderManifest): OrderProductLine[] {
  const fallbackPri =
    typeof manifest.priority === "number" && manifest.priority >= 0 ? manifest.priority : 0;

  if (usesProductList(manifest)) {
    return manifest.products!.map((p) => ({
      productId: p.productId.trim(),
      productVersion: isNonEmpty(p.productVersion) ? p.productVersion.trim() : "1.0.0",
      priority:
        typeof p.priority === "number" && p.priority >= 0 ? p.priority : fallbackPri,
    }));
  }

  return [
    {
      productId: manifest.productId!.trim(),
      productVersion: manifest.productVersion!.trim(),
      priority:
        typeof manifest.priority === "number" && manifest.priority >= 0 ? manifest.priority : 0,
    },
  ];
}

/** First app on the order — used for phase-queue filter / schedule slug when one slug is required. */
export function primaryProductId(manifest: OrderManifest): string {
  return normalizeOrderProducts(manifest)[0].productId;
}

async function checkProductArtifacts(
  slug: string,
  repoRoot: string,
  errors: string[],
  warnings: string[],
): Promise<void> {
  const brief = verticalBriefPath(repoRoot, slug);
  const stack = appStackPath(repoRoot, slug);

  try {
    await access(brief);
  } catch {
    errors.push(
      `Product brief missing: ${path.relative(repoRoot, brief)} — run \`npm run mfg -- app new -- ${slug}\` (or create the file), then \`npm run mfg -- validate apps\` (brief is part of that check).`,
    );
  }

  try {
    await access(stack);
  } catch {
    warnings.push(
      `Stack file not yet present: ${path.relative(repoRoot, stack)} — when ready, run \`npm run mfg -- app stack -- ${slug}\` (or create the file by hand), then scaffold.`,
    );
  }
}

/**
 * Validates manifest shape + ties each **productId** to `configs/apps/<productId>/`.
 * - **Brief** (`<productId>.json`) must exist (customer needs / product IR).
 * - **Stack** (`app.stack.json`) optional for early intake; if missing, adds a warning (not an error).
 * - **planRef** if set: `factory/01_production_planning/plans/<planRef>/` must exist as a directory.
 */
export async function validateOrderManifest(
  manifest: OrderManifest,
  repoRoot: string,
): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isNonEmpty(manifest.orderId)) errors.push("orderId required");

  if (manifest.lifecycleStatus !== undefined && !LIFECYCLE.includes(manifest.lifecycleStatus)) {
    errors.push(`lifecycleStatus must be one of: ${LIFECYCLE.join(", ")}`);
  }

  if (usesProductList(manifest)) {
    const ids = manifest.products!.map((p) => (p.productId ?? "").trim()).filter(Boolean);
    const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dup.length > 0) {
      errors.push(`duplicate productId in products: ${dup.join(", ")}`);
    }

    for (const p of manifest.products!) {
      const slug = (p.productId ?? "").trim();
      if (!slug) {
        errors.push("each products[] entry requires productId");
        continue;
      }
      await checkProductArtifacts(slug, repoRoot, errors, warnings);
    }

  } else {
    if (!isNonEmpty(manifest.productId)) errors.push("productId required (or use non-empty products[])");
    if (!isNonEmpty(manifest.productVersion)) errors.push("productVersion required (or use products[])");
    if (typeof manifest.priority !== "number" || manifest.priority < 0) {
      errors.push("priority must be a non-negative number (or use products[])");
    }

    if (isNonEmpty(manifest.productId)) {
      await checkProductArtifacts(manifest.productId.trim(), repoRoot, errors, warnings);
    }
  }

  if (isNonEmpty(manifest.planRef)) {
    const planDir = path.join(repoRoot, "factory", "01_production_planning", "plans", manifest.planRef.trim());
    try {
      await access(planDir);
    } catch {
      errors.push(
        `Plan folder missing: ${path.relative(repoRoot, planDir)} — create under \`factory/01_production_planning/plans/\` or clear planRef until the plan exists.`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
