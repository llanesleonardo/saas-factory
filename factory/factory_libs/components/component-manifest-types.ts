/**
 * Types for **reusable SaaS components** (auth, billing, storage, …).
 *
 * Components live as workspace packages under `packages/components/<capability>-<provider>/`.
 * Each component package contains a **`manifest.json`** matching `ComponentManifest`
 * below. The manifest is the *single source of truth* the composer consults at
 * `mfg app scaffold` time to decide:
 *
 *   1. Whether the component applies to a given `app.stack.json` (`appliesWhen`)
 *   2. What deps to merge into the target app (`targetDeps`)
 *   3. What env vars the app must declare (`env`)
 *   4. What template files to copy into the app (`files`)
 *
 * The composer NEVER imports component runtime code. Apps only depend on the
 * contract package (e.g. `@saas-factory/auth`); adapter implementations may be
 * imported by the **templates** that are copied into the app, but the factory
 * itself stays decoupled.
 *
 * Wired from:
 *   • `factory/factory_libs/components/component-registry.ts` (discovery)
 *   • `factory/factory_libs/components/composer.ts`           (selection)
 *   • `factory/03_assembly_lines/04-scaffold/modules/components/mod.ts` (apply)
 */

/**
 * A high-level SaaS capability. Each app picks one provider per capability via
 * the blueprint trees in `factory/00_product_definitions/app_stack/`.
 *
 * Adding a capability here is intentional and rare; once defined, many adapters
 * may share it (auth has jwt-builtin, auth0, clerk, …).
 */
export type ComponentCapability =
  | "auth"
  | "billing"
  | "database"
  | "storage"
  | "email"
  | "observability"
  | "jobs"
  | "ai"
  | "search"
  | "networking"
  | "infra";

/** Output worktree where a copied file lands inside `apps/<slug>/...`. */
export type TemplateTarget =
  | "api" /** apps/<slug>/<slug>-api/ */
  | "instance" /** apps/<slug>/<slug>-instance/ */
  | "root"; /** apps/<slug>/ (shared across api+instance) */

/** Scope of an env var: which sub-workspace needs to see it at runtime. */
export type EnvScope = "api" | "instance" | "both";

/** One file the adapter contributes to the target app. */
export interface TemplateFileSpec {
  /** Path relative to the component package, e.g. `template/api/middleware/jwt-auth.ts`. */
  from: string;
  /** Path relative to the target worktree root (`apps/<slug>/<slug>-<target>/`). */
  to: string;
  /** Which sub-workspace this file goes into. */
  target: TemplateTarget;
  /**
   * `replace` (default): overwrite. `append-if-missing`: append blocks to an
   * existing file only if the marker line is absent. `skip-if-exists`: leave
   * the target alone when something is already there (idempotent re-scaffolds).
   */
  strategy?: "replace" | "append-if-missing" | "skip-if-exists";
  /** Marker line for `append-if-missing` (defaults to a comment with `componentId`). */
  marker?: string;
}

/** One environment variable an adapter requires. */
export interface EnvSpec {
  key: string;
  required: boolean;
  scope: EnvScope;
  /** Default to seed into `.env.example` (never `.env`). */
  example?: string;
  /** Short human description shown in scaffold output and docs. */
  description?: string;
}

/** One npm dependency the adapter needs added to the target's `package.json`. */
export interface DepSpec {
  name: string;
  /** semver range or workspace specifier (`workspace:*`). */
  version: string;
  /** Which sub-workspace gets this dep. */
  target: TemplateTarget;
  /** Bucket: `dependencies` (default) or `devDependencies`. */
  bucket?: "dependencies" | "devDependencies";
}

/**
 * Conditions under which the composer picks this component.
 *
 * Evaluation is a **conjunction** (all clauses must match). At most ONE
 * adapter per capability should match a given blueprint; conflicts are a hard
 * error in `composer.ts` so we surface ambiguity early.
 *
 * The shape mirrors the `*Detail` types from
 * `factory/00_product_definitions/app_stack/blueprint-*-tree.ts`. The composer
 * navigates `blueprint[capabilityDetailKey]` and checks each field.
 */
export interface AppliesWhen {
  /** When true, this manifest is the **sentinel** for "this capability is not in use". */
  sentinel?: boolean;
  /**
   * Dotted-path equality checks against the blueprint detail object
   * (e.g. `{ "identityModel": "email-password" }`). Arrays mean "any of".
   */
  fields?: Record<string, string | number | boolean | string[]>;
  /** Boolean flags from `*Detail.requirements`, e.g. `{ needsAuth: true }`. */
  requirements?: Record<string, boolean>;
}

/** A single registered component (adapter package). */
export interface ComponentManifest {
  schemaVersion: 1;
  componentId: string; /** e.g. `auth-jwt-builtin` */
  version: string;     /** semver — the adapter's own version, not the contract's. */
  capability: ComponentCapability;
  provider: string;    /** e.g. `jwt-builtin`, `auth0`, `none` */
  description: string;
  /**
   * Name of the field on the `SaaSAppBlueprint` that carries this capability's
   * detail (e.g. `"authDetail"`, `"billingDetail"`). The composer uses this to
   * pick the right slice of the blueprint to test `appliesWhen.fields` against.
   */
  blueprintKey: string;
  appliesWhen: AppliesWhen;
  /** Files this adapter contributes (may be empty for sentinel adapters). */
  files: TemplateFileSpec[];
  /** Deps to merge into target package.jsons (may be empty). */
  deps: DepSpec[];
  /** Env vars to register in `.env.example` (may be empty). */
  env: EnvSpec[];
  /** Free-form notes shown when listing components (optional). */
  notes?: string;
}

/**
 * What a discovered component looks like in memory once `component-registry`
 * has loaded its manifest from disk and noted *where it came from*.
 */
export interface DiscoveredComponent {
  manifest: ComponentManifest;
  /** Absolute path to the component package folder. */
  packageRoot: string;
  /** Repo-relative path to the manifest, for diagnostics + traceability. */
  manifestRelPath: string;
}
