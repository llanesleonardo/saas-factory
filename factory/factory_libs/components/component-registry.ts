/**
 * Discover **component packages** under `packages/components/<id>/manifest.json`.
 *
 * One I/O entrypoint (`discoverComponents`) reads the filesystem. Everything
 * else in this file is pure helpers operating on the in-memory list, so unit
 * tests can stub the discovery and exercise `findApplicable*` directly.
 *
 * Used by:
 *   • `composer.ts`                                — pick adapters per capability
 *   • `mfg components list / show` (future CLI)    — inspect registered adapters
 *   • Unit tests                                   — assert auth-jwt-builtin loads
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  ComponentCapability,
  ComponentManifest,
  DiscoveredComponent,
} from "./component-manifest-types.js";
import { validateComponentManifest } from "./component-manifest.js";

/** Repo-relative path to the components root. */
export const COMPONENTS_ROOT_REL = "packages/components";

/** Absolute path to the components root for a given repo. */
export function componentsRootAbs(repoRoot: string): string {
  return path.join(repoRoot, COMPONENTS_ROOT_REL);
}

/** A non-fatal discovery problem reported alongside the loaded components. */
export interface RegistryWarning {
  /** Component folder name (e.g. `auth-jwt-builtin`) or `<root>` when discovery itself failed. */
  componentDir: string;
  kind: "missing-manifest" | "invalid-json" | "validation-failed" | "directory-error";
  detail: string;
}

export interface RegistryLoadResult {
  components: DiscoveredComponent[];
  warnings: RegistryWarning[];
}

/**
 * Walk `packages/components/*` and load every valid `manifest.json`.
 *
 * Behavior:
 *   • Folders without a `manifest.json` are reported as warnings, not failures.
 *     This lets us keep empty stubs around (e.g. while authoring) without
 *     breaking `mfg app scaffold`.
 *   • Folders whose manifest fails validation are reported and SKIPPED — the
 *     scaffold should not silently apply a broken adapter.
 *   • If `packages/components/` itself does not exist, returns an empty result
 *     plus one warning. (Apps without any components are valid.)
 */
export async function discoverComponents(repoRoot: string): Promise<RegistryLoadResult> {
  const root = componentsRootAbs(repoRoot);
  const out: DiscoveredComponent[] = [];
  const warnings: RegistryWarning[] = [];

  let entries: string[] = [];
  try {
    const dirents = await fs.readdir(root, { withFileTypes: true });
    entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (e) {
    warnings.push({
      componentDir: "<root>",
      kind: "directory-error",
      detail: `${root}: ${(e as Error).message}`,
    });
    return { components: out, warnings };
  }

  for (const dir of entries.sort()) {
    const packageRoot = path.join(root, dir);
    const manifestAbs = path.join(packageRoot, "manifest.json");
    let raw: string;
    try {
      raw = await fs.readFile(manifestAbs, "utf8");
    } catch {
      warnings.push({
        componentDir: dir,
        kind: "missing-manifest",
        detail: `no manifest.json at ${path.relative(repoRoot, manifestAbs)}`,
      });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      warnings.push({
        componentDir: dir,
        kind: "invalid-json",
        detail: (e as Error).message,
      });
      continue;
    }
    const result = validateComponentManifest(parsed);
    if (!result.ok) {
      warnings.push({
        componentDir: dir,
        kind: "validation-failed",
        detail: result.errors.join("; "),
      });
      continue;
    }
    out.push({
      manifest: result.manifest,
      packageRoot,
      manifestRelPath: path.relative(repoRoot, manifestAbs),
    });
  }

  return { components: out, warnings };
}

/** All components belonging to a capability (auth, billing, …). */
export function componentsByCapability(
  components: DiscoveredComponent[],
  capability: ComponentCapability,
): DiscoveredComponent[] {
  return components.filter((c) => c.manifest.capability === capability);
}

/** Every distinct capability present in the registry. */
export function capabilitiesPresent(
  components: DiscoveredComponent[],
): ComponentCapability[] {
  const set = new Set<ComponentCapability>();
  for (const c of components) set.add(c.manifest.capability);
  return [...set].sort();
}

/**
 * Lookup helper — find a component by `componentId`. Returns `undefined` if
 * absent so the composer can produce a precise error message.
 */
export function findById(
  components: DiscoveredComponent[],
  componentId: string,
): DiscoveredComponent | undefined {
  return components.find((c) => c.manifest.componentId === componentId);
}

/** Tiny formatter used by `mfg components list` (kept here so callers can reuse). */
export function summarize(c: DiscoveredComponent): string {
  const m: ComponentManifest = c.manifest;
  const sentinel = m.appliesWhen.sentinel ? " [sentinel]" : "";
  return `${m.componentId} v${m.version}  ${m.capability} → ${m.provider}${sentinel}`;
}
