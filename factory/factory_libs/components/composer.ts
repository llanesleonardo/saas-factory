/**
 * Pure composer: turn an `app.stack.json` blueprint + a set of discovered
 * components into a `ComponentPlan` describing **which adapter wins per
 * capability** and **which files/deps/env entries to apply**.
 *
 * Pure means: no fs, no process, no random. Caller provides the inputs; we
 * return data. The scaffold module (`modules/components/mod.ts`) is the only
 * place that turns this plan into actual writes.
 *
 * Selection algorithm (per capability present in the registry):
 *
 *   1. Read `blueprint[manifest.blueprintKey]` for each candidate manifest.
 *   2. Evaluate `appliesWhen` (sentinel | fields | requirements):
 *        – `sentinel: true`             ⇒ matches when the detail is undefined
 *                                          OR `requirements.needsX` says the
 *                                          capability is off (e.g. `needsAuth=false`).
 *        – `fields: { key: value|... }` ⇒ all clauses must match the detail;
 *                                          arrays are "any of".
 *        – `requirements: { k: bool }`  ⇒ all clauses must match `detail.requirements`.
 *   3. Collect candidates that match. Exactly one match → selected.
 *   4. Zero matches → **error** (no adapter for a capability the registry knows
 *      about), unless the registry also has a sentinel adapter for that
 *      capability and the blueprint says the capability is off, in which case
 *      the sentinel is selected (handled in step 2 by allowing the sentinel
 *      to match a "missing detail").
 *   5. Two or more matches → **error** (ambiguous; manifests must be exclusive).
 *
 * Why surface ambiguity / missing matches as errors: the scaffold should not
 * silently drop a capability the blueprint asked for, and shouldn't roll dice
 * when two adapters claim the same blueprint.
 */

import type {
  AppliesWhen,
  ComponentCapability,
  DiscoveredComponent,
  TemplateFileSpec,
  DepSpec,
  EnvSpec,
} from "./component-manifest-types.js";
import {
  capabilitiesPresent,
  componentsByCapability,
} from "./component-registry.js";

/** Stripped-down blueprint shape the composer needs. */
export interface ComposerBlueprint {
  appSlug: string;
  /** Each `*Detail` slot is read by `blueprintKey` lookup. */
  [key: string]: unknown;
}

/** What the composer picked for one capability. */
export interface ComponentSelection {
  capability: ComponentCapability;
  componentId: string;
  version: string;
  provider: string;
  /** True when the chosen adapter is a sentinel (`auth-none`, …). */
  sentinel: boolean;
  /** The adapter package this selection came from. */
  packageRoot: string;
  manifestRelPath: string;
}

/** The full set of decisions for a scaffold pass, ready to be applied. */
export interface ComponentPlan {
  appSlug: string;
  selections: ComponentSelection[];
  /** Flat lists, ordered: caller applies in array order. */
  files: TemplateFileSpec[];
  deps: DepSpec[];
  env: EnvSpec[];
  /** Diagnostics worth surfacing to the user (e.g. "capability X has no candidates"). */
  notes: string[];
}

/** Composer failure carries a list of human-readable reasons. */
export class ComposerError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(`composer: ${reasons.length} problem(s):\n  - ${reasons.join("\n  - ")}`);
    this.reasons = reasons;
  }
}

function getByPath(root: unknown, dotted: string): unknown {
  if (root === null || typeof root !== "object") return undefined;
  const parts = dotted.split(".");
  let cur: unknown = root;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function matchesFields(
  detail: unknown,
  fields: NonNullable<AppliesWhen["fields"]>,
): boolean {
  for (const [key, expected] of Object.entries(fields)) {
    const actual = getByPath(detail, key);
    if (Array.isArray(expected)) {
      if (typeof actual !== "string" || !expected.includes(actual as string)) {
        return false;
      }
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function matchesRequirements(
  detail: unknown,
  reqs: NonNullable<AppliesWhen["requirements"]>,
): boolean {
  const obj =
    detail && typeof detail === "object"
      ? (detail as Record<string, unknown>).requirements
      : undefined;
  if (!obj || typeof obj !== "object") return false;
  const r = obj as Record<string, unknown>;
  for (const [key, expected] of Object.entries(reqs)) {
    if (r[key] !== expected) return false;
  }
  return true;
}

/**
 * True when this manifest's `appliesWhen` matches the given blueprint slice.
 *
 * Sentinel rules are explicit so a "capability is off" branch never needs to
 * encode the negative case in `fields` / `requirements`:
 *   • If the detail is **absent** and the manifest is a sentinel → match.
 *   • If the detail exists but `detail.requirements.needsAuth === false`
 *     (or the analogous `needsX`) and the manifest is a sentinel → match.
 *   • Otherwise the sentinel does not match (a real provider should win).
 */
export function matchesBlueprint(
  blueprint: ComposerBlueprint,
  blueprintKey: string,
  appliesWhen: AppliesWhen,
): boolean {
  const detail = blueprint[blueprintKey];

  if (appliesWhen.sentinel) {
    if (detail === undefined || detail === null) return true;
    // Heuristic: if any `needsX === false` requirement is present, treat the
    // capability as "off" for sentinel purposes.
    if (detail && typeof detail === "object") {
      const reqs = (detail as Record<string, unknown>).requirements;
      if (reqs && typeof reqs === "object") {
        for (const [k, v] of Object.entries(reqs as Record<string, unknown>)) {
          if (k.startsWith("needs") && v === false) return true;
        }
      }
    }
    return false;
  }

  if (detail === undefined || detail === null) return false;

  if (appliesWhen.fields && !matchesFields(detail, appliesWhen.fields)) return false;
  if (
    appliesWhen.requirements &&
    !matchesRequirements(detail, appliesWhen.requirements)
  ) {
    return false;
  }
  return true;
}

/** Internal: pick exactly one component per capability. */
function selectForCapability(
  capability: ComponentCapability,
  candidates: DiscoveredComponent[],
  blueprint: ComposerBlueprint,
  errors: string[],
): ComponentSelection | undefined {
  const matches = candidates.filter((c) =>
    matchesBlueprint(blueprint, c.manifest.blueprintKey, c.manifest.appliesWhen),
  );

  if (matches.length === 0) {
    errors.push(
      `capability "${capability}" has no adapter matching the blueprint (candidates: ${candidates
        .map((c) => c.manifest.componentId)
        .join(", ") || "none"})`,
    );
    return undefined;
  }
  if (matches.length > 1) {
    errors.push(
      `capability "${capability}" matched ${matches.length} adapters: ${matches
        .map((c) => c.manifest.componentId)
        .join(", ")} — manifests must be mutually exclusive`,
    );
    return undefined;
  }
  const picked = matches[0]!;
  return {
    capability,
    componentId: picked.manifest.componentId,
    version: picked.manifest.version,
    provider: picked.manifest.provider,
    sentinel: !!picked.manifest.appliesWhen.sentinel,
    packageRoot: picked.packageRoot,
    manifestRelPath: picked.manifestRelPath,
  };
}

/**
 * Build the full plan for a blueprint.
 *
 * Throws `ComposerError` on any selection failure (ambiguous, no match). The
 * caller can decide to abort the scaffold or fall back to a "no components"
 * path — for now `mfg app scaffold` aborts loudly.
 */
export function buildComponentPlan(
  blueprint: ComposerBlueprint,
  components: DiscoveredComponent[],
): ComponentPlan {
  const errors: string[] = [];
  const notes: string[] = [];
  const selections: ComponentSelection[] = [];

  const caps = capabilitiesPresent(components);
  for (const cap of caps) {
    const candidates = componentsByCapability(components, cap);
    const sel = selectForCapability(cap, candidates, blueprint, errors);
    if (sel) selections.push(sel);
  }

  if (errors.length) throw new ComposerError(errors);

  const files: TemplateFileSpec[] = [];
  const deps: DepSpec[] = [];
  const env: EnvSpec[] = [];
  for (const sel of selections) {
    const m = components.find((c) => c.manifest.componentId === sel.componentId)!.manifest;
    for (const f of m.files) files.push(f);
    for (const d of m.deps) deps.push(d);
    for (const e of m.env) env.push(e);
    if (sel.sentinel) {
      notes.push(`capability "${sel.capability}" → ${sel.componentId} (sentinel; nothing to apply)`);
    } else {
      notes.push(
        `capability "${sel.capability}" → ${sel.componentId} v${sel.version} (${m.files.length} files, ${m.deps.length} deps, ${m.env.length} env)`,
      );
    }
  }

  return {
    appSlug: blueprint.appSlug,
    selections,
    files,
    deps,
    env,
    notes,
  };
}
