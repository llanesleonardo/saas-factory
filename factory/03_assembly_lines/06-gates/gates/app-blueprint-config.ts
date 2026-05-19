/**
 * SaaS app blueprint wizard — terminal-only (OpenClaw-style: banner, boxed intro, arrow-key selects).
 * Covers frontend, backend, DB, Redis, object storage, version-control/Git workflow, tooling, CI/CD.
 *
 * Stack / System IR wizard (writes **`configs/apps/<app>/app.stack.json`**). Primary entrypoint:
 *
 *   npm run mfg -- app stack -- <appSlug>              # interactive → configs/apps/<app>/app.stack.json
 *   npm run mfg -- app stack -- <appSlug> --defaults
 *   npm run mfg -- app stack -- <appSlug> --show
 *   npm run mfg -- app stack -- --from configs/apps/todo/app.stack.json
 *   npm run mfg -- app stack -- --help
 *
 * (Equivalent: `npx tsx factory/03_assembly_lines/06-gates/gates/app-blueprint-config.ts` with the same flags.)
 */
import { confirm, input, select } from "@inquirer/prompts";
import boxen from "boxen";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import pc from "picocolors";
import { fileURLToPath, pathToFileURL } from "node:url";

import { appStackPath, verticalBriefPath } from "../../../factory_libs/paths/app-config-paths.js";
import {
  backendRuntimeToTestKind,
  defaultFrontendDetailForStack,
  isValidAiBlock,
  isValidFrontendDetail,
  mapTestFocusToTooling,
  promptAiIntegration,
  promptFrontendStackTree,
} from "../../../00_product_definitions/app_stack/blueprint-frontend-tree.js";
import type { AiIntegration, FrontendStackDetail } from "../../../00_product_definitions/app_stack/blueprint-frontend-tree.js";
import { promptDatabaseTree } from "../../../00_product_definitions/app_stack/blueprint-database-tree.js";
import type { DatabaseDetail } from "../../../00_product_definitions/app_stack/blueprint-database-tree.js";
import { isValidAiDetail, promptAiTree } from "../../../00_product_definitions/app_stack/blueprint-ai-tree.js";
import type { AiDetail } from "../../../00_product_definitions/app_stack/blueprint-ai-tree.js";
import { promptInfraTree } from "../../../00_product_definitions/app_stack/blueprint-infra-tree.js";
import type { InfraDetail } from "../../../00_product_definitions/app_stack/blueprint-infra-tree.js";
import { isValidAuthDetail, promptAuthTree } from "../../../00_product_definitions/app_stack/blueprint-auth-tree.js";
import type { AuthDetail } from "../../../00_product_definitions/app_stack/blueprint-auth-tree.js";
import { isValidJobsDetail, promptJobsTree } from "../../../00_product_definitions/app_stack/blueprint-jobs-tree.js";
import type { JobsDetail } from "../../../00_product_definitions/app_stack/blueprint-jobs-tree.js";
import { isValidObservabilityDetail, promptObservabilityTree } from "../../../00_product_definitions/app_stack/blueprint-observability-tree.js";
import type { ObservabilityDetail } from "../../../00_product_definitions/app_stack/blueprint-observability-tree.js";
import { isValidNetworkingDetail, promptNetworkingTree } from "../../../00_product_definitions/app_stack/blueprint-networking-tree.js";
import type { NetworkingDetail } from "../../../00_product_definitions/app_stack/blueprint-networking-tree.js";
import { isValidBillingDetail, promptBillingTree } from "../../../00_product_definitions/app_stack/blueprint-billing-tree.js";
import type { BillingDetail } from "../../../00_product_definitions/app_stack/blueprint-billing-tree.js";
import { isValidSearchDetail, promptSearchTree } from "../../../00_product_definitions/app_stack/blueprint-search-tree.js";
import type { SearchDetail } from "../../../00_product_definitions/app_stack/blueprint-search-tree.js";
import { isValidEmailDetail, promptEmailTree } from "../../../00_product_definitions/app_stack/blueprint-email-tree.js";
import type { EmailDetail } from "../../../00_product_definitions/app_stack/blueprint-email-tree.js";
import type { VerticalConfig } from "../../../factory_libs/product/vertical-config-types.js";
import { validateVerticalConfigObject } from "../validation/validate-vertical-config.js";
import { compileProductIrToSystemSuggestions } from "../../../factory_libs/product/product-ir-compiler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

/* ─── Exported schema (schemaVersion 2) ─── */

export type IntegrationMode = "monorepo-integrated" | "http-integrated" | "standalone";

export type FrontendStack =
  | "vite-react-ts"
  | "vite-vue-ts"
  | "vite-solid-ts"
  | "next-ts-fullstack"
  | "nuxt-ts"
  | "sveltekit-ts"
  | "remix-ts"
  | "astro-ts"
  | "angular-ts"
  | "static-html-vanilla";

export type BackendRuntime =
  | "next-api-routes"
  | "nodejs-fastify"
  | "nodejs-express"
  | "nodejs-hono"
  | "nestjs"
  | "python-fastapi"
  | "go-chi-or-stdlib"
  | "rust-axum"
  | "bun-elysia"
  | "edge-worker-only";

export type PrimaryDatabase =
  | "sqlite-file"
  | "postgres"
  | "mysql-mariadb"
  | "mongodb"
  | "turso-libsql"
  | "planetscale-mysql"
  | "neon-postgres"
  | "none";

export type RedisPolicy = "none" | "cache-sessions" | "cache-sessions-queues";

export type ObjectStorageKind = "none" | "local-filesystem" | "s3-compatible" | "gcs" | "azure-blob";

export type VcsPlatform = "github" | "gitlab" | "bitbucket" | "other-self-hosted";

export type BranchingModel = "trunk" | "github-flow" | "gitflow";

export type GitHooksTool = "none" | "husky" | "lefthook";

export type CommitConvention = "none" | "conventional-commits" | "semantic-release-ready";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export type MonorepoTool = "none" | "turborepo" | "nx";

export type ContainerSetup = "none" | "docker-compose-dev" | "docker-compose-prod-sketch";

export type LintFormatStack = "eslint-prettier" | "biome" | "none";

export type ApiStyle = "rest-json" | "trpc" | "graphql" | "grpc-oriented";

export type TestStack = "vitest" | "jest" | "pytest" | "go-test" | "rust-cargo-test" | "minimal";

export type CicdPlatform = "github-actions" | "gitlab-ci" | "circle-ci" | "none-yet";

export type ObservabilitySketch = "none" | "otel-hooks" | "sentry-client-sketch";

export type SaaSAppBlueprint = {
  schemaVersion: 2;
  generatedAt: string;
  appSlug: string;
  integrationMode: IntegrationMode;
  /** Avoid contradictions: integrated fullstack (Next) vs decoupled API server. */
  backendArchitectureMode?: "integrated-fullstack" | "decoupled-api";
  /** Keep “no DB” vs “local dev DB” explicit; prevents leaking defaults. */
  dataMode?: "none" | "mock-only" | "local-dev-db" | "production-db-future";
  /** Rich data-layer capture (separate subsystem). */
  databaseDetail?: DatabaseDetail;
  /** Infra/environment constraints (NAS/cloud/mixed). */
  infraDetail?: InfraDetail;
  /** Single source of truth: API contract layer (frontend consumes; backend implements). */
  apiContract?: "rest" | "graphql" | "trpc" | "hybrid";
  /** Explicit auth system selection (affects data/session expectations). */
  authSystem?: "none" | "session" | "jwt" | "oauth" | "hybrid";
  authDetail?: AuthDetail;
  /** File/media needs drive object storage choice. */
  fileMediaNeeds?: "none" | "basic-uploads" | "media-heavy" | "large-scale-storage";
  frontend: { stack: FrontendStack };
  /** Decision-tree capture (framework, styling, router, …). Scaffold may ignore until templates catch up. */
  frontendDetail?: FrontendStackDetail;
  backend: { runtime: BackendRuntime };
  database: PrimaryDatabase;
  redis: RedisPolicy;
  objectStorage: ObjectStorageKind;
  /** AI capability layer — coarse marker (backwards compatible). */
  ai?: { integration: AiIntegration; notes?: string; usagePattern?: "none" | "chat" | "embeddings" | "agent-workflows" };
  /** AI capability layer — rich capture + requirements (preferred). */
  aiDetail?: AiDetail;
  /** Optional backend detail without breaking existing `backend.runtime`. */
  backendDetail?: { runtime: "node" | "bun" | "deno" | "python" | "go" | "rust" | "edge"; language: "typescript" | "javascript" | "python" | "go" | "rust"; framework: string };
  versionControl: {
    platform: VcsPlatform;
    branching: BranchingModel;
    hooks: GitHooksTool;
    commitConvention: CommitConvention;
  };
  tooling: {
    packageManager: PackageManager;
    monorepo: MonorepoTool;
    containers: ContainerSetup;
    lintFormat: LintFormatStack;
    apiStyle: ApiStyle;
    testing: TestStack;
  };
  cicd: CicdPlatform;
  observability: ObservabilitySketch;
  observabilityDetail?: ObservabilityDetail;
  jobsDetail?: JobsDetail;
  networkingDetail?: NetworkingDetail;
  billingDetail?: BillingDetail;
  searchDetail?: SearchDetail;
  emailDetail?: EmailDetail;
  /** Transparency: where choices came from (preset/user/system). */
  selectionMeta?: {
    mode: "defaults" | "proven" | "resolver" | "advanced";
    sources?: Record<string, "user" | "system" | "preset">;
  };
};

const FRONTEND_OPTS: { value: FrontendStack; label: string }[] = [
  { value: "vite-react-ts", label: "React + TypeScript + Vite (SPA / SSR-ready)" },
  { value: "vite-vue-ts", label: "Vue + TypeScript + Vite" },
  { value: "vite-solid-ts", label: "Solid + TypeScript + Vite" },
  { value: "next-ts-fullstack", label: "Next.js (TypeScript) — full-stack / API routes" },
  { value: "nuxt-ts", label: "Nuxt (TypeScript)" },
  { value: "sveltekit-ts", label: "SvelteKit (TypeScript)" },
  { value: "remix-ts", label: "Remix (TypeScript)" },
  { value: "astro-ts", label: "Astro (TypeScript)" },
  { value: "angular-ts", label: "Angular (TypeScript)" },
  { value: "static-html-vanilla", label: "Static HTML + CSS + vanilla TS (minimal)" },
];

const BACKEND_OPTS: { value: BackendRuntime; label: string }[] = [
  { value: "next-api-routes", label: "Next.js API routes / Route Handlers (same deployable as UI)" },
  { value: "nodejs-fastify", label: "Node.js + Fastify + TypeScript" },
  { value: "nodejs-express", label: "Node.js + Express + TypeScript" },
  { value: "nodejs-hono", label: "Node.js + Hono + TypeScript" },
  { value: "nestjs", label: "NestJS (TypeScript)" },
  { value: "python-fastapi", label: "Python + FastAPI" },
  { value: "go-chi-or-stdlib", label: "Go (chi or net/http)" },
  { value: "rust-axum", label: "Rust + Axum" },
  { value: "bun-elysia", label: "Bun + Elysia (TypeScript)" },
  { value: "edge-worker-only", label: "Edge / worker only — no traditional long-lived API server" },
];

const DATABASE_OPTS: { value: PrimaryDatabase; label: string }[] = [
  { value: "sqlite-file", label: "SQLite (local file — simplest dev)" },
  { value: "postgres", label: "PostgreSQL (self-hosted or any provider)" },
  { value: "mysql-mariadb", label: "MySQL / MariaDB" },
  { value: "mongodb", label: "MongoDB" },
  { value: "turso-libsql", label: "Turso / libSQL" },
  { value: "planetscale-mysql", label: "PlanetScale (MySQL-compatible)" },
  { value: "neon-postgres", label: "Neon (PostgreSQL serverless)" },
  { value: "none", label: "None — static / external API only" },
];

const REDIS_OPTS: { value: RedisPolicy; label: string }[] = [
  { value: "none", label: "No Redis" },
  { value: "cache-sessions", label: "Redis — cache + sessions" },
  { value: "cache-sessions-queues", label: "Redis — cache + sessions + queues (jobs)" },
];

const STORAGE_OPTS: { value: ObjectStorageKind; label: string }[] = [
  { value: "none", label: "No object storage (metadata / DB only)" },
  { value: "local-filesystem", label: "Local disk (dev uploads — document prod migration)" },
  { value: "s3-compatible", label: "S3-compatible (AWS S3, R2, MinIO…)" },
  { value: "gcs", label: "Google Cloud Storage" },
  { value: "azure-blob", label: "Azure Blob Storage" },
];

const VCS_PLATFORM_OPTS: { value: VcsPlatform; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "bitbucket", label: "Bitbucket" },
  { value: "other-self-hosted", label: "Other / self-hosted Git" },
];

const BRANCHING_OPTS: { value: BranchingModel; label: string }[] = [
  { value: "trunk", label: "Trunk-based (short-lived branches)" },
  { value: "github-flow", label: "GitHub Flow (feature branches → main)" },
  { value: "gitflow", label: "Gitflow (develop / release / hotfix)" },
];

const HOOKS_OPTS: { value: GitHooksTool; label: string }[] = [
  { value: "none", label: "No Git hooks tooling" },
  { value: "husky", label: "Husky (+ lint-staged typical)" },
  { value: "lefthook", label: "Lefthook" },
];

const COMMIT_OPTS: { value: CommitConvention; label: string }[] = [
  { value: "none", label: "No enforced commit convention" },
  { value: "conventional-commits", label: "Conventional Commits (Angular style)" },
  { value: "semantic-release-ready", label: "Conventional + semantic-release / changelog automation (outline)" },
];

const PKG_OPTS: { value: PackageManager; label: string }[] = [
  { value: "npm", label: "npm" },
  { value: "pnpm", label: "pnpm (recommended for monorepos)" },
  { value: "yarn", label: "Yarn (Berry or Classic)" },
  { value: "bun", label: "bun" },
];

const MONOREPO_OPTS: { value: MonorepoTool; label: string }[] = [
  { value: "none", label: "Single package / no workspace orchestrator" },
  { value: "turborepo", label: "Turborepo" },
  { value: "nx", label: "Nx" },
];

const CONTAINER_VALID: readonly ContainerSetup[] = ["none", "docker-compose-dev", "docker-compose-prod-sketch"];

const LINT_OPTS: { value: LintFormatStack; label: string }[] = [
  { value: "eslint-prettier", label: "ESLint + Prettier" },
  { value: "biome", label: "Biome (lint + format)" },
  { value: "none", label: "None / add later" },
];

const API_OPTS: { value: ApiStyle; label: string }[] = [
  { value: "rest-json", label: "REST + JSON" },
  { value: "trpc", label: "tRPC (TypeScript end-to-end)" },
  { value: "graphql", label: "GraphQL" },
  { value: "grpc-oriented", label: "gRPC-oriented / protobuf (service boundaries)" },
];

const TEST_OPTS: { value: TestStack; label: string }[] = [
  { value: "vitest", label: "Vitest (JS/TS)" },
  { value: "jest", label: "Jest (JS/TS)" },
  { value: "pytest", label: "pytest (Python)" },
  { value: "go-test", label: "go test" },
  { value: "rust-cargo-test", label: "cargo test" },
  { value: "minimal", label: "Minimal — add framework later" },
];

const CICD_OPTS: { value: CicdPlatform; label: string }[] = [
  { value: "github-actions", label: "GitHub Actions" },
  { value: "gitlab-ci", label: "GitLab CI/CD" },
  { value: "circle-ci", label: "CircleCI" },
  { value: "none-yet", label: "None yet — manual CI later" },
];

const OBS_OPTS: { value: ObservabilitySketch; label: string }[] = [
  { value: "none", label: "None in scaffold" },
  { value: "otel-hooks", label: "OpenTelemetry hooks / placeholders" },
  { value: "sentry-client-sketch", label: "Sentry SDK sketch (client + server outline)" },
];

const INTEGRATION_OPTS: { value: IntegrationMode; label: string }[] = [
  { value: "monorepo-integrated", label: "Monorepo-integrated — workspace packages + shared code (see ARCHITECTURE.md)" },
  { value: "http-integrated", label: "HTTP-integrated — calls core SaaS over HTTPS + env URLs" },
  { value: "standalone", label: "Standalone — minimal coupling; own deploy lifecycle" },
];

function printBanner(): void {
  const ascii = [
    " ███████╗ █████╗  █████╗ ███████╗     █████╗ ██████╗ ██████╗ ",
    " ██╔════╝██╔══██╗██╔══██╗██╔════╝    ██╔══██╗██╔══██╗██╔══██╗",
    " ███████╗███████║███████║███████╗    ███████║██████╔╝██║  ██║",
    " ╚════██║██╔══██║██╔══██║╚════██║    ██╔══██║██╔═══╝ ██║  ██║",
    " ███████║██║  ██║██║  ██║███████║    ██║  ██║██║     ██████╔╝",
    " ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝     ╚═════╝ ",
  ].join("\n");
  console.log(pc.red(ascii));
  console.log(
    pc.red(
      boxen(pc.bold(" New SaaS app — blueprint wizard ") + "\n" + pc.dim("SaaS Factory"), {
        padding: 1,
        margin: { top: 0, bottom: 1 },
        borderStyle: "double",
        borderColor: "red",
      }),
    ),
  );
}

/** First non-flag argv token (skips --from/--out values). */
function extractAppSlug(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--from" || a === "--out") {
      i++;
      continue;
    }
    if (a === "--help" || a === "-h" || a === "--defaults" || a === "--show" || a === "--") continue;
    if (a.startsWith("--")) continue;
    return a.trim();
  }
  return undefined;
}

function printIntroBox(outRel: string): void {
  const body = [
    pc.bold("Creates a portable blueprint JSON — no frameworks installed by this command."),
    "Use it with a future scaffold, scripts, or @agents (architect / builder / tooling / dev).",
    "",
    "Default output → " + pc.cyan(outRel),
    "",
    pc.dim("Beta — review values before generating repos or CI."),
  ].join("\n");
  console.log(
    boxen(body, {
      title: pc.yellow("Before you start"),
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "single",
      borderColor: "yellow",
    }),
  );
}

function printHelp(): void {
  console.log(`mfg app stack — writes configs/apps/<app>/app.stack.json (stack + tooling).

Required: **app slug** (first argument), e.g. todo → configs/apps/todo/app.stack.json

Examples:
  npm run mfg -- app stack -- todo
  npm run mfg -- app stack -- todo --defaults
  npm run mfg -- app stack -- todo --show
  npm run mfg -- app stack -- electrician --defaults

Options:
  --out <path>     Override output path (still pass app slug for interactive defaults)
  --defaults       Non-interactive: write default stack template for this app
  --show           Print existing stack file for this app (or use --out <path> alone)
  --from <path>    Validate + print JSON (no app slug required)
  --help
`);
}

function defaultBlueprint(appSlug: string): SaaSAppBlueprint {
  const feStack: FrontendStack = "vite-react-ts";
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    appSlug,
    integrationMode: "monorepo-integrated",
    backendArchitectureMode: "decoupled-api",
    dataMode: "local-dev-db",
    apiContract: "rest",
    authSystem: "none",
    fileMediaNeeds: "none",
    infraDetail: { storageTopology: "local-disk" },
    frontend: { stack: feStack },
    frontendDetail: defaultFrontendDetailForStack(feStack),
    backend: { runtime: "nodejs-fastify" },
    database: "postgres",
    redis: "none",
    objectStorage: "none",
    ai: { integration: "none", usagePattern: "none" },
    selectionMeta: { mode: "defaults", sources: { "*": "system" } },
    versionControl: {
      platform: "github",
      branching: "github-flow",
      hooks: "husky",
      commitConvention: "conventional-commits",
    },
    tooling: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      containers: "none",
      lintFormat: "eslint-prettier",
      apiStyle: "rest-json",
      testing: "vitest",
    },
    cicd: "github-actions",
    observability: "none",
    networkingDetail: {
      apiExposure: "external-public",
      tls: "at-edge",
      cdn: "static-only",
      waf: "basic",
      rateLimiting: "basic",
      webhooks: "none",
      corsPolicy: "allowlist",
      internalApi: { enabled: false },
      requirements: {
        needsTls: true,
        needsCdn: true,
        needsWaf: true,
        needsRateLimiting: true,
        needsWebhooks: false,
        needsCorsPolicy: true,
        exposesExternalApis: true,
      },
    },
  };
}

function isValidSlug(s: string): boolean {
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(s);
}

export function isValidBlueprint(x: unknown): x is SaaSAppBlueprint {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (o.schemaVersion !== 2) return false;
  if (typeof o.generatedAt !== "string" || typeof o.appSlug !== "string") return false;
  const fe = FRONTEND_OPTS.map((c) => c.value);
  const be = BACKEND_OPTS.map((c) => c.value);
  const db = DATABASE_OPTS.map((c) => c.value);
  const rd = REDIS_OPTS.map((c) => c.value);
  const st = STORAGE_OPTS.map((c) => c.value);
  const im = INTEGRATION_OPTS.map((c) => c.value);
  const vp = VCS_PLATFORM_OPTS.map((c) => c.value);
  const br = BRANCHING_OPTS.map((c) => c.value);
  const hk = HOOKS_OPTS.map((c) => c.value);
  const cm = COMMIT_OPTS.map((c) => c.value);
  const pm = PKG_OPTS.map((c) => c.value);
  const mo = MONOREPO_OPTS.map((c) => c.value);
  const ct = [...CONTAINER_VALID];
  const lf = LINT_OPTS.map((c) => c.value);
  const ap = API_OPTS.map((c) => c.value);
  const ts = TEST_OPTS.map((c) => c.value);
  const ci = CICD_OPTS.map((c) => c.value);
  const ob = OBS_OPTS.map((c) => c.value);

  const feObj = o.frontend as Record<string, unknown> | undefined;
  const beObj = o.backend as Record<string, unknown> | undefined;
  const vc = o.versionControl as Record<string, unknown> | undefined;
  const tl = o.tooling as Record<string, unknown> | undefined;

  return (
    im.includes(o.integrationMode as IntegrationMode) &&
    feObj !== undefined &&
    fe.includes(feObj.stack as FrontendStack) &&
    beObj !== undefined &&
    be.includes(beObj.runtime as BackendRuntime) &&
    db.includes(o.database as PrimaryDatabase) &&
    rd.includes(o.redis as RedisPolicy) &&
    st.includes(o.objectStorage as ObjectStorageKind) &&
    vc !== undefined &&
    vp.includes(vc.platform as VcsPlatform) &&
    br.includes(vc.branching as BranchingModel) &&
    hk.includes(vc.hooks as GitHooksTool) &&
    cm.includes(vc.commitConvention as CommitConvention) &&
    tl !== undefined &&
    pm.includes(tl.packageManager as PackageManager) &&
    mo.includes(tl.monorepo as MonorepoTool) &&
    ct.includes(tl.containers as ContainerSetup) &&
    lf.includes(tl.lintFormat as LintFormatStack) &&
    ap.includes(tl.apiStyle as ApiStyle) &&
    ts.includes(tl.testing as TestStack) &&
    ci.includes(o.cicd as CicdPlatform) &&
    ob.includes(o.observability as ObservabilitySketch) &&
    (o.frontendDetail === undefined || isValidFrontendDetail(o.frontendDetail)) &&
    (o.ai === undefined || isValidAiBlock(o.ai)) &&
    (o.aiDetail === undefined || isValidAiDetail(o.aiDetail)) &&
    (o.authDetail === undefined || isValidAuthDetail(o.authDetail)) &&
    (o.jobsDetail === undefined || isValidJobsDetail(o.jobsDetail)) &&
    (o.observabilityDetail === undefined || isValidObservabilityDetail(o.observabilityDetail)) &&
    (o.networkingDetail === undefined || isValidNetworkingDetail(o.networkingDetail)) &&
    (o.billingDetail === undefined || isValidBillingDetail(o.billingDetail)) &&
    (o.searchDetail === undefined || isValidSearchDetail(o.searchDetail)) &&
    (o.emailDetail === undefined || isValidEmailDetail(o.emailDetail))
  );
}

/** Load and validate a blueprint JSON file (used by `mfg app scaffold`). */
export async function loadBlueprintFromPath(absPath: string): Promise<SaaSAppBlueprint> {
  const raw = await fs.readFile(absPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isValidBlueprint(parsed)) {
    throw new Error(`Invalid SaaS blueprint (schemaVersion 2 expected): ${absPath}`);
  }
  return parsed;
}

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

function section(title: string): void {
  console.log(pc.bold(pc.cyan(`\n── ${title} ──`)));
}

async function interactiveManual(outRel: string, appSlugDefault: string): Promise<SaaSAppBlueprint> {
  section("Identity & integration");
  let appSlug = await input({
    message: "App slug (kebab-case; folders become apps/<slug>/<slug>-instance + apps/<slug>/<slug>-api)",
    default: appSlugDefault,
    validate: (v) => (isValidSlug(v.trim()) ? true : "Use lowercase letters, numbers, single hyphens only."),
  });
  appSlug = appSlug.trim();
  const integrationMode = await pick("How this app relates to shared SaaS / monorepo", INTEGRATION_OPTS);

  section("Frontend (decision tree → coarse stack + detail JSON)");
  const { detail: frontendDetail, stack: frontendStack, apiStyle: apiStyleFromFrontend } =
    await promptFrontendStackTree({ askDepth: true });
  console.log(
    pc.dim(
      `Derived scaffold key: ${pc.cyan(frontendStack)} (see frontendDetail in app.stack.json for full choices).`,
    ),
  );

  // API contract must be a single source of truth (frontend consumes, backend implements).
  const apiContract: "rest" | "graphql" | "trpc" | "hybrid" = (() => {
    if (frontendDetail.transport === "graphql") return "graphql";
    if (frontendDetail.transport === "trpc") return "trpc";
    return "rest";
  })();

  // Prevent “integrated fullstack” vs “decoupled API” contradictions.
  const backendArchitectureMode: "integrated-fullstack" | "decoupled-api" =
    frontendStack === "next-ts-fullstack"
      ? "integrated-fullstack"
      : await pick("Backend architecture mode", [
          { value: "decoupled-api", label: "Decoupled API server (Fastify/Express/Nest/Hono…)" },
          { value: "integrated-fullstack", label: "Integrated full-stack (Next.js API routes/handlers)" },
        ] as const);

  section("Backend");
  let backendRuntime: BackendRuntime;
  if (frontendStack === "next-ts-fullstack") {
    console.log(pc.yellow("\nNext.js full-stack selected — backend uses Route Handlers / API routes in the same app.\n"));
    backendRuntime = "next-api-routes";
  } else {
    backendRuntime =
      backendArchitectureMode === "integrated-fullstack"
        ? "next-api-routes"
        : await pick("Backend runtime / API server framework", BACKEND_OPTS);
    if (backendRuntime === "next-api-routes") {
      console.log(pc.yellow("\n`next-api-routes` pairs with Next fullstack — switching to Fastify for split SPA + API.\n"));
      backendRuntime = "nodejs-fastify";
    }
  }

  const testing = mapTestFocusToTooling(
    frontendDetail.unitTesting,
    backendRuntimeToTestKind(backendRuntime),
  );

  const backendDetail: SaaSAppBlueprint["backendDetail"] = (() => {
    if (backendRuntime === "next-api-routes") return { runtime: "node", language: "typescript", framework: "next-api-routes" };
    if (backendRuntime === "nodejs-fastify") return { runtime: "node", language: "typescript", framework: "fastify" };
    if (backendRuntime === "nodejs-express") return { runtime: "node", language: "typescript", framework: "express" };
    if (backendRuntime === "nodejs-hono") return { runtime: "node", language: "typescript", framework: "hono" };
    if (backendRuntime === "nestjs") return { runtime: "node", language: "typescript", framework: "nestjs" };
    if (backendRuntime === "bun-elysia") return { runtime: "bun", language: "typescript", framework: "elysia" };
    if (backendRuntime === "python-fastapi") return { runtime: "python", language: "python", framework: "fastapi" };
    if (backendRuntime === "go-chi-or-stdlib") return { runtime: "go", language: "go", framework: "chi/net-http" };
    if (backendRuntime === "rust-axum") return { runtime: "rust", language: "rust", framework: "axum" };
    return { runtime: "edge", language: "javascript", framework: "edge-worker-only" };
  })();

  section("Authentication system");
  const authTree = await promptAuthTree({ depth: "advanced" });
  const authDetail = authTree.authDetail;
  const authSystem: SaaSAppBlueprint["authSystem"] =
    !authDetail
      ? "none"
      : authDetail.identityModel === "email-password"
        ? "session"
        : authDetail.identityModel === "oauth-only"
          ? "oauth"
          : authDetail.identityModel === "hybrid-email-oauth" || authDetail.identityModel === "enterprise-sso-saml-oidc"
            ? "hybrid"
            : "jwt";

  section("Infra / environment");
  const { infraDetail } = await promptInfraTree({ depth: "advanced" });

  section("Data layer");
  const dbPick = await promptDatabaseTree({ depth: "advanced" });
  const dataMode = dbPick.dataMode;
  const databaseDetail = dbPick.databaseDetail;
  const database = dbPick.primaryDatabase;
  const redis = dbPick.redis;

  section("Files / media");
  const fileMediaNeeds = await pick("File/media needs", [
    { value: "none", label: "None" },
    { value: "basic-uploads", label: "Basic uploads" },
    { value: "media-heavy", label: "Media-heavy app" },
    { value: "large-scale-storage", label: "Large-scale storage system" },
  ] as const);

  const storageChoices = STORAGE_OPTS.filter((c) => {
    if (fileMediaNeeds === "none") return c.value === "none";
    if (infraDetail.storageTopology === "cloud-object-storage") return c.value !== "local-filesystem";
    return true;
  });
  const objectStorage =
    fileMediaNeeds === "none" ? ("none" as const) : await pick("Object / blob storage", storageChoices);

  section("AI (capability layer → emits requirements)");
  const aiTree = await promptAiTree({ depth: "advanced" });
  const aiDetail = aiTree.aiDetail;
  // Keep the coarse `ai` block for compatibility (maps to provider choice).
  const ai: { integration: AiIntegration; notes?: string; usagePattern?: "none" | "chat" | "embeddings" | "agent-workflows" } =
    !aiDetail
      ? { integration: "none", usagePattern: "none" }
      : {
          integration:
            aiDetail.provider === "anthropic"
              ? "anthropic-sketch"
              : aiDetail.provider === "openai-compatible" || aiDetail.provider === "azure-openai"
                ? "openai-http-sketch"
                : aiDetail.provider === "local-ollama" || aiDetail.provider === "self-hosted-vllm"
                  ? "provider-agnostic-placeholder"
                  : "provider-agnostic-placeholder",
          usagePattern:
            aiDetail.capability === "embeddings-search" || aiDetail.capability === "rag"
              ? "embeddings"
              : aiDetail.capability === "agent-workflows"
                ? "agent-workflows"
                : aiDetail.usageMode === "none"
                  ? "none"
                  : "chat",
        };

  section("Version control & Git workflow");
  const platform = await pick("Git hosting", VCS_PLATFORM_OPTS);
  const branching = await pick("Branching model", BRANCHING_OPTS);
  const hooks = await pick("Git hooks tooling", HOOKS_OPTS);
  const commitConvention = await pick("Commit message convention", COMMIT_OPTS);

  section("Tooling & scripts (API style + tests come from the frontend tree + backend runtime)");
  const packageManager = frontendDetail.packageManager;
  const monorepo = await pick("Monorepo orchestrator", MONOREPO_OPTS);
  const lintFormat = await pick("Lint & format", LINT_OPTS);

  section("Delivery & observability");
  const cicd = await pick("CI/CD platform", CICD_OPTS);
  const obsTree = await promptObservabilityTree({ depth: "advanced" });
  const observabilityDetail = obsTree.observabilityDetail;
  let observability: ObservabilitySketch =
    observabilityDetail.tracing !== "none" ? "otel-hooks" : observabilityDetail.errorTracking !== "none" ? "sentry-client-sketch" : "none";
  if (
    (databaseDetail.scalingIntent === "high-scale-system" || databaseDetail.reliability === "high-availability") &&
    observability === "none"
  ) {
    observability = "otel-hooks";
  }

  section("Jobs / queues");
  const jobsRequired = Boolean(aiDetail?.requirements.needsJobQueue || aiDetail?.requirements.needsWorkerSystem);
  const jobsTree = await promptJobsTree({ depth: "advanced", required: jobsRequired });
  const jobsDetail = jobsTree.jobsDetail;

  section("Networking / API gateway");
  const networkingTree = await promptNetworkingTree({ depth: "advanced" });
  const networkingDetail = networkingTree.networkingDetail;

  section("Search (separate from AI)");
  const searchTree = await promptSearchTree({ depth: "advanced" });
  const searchDetail = searchTree.searchDetail;

  const saasSignals = Boolean(authDetail?.requirements.needsMultiTenantDB);

  section("Billing / payments");
  const billingTree = saasSignals ? await promptBillingTree({ depth: "advanced", defaultEnabled: true }) : await promptBillingTree({ depth: "advanced", defaultEnabled: false });
  const billingDetail = billingTree.billingDetail;

  section("Email / comms");
  const emailDefaultEnabled = Boolean(authDetail?.requirements.needsEmailSystem || billingDetail?.requirements.needsPayments);
  const emailTree = await promptEmailTree({ depth: "advanced", defaultEnabled: emailDefaultEnabled });
  const emailDetail = emailTree.emailDetail;

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    appSlug,
    integrationMode,
    backendArchitectureMode,
    dataMode,
    databaseDetail,
    infraDetail,
    apiContract,
    authSystem,
    authDetail,
    fileMediaNeeds,
    frontend: { stack: frontendStack },
    frontendDetail,
    backend: { runtime: backendRuntime },
    backendDetail,
    database,
    redis,
    objectStorage,
    ai,
    aiDetail,
    jobsDetail,
    networkingDetail,
    billingDetail,
    searchDetail,
    emailDetail,
    selectionMeta: { mode: "advanced" },
    versionControl: {
      platform,
      branching,
      hooks,
      commitConvention,
    },
    tooling: {
      packageManager,
      monorepo,
      containers: "none",
      lintFormat,
      apiStyle: apiStyleFromFrontend,
      testing,
    },
    cicd,
    observability,
    observabilityDetail,
  };
}

async function interactive(outRel: string, appSlug: string): Promise<SaaSAppBlueprint> {
  printBanner();
  printIntroBox(outRel);

  const ok = await confirm({
    message: pc.red("Continue with stack setup?"),
    default: true,
  });
  if (!ok) throw new Error("Aborted.");

  const mode = await select({
    message: pc.bold("Onboarding mode"),
    choices: [
      {
        name: "Proven stacks — pick an already-tested pattern (fastest)",
        value: "proven" as const,
      },
      {
        name: "Resolver-based flow — ≤10 intent questions, stack inferred (recommended)",
        value: "resolver" as const,
      },
      {
        name: "Advanced — full decision trees (frontend → backend → data → AI …)",
        value: "advanced" as const,
      },
    ],
  });

  if (mode === "proven") {
    const presets: { id: string; name: string; build: () => SaaSAppBlueprint }[] = [
      {
        id: "startup-spa",
        name: "Startup SaaS (React SPA + Fastify + Postgres)",
        build: () => ({
          ...defaultBlueprint(appSlug),
          infraDetail: { storageTopology: "mixed" },
          authDetail: {
            identityModel: "hybrid-email-oauth",
            sessionModel: "stateless-jwt",
            multiTenancy: "workspace-based",
            securityFeatures: ["email-verification", "rbac"],
            requirements: {
              needsAuth: true,
              needsSessionStore: false,
              needsEmailSystem: true,
              needsAuditLog: false,
              needsMultiTenantDB: true,
            },
          },
          billingDetail: {
            enabled: true,
            provider: "stripe",
            mode: "subscriptions",
            webhookIngestion: "required",
            requirements: {
              needsPayments: true,
              needsBillingWebhooks: true,
              needsUsageMetering: false,
              needsSubscriptions: true,
              needsJobQueue: true,
              needsAuditLog: true,
            },
          },
          emailDetail: {
            enabled: true,
            provider: "resend",
            templates: "code-templates",
            delivery: "async-queue",
            requirements: { needsEmailSystem: true, needsTemplates: true, needsJobQueue: true },
          },
          searchDetail: {
            enabled: false,
            mode: "keyword",
            engine: "postgres-fts",
            indexing: "on-write",
            requirements: { needsSearch: false, needsIndexerJobs: false, needsSearchService: false },
          },
          jobsDetail: {
            systemType: "none",
            patterns: ["background-jobs"],
            reliability: "best-effort",
            requirements: { needsJobQueue: false, needsWorkerSystem: false, needsRetrySystem: false, needsEventBus: false },
          },
          observabilityDetail: {
            logging: "structured-json",
            metrics: "basic",
            tracing: "opentelemetry",
            errorTracking: "sentry",
            piiHandling: "redaction-enabled",
            requirements: { needsTracing: true, needsMetrics: true, needsErrorTracking: true, needsPIIRedaction: true },
          },
          aiDetail: {
            usageMode: "none",
            capability: "chat-completions",
            providerType: "cloud-hosted",
            provider: "openai-compatible",
            dataNeeds: { memoryArchitecture: "no-memory", retrieval: "none", audit: "none" },
            vectorLayer: "none",
            orchestration: "single-prompt",
            tooling: "none",
            latencyNeed: "normal",
            throughputNeed: "normal",
            privacyLevel: "standard",
            costSensitivity: "medium",
            requirements: {
              needsVectorSearch: false,
              needsPersistentMemory: false,
              needsEventTraceStorage: false,
              needsStreaming: false,
              needsLowLatency: false,
              needsHighThroughput: false,
              costSensitivity: "medium",
              privacyLevel: "standard",
              needsDataIsolation: false,
              needsOnPremSupport: false,
              needsToolCalling: false,
              needsExternalAPIs: false,
              needsJobQueue: false,
              needsEventBus: false,
              needsWorkerSystem: false,
              needsStreamingTransport: false,
            },
          },
          selectionMeta: { mode: "proven", sources: { "*": "preset" } },
          integrationMode: "standalone",
          backendArchitectureMode: "decoupled-api",
          dataMode: "production-db-future",
          databaseDetail: {
            persistenceMode: "full",
            dataRoles: ["user-business", "cache-only"],
            model: "relational",
            engine: "postgres",
            accessStrategy: "orm",
            ormTool: "prisma",
            migrations: "auto",
            accessPattern: "service-layer",
            consistency: "strong",
            scalingIntent: "production-ready",
            scalingModel: "managed-cloud",
            cacheLayer: "redis",
            redisRole: "cache-layer",
            reliability: "standard",
          },
          frontend: { stack: "vite-react-ts" },
          backend: { runtime: "nodejs-fastify" },
          database: "postgres",
          redis: "cache-sessions",
          objectStorage: "none",
          tooling: { ...defaultBlueprint(appSlug).tooling, apiStyle: "rest-json", testing: "vitest" },
        }),
      },
      {
        id: "next-fullstack",
        name: "Modern SaaS (Next full-stack + API routes + Postgres)",
        build: () => ({
          ...defaultBlueprint(appSlug),
          infraDetail: { storageTopology: "mixed" },
          authDetail: {
            identityModel: "hybrid-email-oauth",
            sessionModel: "stateless-jwt",
            multiTenancy: "workspace-based",
            securityFeatures: ["email-verification", "rbac"],
            requirements: {
              needsAuth: true,
              needsSessionStore: false,
              needsEmailSystem: true,
              needsAuditLog: false,
              needsMultiTenantDB: true,
            },
          },
          billingDetail: {
            enabled: true,
            provider: "stripe",
            mode: "subscriptions",
            webhookIngestion: "required",
            requirements: {
              needsPayments: true,
              needsBillingWebhooks: true,
              needsUsageMetering: false,
              needsSubscriptions: true,
              needsJobQueue: true,
              needsAuditLog: true,
            },
          },
          emailDetail: {
            enabled: true,
            provider: "resend",
            templates: "code-templates",
            delivery: "async-queue",
            requirements: { needsEmailSystem: true, needsTemplates: true, needsJobQueue: true },
          },
          searchDetail: {
            enabled: false,
            mode: "keyword",
            engine: "postgres-fts",
            indexing: "on-write",
            requirements: { needsSearch: false, needsIndexerJobs: false, needsSearchService: false },
          },
          jobsDetail: {
            systemType: "none",
            patterns: ["background-jobs"],
            reliability: "best-effort",
            requirements: { needsJobQueue: false, needsWorkerSystem: false, needsRetrySystem: false, needsEventBus: false },
          },
          observabilityDetail: {
            logging: "structured-json",
            metrics: "basic",
            tracing: "opentelemetry",
            errorTracking: "sentry",
            piiHandling: "redaction-enabled",
            requirements: { needsTracing: true, needsMetrics: true, needsErrorTracking: true, needsPIIRedaction: true },
          },
          aiDetail: {
            usageMode: "none",
            capability: "chat-completions",
            providerType: "cloud-hosted",
            provider: "openai-compatible",
            dataNeeds: { memoryArchitecture: "no-memory", retrieval: "none", audit: "none" },
            vectorLayer: "none",
            orchestration: "single-prompt",
            tooling: "none",
            latencyNeed: "normal",
            throughputNeed: "normal",
            privacyLevel: "standard",
            costSensitivity: "medium",
            requirements: {
              needsVectorSearch: false,
              needsPersistentMemory: false,
              needsEventTraceStorage: false,
              needsStreaming: false,
              needsLowLatency: false,
              needsHighThroughput: false,
              costSensitivity: "medium",
              privacyLevel: "standard",
              needsDataIsolation: false,
              needsOnPremSupport: false,
              needsToolCalling: false,
              needsExternalAPIs: false,
              needsJobQueue: false,
              needsEventBus: false,
              needsWorkerSystem: false,
              needsStreamingTransport: false,
            },
          },
          selectionMeta: { mode: "proven", sources: { "*": "preset" } },
          integrationMode: "standalone",
          backendArchitectureMode: "integrated-fullstack",
          dataMode: "production-db-future",
          databaseDetail: {
            persistenceMode: "full",
            dataRoles: ["user-business"],
            model: "relational",
            engine: "postgres",
            accessStrategy: "orm",
            ormTool: "prisma",
            migrations: "auto",
            accessPattern: "service-layer",
            consistency: "strong",
            scalingIntent: "production-ready",
            scalingModel: "managed-cloud",
            cacheLayer: "none",
            redisRole: "none",
            reliability: "standard",
          },
          frontend: { stack: "next-ts-fullstack" },
          backend: { runtime: "next-api-routes" },
          database: "postgres",
          redis: "none",
          objectStorage: "none",
          tooling: { ...defaultBlueprint(appSlug).tooling, apiStyle: "rest-json", testing: "vitest" },
        }),
      },
      {
        id: "static-plus-api",
        name: "Static marketing + API (Astro + Fastify + Postgres)",
        build: () => ({
          ...defaultBlueprint(appSlug),
          infraDetail: { storageTopology: "cloud-object-storage" },
          authDetail: {
            identityModel: "oauth-only",
            sessionModel: "stateless-jwt",
            multiTenancy: "none",
            securityFeatures: ["rbac"],
            requirements: {
              needsAuth: true,
              needsSessionStore: false,
              needsEmailSystem: false,
              needsAuditLog: false,
              needsMultiTenantDB: false,
            },
          },
          billingDetail: {
            enabled: false,
            provider: "none-yet",
            mode: "none",
            webhookIngestion: "none",
            requirements: {
              needsPayments: false,
              needsBillingWebhooks: false,
              needsUsageMetering: false,
              needsSubscriptions: false,
              needsJobQueue: false,
              needsAuditLog: false,
            },
          },
          emailDetail: {
            enabled: false,
            provider: "none",
            templates: "none",
            delivery: "sync-dev-only",
            requirements: { needsEmailSystem: false, needsTemplates: false, needsJobQueue: false },
          },
          searchDetail: {
            enabled: false,
            mode: "keyword",
            engine: "postgres-fts",
            indexing: "on-write",
            requirements: { needsSearch: false, needsIndexerJobs: false, needsSearchService: false },
          },
          jobsDetail: {
            systemType: "none",
            patterns: ["background-jobs"],
            reliability: "best-effort",
            requirements: { needsJobQueue: false, needsWorkerSystem: false, needsRetrySystem: false, needsEventBus: false },
          },
          observabilityDetail: {
            logging: "structured-json",
            metrics: "basic",
            tracing: "opentelemetry",
            errorTracking: "sentry",
            piiHandling: "redaction-enabled",
            requirements: { needsTracing: true, needsMetrics: true, needsErrorTracking: true, needsPIIRedaction: true },
          },
          aiDetail: {
            usageMode: "none",
            capability: "chat-completions",
            providerType: "cloud-hosted",
            provider: "openai-compatible",
            dataNeeds: { memoryArchitecture: "no-memory", retrieval: "none", audit: "none" },
            vectorLayer: "none",
            orchestration: "single-prompt",
            tooling: "none",
            latencyNeed: "normal",
            throughputNeed: "normal",
            privacyLevel: "standard",
            costSensitivity: "medium",
            requirements: {
              needsVectorSearch: false,
              needsPersistentMemory: false,
              needsEventTraceStorage: false,
              needsStreaming: false,
              needsLowLatency: false,
              needsHighThroughput: false,
              costSensitivity: "medium",
              privacyLevel: "standard",
              needsDataIsolation: false,
              needsOnPremSupport: false,
              needsToolCalling: false,
              needsExternalAPIs: false,
              needsJobQueue: false,
              needsEventBus: false,
              needsWorkerSystem: false,
              needsStreamingTransport: false,
            },
          },
          selectionMeta: { mode: "proven", sources: { "*": "preset" } },
          integrationMode: "standalone",
          backendArchitectureMode: "decoupled-api",
          dataMode: "production-db-future",
          databaseDetail: {
            persistenceMode: "full",
            dataRoles: ["user-business"],
            model: "relational",
            engine: "postgres",
            accessStrategy: "orm",
            ormTool: "prisma",
            migrations: "auto",
            accessPattern: "service-layer",
            consistency: "strong",
            scalingIntent: "production-ready",
            scalingModel: "managed-cloud",
            cacheLayer: "none",
            redisRole: "none",
            reliability: "standard",
          },
          frontend: { stack: "astro-ts" },
          backend: { runtime: "nodejs-fastify" },
          database: "postgres",
          redis: "none",
          objectStorage: "none",
          tooling: { ...defaultBlueprint(appSlug).tooling, apiStyle: "rest-json", testing: "vitest" },
        }),
      },
      {
        id: "edge-api",
        name: "Edge API sketch (Hono + no DB)",
        build: () => ({
          ...defaultBlueprint(appSlug),
          infraDetail: { storageTopology: "cloud-object-storage" },
          authDetail: {
            identityModel: "none",
            sessionModel: "stateless-jwt",
            multiTenancy: "none",
            securityFeatures: [],
            requirements: {
              needsAuth: false,
              needsSessionStore: false,
              needsEmailSystem: false,
              needsAuditLog: false,
              needsMultiTenantDB: false,
            },
          },
          billingDetail: {
            enabled: false,
            provider: "none-yet",
            mode: "none",
            webhookIngestion: "none",
            requirements: {
              needsPayments: false,
              needsBillingWebhooks: false,
              needsUsageMetering: false,
              needsSubscriptions: false,
              needsJobQueue: false,
              needsAuditLog: false,
            },
          },
          emailDetail: {
            enabled: false,
            provider: "none",
            templates: "none",
            delivery: "sync-dev-only",
            requirements: { needsEmailSystem: false, needsTemplates: false, needsJobQueue: false },
          },
          searchDetail: {
            enabled: false,
            mode: "keyword",
            engine: "postgres-fts",
            indexing: "on-write",
            requirements: { needsSearch: false, needsIndexerJobs: false, needsSearchService: false },
          },
          jobsDetail: {
            systemType: "none",
            patterns: ["cron-only"],
            reliability: "best-effort",
            requirements: { needsJobQueue: false, needsWorkerSystem: false, needsRetrySystem: false, needsEventBus: false },
          },
          observabilityDetail: {
            logging: "structured-json",
            metrics: "basic",
            tracing: "opentelemetry",
            errorTracking: "sentry",
            piiHandling: "redaction-enabled",
            requirements: { needsTracing: true, needsMetrics: true, needsErrorTracking: true, needsPIIRedaction: true },
          },
          aiDetail: {
            usageMode: "none",
            capability: "chat-completions",
            providerType: "cloud-hosted",
            provider: "openai-compatible",
            dataNeeds: { memoryArchitecture: "no-memory", retrieval: "none", audit: "none" },
            vectorLayer: "none",
            orchestration: "single-prompt",
            tooling: "none",
            latencyNeed: "normal",
            throughputNeed: "normal",
            privacyLevel: "standard",
            costSensitivity: "medium",
            requirements: {
              needsVectorSearch: false,
              needsPersistentMemory: false,
              needsEventTraceStorage: false,
              needsStreaming: false,
              needsLowLatency: false,
              needsHighThroughput: false,
              costSensitivity: "medium",
              privacyLevel: "standard",
              needsDataIsolation: false,
              needsOnPremSupport: false,
              needsToolCalling: false,
              needsExternalAPIs: false,
              needsJobQueue: false,
              needsEventBus: false,
              needsWorkerSystem: false,
              needsStreamingTransport: false,
            },
          },
          selectionMeta: { mode: "proven", sources: { "*": "preset" } },
          integrationMode: "standalone",
          backendArchitectureMode: "decoupled-api",
          dataMode: "none",
          databaseDetail: {
            persistenceMode: "stateless",
            dataRoles: ["user-business"],
            model: "relational",
            engine: "none",
            accessStrategy: "raw-sql",
            accessPattern: "direct",
            consistency: "strong",
            scalingIntent: "not-considered",
            cacheLayer: "none",
            redisRole: "none",
          },
          frontend: { stack: "static-html-vanilla" },
          backend: { runtime: "nodejs-hono" },
          database: "none",
          redis: "none",
          objectStorage: "none",
          tooling: { ...defaultBlueprint(appSlug).tooling, apiStyle: "rest-json", testing: "vitest" },
        }),
      },
    ];

    const picked = await select({
      message: "Choose a proven stack preset",
      choices: presets.map((p) => ({ name: p.name, value: p.id })),
    });
    const preset = presets.find((p) => p.id === picked);
    if (!preset) throw new Error("Unknown preset");
    const bp = preset.build();
    bp.generatedAt = new Date().toISOString();
    bp.appSlug = appSlug;
    return bp;
  }

  if (mode === "resolver") {
    console.log(pc.dim("\n── Resolver-based flow — minimal intent questions ──\n"));

    const integrationMode = await pick("How this app relates to shared SaaS / monorepo", INTEGRATION_OPTS);

    // Optional: compile Product IR (vertical brief) → System IR suggestions
    let productSuggestions:
      | undefined
      | {
          suggestedMultiTenancy?: "none" | "workspace-based" | "org-based";
          suggestedPersistence?: "none" | "lightweight" | "full";
          suggestedBillingEnabled?: boolean;
          suggestedObservability?: "none" | "standard";
        };
    try {
      const briefPath = verticalBriefPath(REPO_ROOT, appSlug);
      const raw = await fs.readFile(briefPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const cfg = validateVerticalConfigObject(parsed, path.relative(REPO_ROOT, briefPath)) as VerticalConfig;
      if (cfg.vertical === appSlug) {
        productSuggestions = compileProductIrToSystemSuggestions(cfg);
      }
    } catch {
      // No brief or invalid JSON → just skip suggestions.
    }

    const fePreset = await select({
      message: "Frontend shape",
      choices: [
        { name: "React SPA (Vite)", value: "vite-react-ts" as const },
        { name: "Next.js full-stack", value: "next-ts-fullstack" as const },
        { name: "Astro (static + islands)", value: "astro-ts" as const },
      ],
    });

    const styling = await select({
      message: "Styling default",
      choices: [
        { name: "Tailwind (recommended)", value: "tailwind" as const },
        { name: "CSS Modules", value: "css-modules" as const },
        { name: "Plain CSS", value: "plain-css" as const },
      ],
    });

    const transport = await select({
      message: "API transport",
      choices: [
        { name: "REST + JSON", value: "rest-json" as const },
        { name: "GraphQL", value: "graphql" as const },
        { name: "tRPC (TypeScript only)", value: "trpc" as const },
      ],
    });

    const backendArchitectureMode: "integrated-fullstack" | "decoupled-api" =
      fePreset === "next-ts-fullstack" ? "integrated-fullstack" : "decoupled-api";

    const backendRuntime: BackendRuntime =
      backendArchitectureMode === "integrated-fullstack"
        ? "next-api-routes"
        : await pick("Backend runtime", BACKEND_OPTS.filter((c) => c.value !== "next-api-routes"));

    const persistence = await select({
      message: "Data persistence",
      choices: [
        { name: "None (stateless / external API)", value: "none" as const },
        { name: "Lightweight (local/dev DB)", value: "lightweight" as const },
        { name: "Full (production DB)", value: "full" as const },
      ],
      default:
        productSuggestions?.suggestedPersistence === "none"
          ? ("none" as const)
          : productSuggestions?.suggestedPersistence === "full"
            ? ("full" as const)
            : ("lightweight" as const),
    });

    const multiTenancy = await select({
      message: "Multi-tenancy",
      choices: [
        { name: "None (single-tenant)", value: "none" as const },
        { name: "Workspace-based (recommended for SaaS)", value: "workspace-based" as const },
        { name: "Org-based", value: "org-based" as const },
      ],
      default:
        productSuggestions?.suggestedMultiTenancy === "org-based"
          ? ("org-based" as const)
          : productSuggestions?.suggestedMultiTenancy === "none"
            ? ("none" as const)
            : ("workspace-based" as const),
    });

    const aiUsage = await select({
      message: "AI usage (capability)",
      choices: [
        { name: "None", value: "none" as const },
        { name: "Basic LLM (chat/completions)", value: "basic" as const },
        { name: "Agent workflows (tools + jobs)", value: "agents" as const },
      ],
    });

    const billingEnabled =
      multiTenancy === "none"
        ? false
        : await confirm({
            message: "Enable billing (Stripe subscriptions)?",
            default: productSuggestions?.suggestedBillingEnabled ?? true,
          });

    const obsLevel = await select({
      message: "Observability posture",
      choices: [
        { name: "None (dev only)", value: "none" as const },
        { name: "Standard (logs + Sentry + basic tracing)", value: "standard" as const },
      ],
      default: productSuggestions?.suggestedObservability === "standard" ? ("standard" as const) : ("none" as const),
    });

    // ---- Resolver (graph-ish): infer detail blocks from a small set of intent questions. ----
    const dataMode: SaaSAppBlueprint["dataMode"] =
      persistence === "none" ? "none" : persistence === "lightweight" ? "local-dev-db" : "production-db-future";

    const infraDetail: InfraDetail = {
      storageTopology: persistence === "none" ? "cloud-object-storage" : "local-disk",
    };

    const databaseDetail: DatabaseDetail =
      persistence === "none"
        ? {
            persistenceMode: "stateless",
            dataRoles: ["user-business"],
            model: "relational",
            engine: "none",
            accessStrategy: "raw-sql",
            accessPattern: "direct",
            consistency: "strong",
            scalingIntent: "not-considered",
            cacheLayer: "none",
            redisRole: "none",
          }
        : persistence === "lightweight"
          ? {
              persistenceMode: "lightweight",
              dataRoles: ["user-business", "session-auth"],
              model: "relational",
              engine: "sqlite",
              accessStrategy: "orm",
              ormTool: "drizzle",
              migrations: "auto",
              accessPattern: "service-layer",
              consistency: "strong",
              scalingIntent: "future-proof-only",
              scalingModel: "single-instance",
              cacheLayer: "none",
              redisRole: "none",
              reliability: "best-effort",
            }
          : {
              persistenceMode: "full",
              dataRoles: multiTenancy === "none" ? ["user-business"] : ["user-business", "session-auth"],
              model: "relational",
              engine: "postgres",
              accessStrategy: "orm",
              ormTool: "prisma",
              migrations: "auto",
              accessPattern: "service-layer",
              consistency: "strong",
              scalingIntent: "production-ready",
              scalingModel: "managed-cloud",
              cacheLayer: "redis",
              redisRole: "cache-layer",
              reliability: "standard",
            };

    const database: PrimaryDatabase =
      databaseDetail.engine === "postgres" ? "postgres" : databaseDetail.engine === "sqlite" ? "sqlite-file" : "none";

    const authDetail: AuthDetail | undefined =
      multiTenancy === "none"
        ? undefined
        : {
            identityModel: "hybrid-email-oauth",
            sessionModel: "stateless-jwt",
            multiTenancy: multiTenancy === "org-based" ? "org-based" : "workspace-based",
            securityFeatures: ["email-verification", "rbac"],
            requirements: {
              needsAuth: true,
              needsSessionStore: false,
              needsEmailSystem: true,
              needsAuditLog: billingEnabled,
              needsMultiTenantDB: true,
            },
          };
    const authSystem: SaaSAppBlueprint["authSystem"] = authDetail ? "hybrid" : "none";

    const billingDetail: BillingDetail | undefined =
      billingEnabled
        ? {
            enabled: true,
            provider: "stripe",
            mode: "subscriptions",
            webhookIngestion: "required",
            requirements: {
              needsPayments: true,
              needsBillingWebhooks: true,
              needsUsageMetering: false,
              needsSubscriptions: true,
              needsJobQueue: true,
              needsAuditLog: true,
            },
          }
        : undefined;

    const emailDetail: EmailDetail | undefined =
      authDetail?.requirements.needsEmailSystem || billingDetail?.requirements.needsPayments
        ? {
            enabled: true,
            provider: "resend",
            templates: "code-templates",
            delivery: "async-queue",
            requirements: { needsEmailSystem: true, needsTemplates: true, needsJobQueue: true },
          }
        : undefined;

    const aiDetail: AiDetail | undefined =
      aiUsage === "none"
        ? undefined
        : aiUsage === "basic"
          ? {
              usageMode: "basic-llm",
              capability: "chat-completions",
              providerType: "cloud-hosted",
              provider: "openai-compatible",
              dataNeeds: { memoryArchitecture: "no-memory", retrieval: "none", audit: "none" },
              vectorLayer: "none",
              orchestration: "single-prompt",
              tooling: "none",
              latencyNeed: "normal",
              throughputNeed: "normal",
              privacyLevel: "standard",
              costSensitivity: "medium",
              requirements: {
                needsVectorSearch: false,
                needsPersistentMemory: false,
                needsEventTraceStorage: false,
                needsStreaming: false,
                needsLowLatency: false,
                needsHighThroughput: false,
                costSensitivity: "medium",
                privacyLevel: "standard",
                needsDataIsolation: false,
                needsOnPremSupport: false,
                needsToolCalling: false,
                needsExternalAPIs: false,
                needsJobQueue: false,
                needsEventBus: false,
                needsWorkerSystem: false,
                needsStreamingTransport: false,
              },
            }
          : {
              usageMode: "system-ai",
              capability: "agent-workflows",
              providerType: "cloud-hosted",
              provider: "openai-compatible",
              dataNeeds: { memoryArchitecture: "persistent-cross-session", retrieval: "vector-search", audit: "event-trace-storage" },
              vectorLayer: "postgres-pgvector",
              orchestration: "event-driven-pipeline",
              tooling: "tool-calling",
              latencyNeed: "normal",
              throughputNeed: "normal",
              privacyLevel: "standard",
              costSensitivity: "medium",
              requirements: {
                needsVectorSearch: true,
                needsPersistentMemory: true,
                needsEventTraceStorage: true,
                needsStreaming: true,
                needsLowLatency: false,
                needsHighThroughput: false,
                costSensitivity: "medium",
                privacyLevel: "standard",
                needsDataIsolation: false,
                needsOnPremSupport: false,
                needsToolCalling: true,
                needsExternalAPIs: true,
                needsJobQueue: true,
                needsEventBus: true,
                needsWorkerSystem: true,
                needsStreamingTransport: true,
              },
            };

    const ai: { integration: AiIntegration; notes?: string; usagePattern?: "none" | "chat" | "embeddings" | "agent-workflows" } =
      !aiDetail
        ? { integration: "none", usagePattern: "none" }
        : {
            integration:
              aiDetail.provider === "anthropic"
                ? "anthropic-sketch"
                : aiDetail.provider === "openai-compatible" || aiDetail.provider === "azure-openai"
                  ? "openai-http-sketch"
                  : "provider-agnostic-placeholder",
            usagePattern: aiDetail.capability === "agent-workflows" ? "agent-workflows" : "chat",
          };

    const networkingDetail: NetworkingDetail = {
      apiExposure: multiTenancy === "none" ? "external-public" : "mixed",
      tls: "at-edge",
      cdn: "static-only",
      waf: multiTenancy === "none" ? "basic" : "managed",
      rateLimiting: "basic",
      webhooks: billingEnabled ? "ingest-only" : "none",
      corsPolicy: "allowlist",
      internalApi: { enabled: multiTenancy !== "none" },
      requirements: {
        needsTls: true,
        needsCdn: true,
        needsWaf: true,
        needsRateLimiting: true,
        needsWebhooks: billingEnabled,
        needsCorsPolicy: true,
        exposesExternalApis: true,
      },
    };

    const searchDetail: SearchDetail = {
      enabled: false,
      mode: "keyword",
      engine: "postgres-fts",
      indexing: "on-write",
      requirements: { needsSearch: false, needsIndexerJobs: false, needsSearchService: false },
    };

    const needsJobs = Boolean(
      aiDetail?.requirements.needsJobQueue ||
        billingDetail?.requirements.needsJobQueue ||
        emailDetail?.requirements.needsJobQueue ||
        searchDetail.requirements.needsIndexerJobs,
    );
    const jobsDetail: JobsDetail | undefined = needsJobs
      ? {
          systemType: databaseDetail.engine === "postgres" ? "redis-queue" : "in-memory-queue",
          patterns: ["background-jobs"],
          reliability: "at-least-once",
          requirements: { needsJobQueue: true, needsWorkerSystem: true, needsRetrySystem: true, needsEventBus: Boolean(aiDetail?.requirements.needsEventBus) },
        }
      : undefined;

    const redis: RedisPolicy =
      jobsDetail?.systemType === "redis-queue" ? "cache-sessions-queues" : databaseDetail.engine === "postgres" ? "cache-sessions" : "none";

    const observabilityDetail: ObservabilityDetail =
      obsLevel === "none"
        ? {
            logging: "console",
            metrics: "none",
            tracing: "none",
            errorTracking: "none",
            piiHandling: "none",
            requirements: { needsTracing: false, needsMetrics: false, needsErrorTracking: false, needsPIIRedaction: false },
          }
        : {
            logging: "structured-json",
            metrics: "basic",
            tracing: "opentelemetry",
            errorTracking: "sentry",
            piiHandling: "redaction-enabled",
            requirements: { needsTracing: true, needsMetrics: true, needsErrorTracking: true, needsPIIRedaction: true },
          };

    const observability: ObservabilitySketch =
      observabilityDetail.tracing !== "none" ? "otel-hooks" : observabilityDetail.errorTracking !== "none" ? "sentry-client-sketch" : "none";

    const bp = defaultBlueprint(appSlug);
    bp.selectionMeta = { mode: "resolver", sources: { "*": "system" } };
    bp.integrationMode = integrationMode;
    bp.backendArchitectureMode = backendArchitectureMode;
    bp.dataMode = dataMode;
    bp.databaseDetail = databaseDetail;
    bp.infraDetail = infraDetail;
    bp.authSystem = authSystem;
    bp.authDetail = authDetail;
    bp.frontend = { stack: fePreset };
    bp.frontendDetail = defaultFrontendDetailForStack(fePreset);
    bp.frontendDetail.styling = styling;
    bp.backend = { runtime: backendRuntime };
    bp.database = database;
    bp.redis = redis;
    bp.observability = observability;
    bp.observabilityDetail = observabilityDetail;
    bp.tooling.apiStyle = transport;
    bp.ai = ai;
    bp.aiDetail = aiDetail;
    bp.jobsDetail = jobsDetail;
    bp.networkingDetail = networkingDetail;
    bp.searchDetail = searchDetail;
    bp.billingDetail = billingDetail;
    bp.emailDetail = emailDetail;
    bp.tooling.packageManager = "pnpm";
    bp.tooling.monorepo = integrationMode === "monorepo-integrated" ? "turborepo" : "none";
    bp.tooling.containers = "none";
    bp.tooling.testing = mapTestFocusToTooling(
      bp.frontendDetail.unitTesting,
      backendRuntimeToTestKind(backendRuntime),
    );
    bp.generatedAt = new Date().toISOString();
    return bp;
  }

  console.log(pc.dim("\n── Advanced — ↑↓ and Enter ──\n"));
  return interactiveManual(outRel, appSlug);
}

function parseArgs(argv: string[]): {
  help: boolean;
  defaults: boolean;
  show: boolean;
  from?: string;
  out?: string;
} {
  let help = false;
  let defaults = false;
  let show = false;
  let from: string | undefined;
  let out: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--defaults") defaults = true;
    else if (a === "--show") show = true;
    else if (a === "--from") {
      from = argv[i + 1];
      if (!from) throw new Error("--from requires a path");
      i++;
    } else if (a === "--out") {
      const p = argv[i + 1];
      if (!p) throw new Error("--out requires a path");
      out = path.resolve(REPO_ROOT, p);
      i++;
    }
  }

  return { help, defaults, show, from, out };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  let opts: ReturnType<typeof parseArgs>;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.show) {
    const slugForShow = extractAppSlug(argv);
    const showPath = opts.out ?? (slugForShow ? appStackPath(REPO_ROOT, slugForShow) : undefined);
    if (!showPath) {
      console.error("Usage: npm run mfg -- app stack -- <app> --show   OR   npm run mfg -- app stack -- --show --out <path>");
      process.exitCode = 1;
      return;
    }
    try {
      const raw = await fs.readFile(showPath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isValidBlueprint(parsed)) {
        console.error("Invalid stack file at", showPath);
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.error("No file at", showPath);
      process.exitCode = 1;
    }
    return;
  }

  if (opts.from) {
    const abs = path.resolve(REPO_ROOT, opts.from);
    const raw = await fs.readFile(abs, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isValidBlueprint(parsed)) {
      console.error("Invalid stack schema in", abs);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  let appSlug = extractAppSlug(argv);
  if (!appSlug) {
    if (opts.defaults) {
      console.error("Missing app slug. Example: npm run mfg -- app stack -- my-app --defaults");
      process.exitCode = 1;
      return;
    }
    appSlug = await input({
      message: "App slug (writes configs/apps/<slug>/app.stack.json)",
      default: "my-saas",
      validate: (v) => (isValidSlug(v.trim()) ? true : "Use lowercase letters, numbers, single hyphens only."),
    });
    appSlug = appSlug.trim();
  }

  if (!isValidSlug(appSlug)) {
    console.error(`Invalid app slug "${appSlug}"`);
    process.exitCode = 1;
    return;
  }

  const outAbs = opts.out ?? appStackPath(REPO_ROOT, appSlug);
  const outRel = path.relative(REPO_ROOT, outAbs);
  const blueprint = opts.defaults ? defaultBlueprint(appSlug) : await interactive(outRel, appSlug);

  await fs.mkdir(path.dirname(outAbs), { recursive: true });
  await fs.writeFile(outAbs, JSON.stringify(blueprint, null, 2) + "\n", "utf8");
  console.log(pc.green("\n✔ Wrote " + outRel));
  console.log(pc.dim("Use npm run mfg -- app scaffold -- " + appSlug + " (or --from this path) + @agents/builder/tooling/dev.\n"));
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
