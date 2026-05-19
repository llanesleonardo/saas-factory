/** Audit record for one scaffold pass — real code lives under `apps/`; station copies under `04-scaffold/records/<order-id>/<slug>/` (or `_unscoped`). */

export type ScaffoldMaterialization = {
  /** Clarifies that this JSON is only an audit trail; generated apps are under `apps/`. */
  station_note: string;
  /** Repo-relative roots where materialization wrote code this run. */
  code_roots: {
    apps_instance: string;
    apps_api: string;
  };
  /** Which scaffold modules actually applied (maps to `modulesAppliedIds`). */
  what_ran: {
    frontend_workspace: boolean;
    api_workspace: boolean;
    github_ci_workflows: boolean;
    workspace_merge_root_package: boolean;
  };
  /** Snapshot from stack contract — databases, AI, auth, UI styling intent (deps appear under `apps/` package.jsons). */
  stack_contract_summary: {
    frontend_framework: string;
    frontend_styling?: string;
    backend_runtime: string;
    database: unknown;
    redis: unknown;
    object_storage: unknown;
    ai_integration: unknown;
    auth_system: string;
  };
};

export type ScaffoldRunDoc = {
  schemaVersion: 1;
  kind: "scaffold-run";
  scaffoldAt: string;
  appSlug: string;
  /** Stack IR input used for this materialization. */
  stackContractRelativePath: string;
  /** Where generated app workspaces were written (under repo `apps/`). */
  outputs: {
    instanceRelative: string;
    apiRelative: string;
  };
  /** Optional link to a roadmap epic (e.g. scaffold phase / Phase 2). */
  phase?: {
    id: string;
    /** Human title from order-phases.json when available. */
    title?: string;
    /** Shop order folder id when `--order-id` was passed. */
    orderId?: string;
    /** Explicit `--phase-label` when set. */
    label?: string;
  };
  /** Registry station participation — paths are repo-relative; files govern agents/tools/queues on the line. */
  registryParticipation: {
    assemblyLineRegistryStation: string;
    mirroredRegistryFiles: Record<string, string>;
    canonicalRegistryFiles: Record<string, string>;
  };
  /** Snapshot from `app.stack.json` for audits / UI (technologies). */
  technologies: Record<string, unknown>;
  toolingSnapshot: {
    packageManager: string;
    monorepo: string;
    cicd: string;
    containers: string;
    testing: string;
    apiStyle: string;
  };
  /** Scaffold modules whose versions ran (see scaffold-state.json). */
  modulesAppliedIds: string[];
  /** Reusable SaaS components the composer applied this pass. Empty array is
   *  valid: an app may have all sentinels selected. Sentinel components ARE
   *  included with `sentinel: true` so the audit captures "we considered this
   *  capability and explicitly turned it off". */
  componentVersions?: ScaffoldComponentVersion[];
  /** What this pass materially did vs blueprint — human-audit surface (frontend/API/DB/AI/styling intent). */
  materialization: ScaffoldMaterialization;
};

/** One adapter selection captured in `scaffold-run.json`. */
export type ScaffoldComponentVersion = {
  capability: string;
  componentId: string;
  provider: string;
  version: string;
  sentinel: boolean;
  /** Effect summary; safe to be all-zeros for sentinel components. */
  applied: {
    filesWritten: number;
    filesSkipped: number;
    depsAdded: number;
    depsConflicted: number;
    envAdded: number;
  };
};
