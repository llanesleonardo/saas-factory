/**
 * Pure validator for `ComponentManifest` shapes.
 *
 * Used by:
 *   • `component-registry.ts` — refuse to register a malformed manifest
 *   • Unit tests — assert that the shipped adapters declare what we expect
 *
 * Validation is deliberately strict (typeof + enum-style checks) so a typo in
 * a manifest's `capability` field can't silently degrade the composer's
 * selection logic.
 */

import type {
  AppliesWhen,
  ComponentCapability,
  ComponentManifest,
  DepSpec,
  EnvSpec,
  TemplateFileSpec,
} from "./component-manifest-types.js";

const KNOWN_CAPABILITIES: readonly ComponentCapability[] = [
  "auth",
  "billing",
  "database",
  "storage",
  "email",
  "observability",
  "jobs",
  "ai",
  "search",
  "networking",
  "infra",
] as const;

const KNOWN_TARGETS = ["api", "instance", "root"] as const;
const KNOWN_ENV_SCOPES = ["api", "instance", "both"] as const;
const KNOWN_STRATEGIES = ["replace", "append-if-missing", "skip-if-exists"] as const;

/** Result of a validation pass. `ok=true` ⇒ the input is a fully valid manifest. */
export type ValidationResult =
  | { ok: true; manifest: ComponentManifest }
  | { ok: false; errors: string[] };

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function pushIf(errors: string[], cond: boolean, msg: string): void {
  if (cond) errors.push(msg);
}

function validateAppliesWhen(v: unknown, errors: string[], path: string): AppliesWhen {
  if (!isPlainObject(v)) {
    errors.push(`${path}: expected object`);
    return {};
  }
  const out: AppliesWhen = {};
  if (v.sentinel !== undefined) {
    pushIf(errors, typeof v.sentinel !== "boolean", `${path}.sentinel: expected boolean`);
    out.sentinel = v.sentinel as boolean;
  }
  if (v.fields !== undefined) {
    if (!isPlainObject(v.fields)) {
      errors.push(`${path}.fields: expected object`);
    } else {
      out.fields = v.fields as Record<string, string | number | boolean | string[]>;
    }
  }
  if (v.requirements !== undefined) {
    if (!isPlainObject(v.requirements)) {
      errors.push(`${path}.requirements: expected object`);
    } else {
      for (const [k, val] of Object.entries(v.requirements)) {
        pushIf(errors, typeof val !== "boolean", `${path}.requirements.${k}: expected boolean`);
      }
      out.requirements = v.requirements as Record<string, boolean>;
    }
  }
  return out;
}

function validateFile(v: unknown, errors: string[], path: string): TemplateFileSpec | undefined {
  if (!isPlainObject(v)) {
    errors.push(`${path}: expected object`);
    return undefined;
  }
  pushIf(errors, typeof v.from !== "string", `${path}.from: expected string`);
  pushIf(errors, typeof v.to !== "string", `${path}.to: expected string`);
  pushIf(
    errors,
    typeof v.target !== "string" || !KNOWN_TARGETS.includes(v.target as (typeof KNOWN_TARGETS)[number]),
    `${path}.target: expected one of ${KNOWN_TARGETS.join("|")}`,
  );
  if (v.strategy !== undefined) {
    pushIf(
      errors,
      typeof v.strategy !== "string" ||
        !KNOWN_STRATEGIES.includes(v.strategy as (typeof KNOWN_STRATEGIES)[number]),
      `${path}.strategy: expected one of ${KNOWN_STRATEGIES.join("|")}`,
    );
  }
  if (typeof v.from !== "string" || typeof v.to !== "string") return undefined;
  return {
    from: v.from as string,
    to: v.to as string,
    target: v.target as TemplateFileSpec["target"],
    strategy: (v.strategy as TemplateFileSpec["strategy"]) ?? "replace",
    marker: typeof v.marker === "string" ? (v.marker as string) : undefined,
  };
}

function validateDep(v: unknown, errors: string[], path: string): DepSpec | undefined {
  if (!isPlainObject(v)) {
    errors.push(`${path}: expected object`);
    return undefined;
  }
  pushIf(errors, typeof v.name !== "string", `${path}.name: expected string`);
  pushIf(errors, typeof v.version !== "string", `${path}.version: expected string`);
  pushIf(
    errors,
    typeof v.target !== "string" || !KNOWN_TARGETS.includes(v.target as (typeof KNOWN_TARGETS)[number]),
    `${path}.target: expected one of ${KNOWN_TARGETS.join("|")}`,
  );
  if (v.bucket !== undefined) {
    pushIf(
      errors,
      v.bucket !== "dependencies" && v.bucket !== "devDependencies",
      `${path}.bucket: expected "dependencies" or "devDependencies"`,
    );
  }
  if (typeof v.name !== "string" || typeof v.version !== "string") return undefined;
  return {
    name: v.name as string,
    version: v.version as string,
    target: v.target as DepSpec["target"],
    bucket: (v.bucket as DepSpec["bucket"]) ?? "dependencies",
  };
}

function validateEnv(v: unknown, errors: string[], path: string): EnvSpec | undefined {
  if (!isPlainObject(v)) {
    errors.push(`${path}: expected object`);
    return undefined;
  }
  pushIf(errors, typeof v.key !== "string", `${path}.key: expected string`);
  pushIf(errors, typeof v.required !== "boolean", `${path}.required: expected boolean`);
  pushIf(
    errors,
    typeof v.scope !== "string" ||
      !KNOWN_ENV_SCOPES.includes(v.scope as (typeof KNOWN_ENV_SCOPES)[number]),
    `${path}.scope: expected one of ${KNOWN_ENV_SCOPES.join("|")}`,
  );
  if (typeof v.key !== "string" || typeof v.required !== "boolean") return undefined;
  return {
    key: v.key as string,
    required: v.required as boolean,
    scope: v.scope as EnvSpec["scope"],
    example: typeof v.example === "string" ? (v.example as string) : undefined,
    description: typeof v.description === "string" ? (v.description as string) : undefined,
  };
}

/**
 * Validate an unknown value against `ComponentManifest`.
 *
 * Returns the typed manifest on success, or a list of error messages on
 * failure. Does NOT throw — callers can decide how to react (registry logs +
 * skips; tests assert + fail).
 */
export function validateComponentManifest(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, errors: ["root: expected object"] };
  }

  pushIf(errors, input.schemaVersion !== 1, "schemaVersion: must be 1");
  pushIf(errors, typeof input.componentId !== "string", "componentId: expected string");
  pushIf(errors, typeof input.version !== "string", "version: expected string");
  pushIf(
    errors,
    typeof input.capability !== "string" ||
      !KNOWN_CAPABILITIES.includes(input.capability as ComponentCapability),
    `capability: expected one of ${KNOWN_CAPABILITIES.join("|")}`,
  );
  pushIf(errors, typeof input.provider !== "string", "provider: expected string");
  pushIf(errors, typeof input.description !== "string", "description: expected string");
  pushIf(errors, typeof input.blueprintKey !== "string", "blueprintKey: expected string");

  const appliesWhen = validateAppliesWhen(input.appliesWhen, errors, "appliesWhen");

  if (!Array.isArray(input.files)) {
    errors.push("files: expected array");
  }
  if (!Array.isArray(input.deps)) {
    errors.push("deps: expected array");
  }
  if (!Array.isArray(input.env)) {
    errors.push("env: expected array");
  }

  const files: TemplateFileSpec[] = [];
  if (Array.isArray(input.files)) {
    input.files.forEach((f, i) => {
      const ok = validateFile(f, errors, `files[${i}]`);
      if (ok) files.push(ok);
    });
  }
  const deps: DepSpec[] = [];
  if (Array.isArray(input.deps)) {
    input.deps.forEach((d, i) => {
      const ok = validateDep(d, errors, `deps[${i}]`);
      if (ok) deps.push(ok);
    });
  }
  const env: EnvSpec[] = [];
  if (Array.isArray(input.env)) {
    input.env.forEach((e, i) => {
      const ok = validateEnv(e, errors, `env[${i}]`);
      if (ok) env.push(ok);
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const manifest: ComponentManifest = {
    schemaVersion: 1,
    componentId: input.componentId as string,
    version: input.version as string,
    capability: input.capability as ComponentCapability,
    provider: input.provider as string,
    description: input.description as string,
    blueprintKey: input.blueprintKey as string,
    appliesWhen,
    files,
    deps,
    env,
    notes: typeof input.notes === "string" ? (input.notes as string) : undefined,
  };
  return { ok: true, manifest };
}
