/**
 * Shared helpers for sales order / work order CLIs.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AppQuoteBundle } from "../../factory_libs/commerce/app-quote-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ORDERS_DIR = __dirname;
export const REPO_ROOT = path.join(__dirname, "..", "..", "..");

const SLUG = /^[a-z][a-z0-9-]*$/;

export function isSlug(s: string): boolean {
  return SLUG.test(s.trim());
}

/** Runs `app quote --json` and returns the bundle (throws on failure). */
export function loadQuoteBundleJson(slug: string, strict: boolean): AppQuoteBundle {
  const script = "factory/03_assembly_lines/06-gates/gates/app-quote.ts";
  const args = ["tsx", script, "--", slug, "--json"];
  if (strict) args.push("--strict");
  const r = spawnSync("npx", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const out = r.stdout?.trim();
  if (!out) {
    throw new Error(
      `Could not load quote for "${slug}" (empty stdout). stderr: ${(r.stderr ?? "").slice(0, 300)}`,
    );
  }
  try {
    return JSON.parse(out) as AppQuoteBundle;
  } catch (e) {
    throw new Error(`Invalid quote JSON for "${slug}": ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function defaultOrderId(slug: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${slug}-so-${y}${m}${day}`;
}
