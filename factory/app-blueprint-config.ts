/**
 * SaaS app blueprint wizard — terminal-only (OpenClaw-style: banner, boxed intro, arrow-key selects).
 * Covers frontend, backend, DB, Redis, object storage, version-control/Git workflow, tooling, CI/CD.
 *
 * Usage (Docker-first — runs inside docker/compose.yaml **node** service):
 *   npm run app:configure
 *   npm run saas:configure
 *   npm run app:configure -- --defaults
 *   npm run app:configure -- --show
 *   npm run app:configure -- --from configs/app.blueprint.json
 *   npm run app:configure -- --help
 *
 * **`npm run app:configure`** uses **`factory/host-or-docker.ts`**: on the host it runs the wizard inside the Compose **`node`** service; inside a container it runs **`tsx`** directly (no Docker-in-Docker).
 * Host-only / no Docker CLI: **`npm run app:configure:local`** — same flags after `--`.
 */
import { confirm, input, select } from "@inquirer/prompts";
import boxen from "boxen";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import pc from "picocolors";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT = path.join(REPO_ROOT, "configs", "app.blueprint.json");

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
  frontend: { stack: FrontendStack };
  backend: { runtime: BackendRuntime };
  database: PrimaryDatabase;
  redis: RedisPolicy;
  objectStorage: ObjectStorageKind;
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

const CONTAINER_OPTS: { value: ContainerSetup; label: string }[] = [
  { value: "none", label: "No Docker in scaffold" },
  { value: "docker-compose-dev", label: "docker-compose for local dev (DB, Redis, MinIO…)" },
  { value: "docker-compose-prod-sketch", label: "compose sketch for prod-like stack (document only)" },
];

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

function printHelp(defaultOutRel: string): void {
  console.log(`app:configure / saas:configure — SaaS app blueprint (frontend, backend, data, VCS, tooling, CI).

Interactive:
  npm run app:configure
  npm run saas:configure

Options:
  --out <path>     Output JSON (default: ${defaultOutRel})
  --defaults       Non-interactive defaults (demo blueprint)
  --show           Print existing file at --out
  --from <path>    Validate + print JSON
  --help
`);
}

function defaultBlueprint(): SaaSAppBlueprint {
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    appSlug: "my-saas",
    integrationMode: "monorepo-integrated",
    frontend: { stack: "vite-react-ts" },
    backend: { runtime: "nodejs-fastify" },
    database: "postgres",
    redis: "none",
    objectStorage: "none",
    versionControl: {
      platform: "github",
      branching: "github-flow",
      hooks: "husky",
      commitConvention: "conventional-commits",
    },
    tooling: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      containers: "docker-compose-dev",
      lintFormat: "eslint-prettier",
      apiStyle: "rest-json",
      testing: "vitest",
    },
    cicd: "github-actions",
    observability: "none",
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
  const ct = CONTAINER_OPTS.map((c) => c.value);
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
    ob.includes(o.observability as ObservabilitySketch)
  );
}

/** Load and validate a blueprint JSON file (used by `app:scaffold`). */
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

async function interactiveManual(outRel: string): Promise<SaaSAppBlueprint> {
  section("Identity & integration");
  let appSlug = await input({
    message: "App slug (kebab-case, e.g. plumber-portal)",
    default: "my-saas",
    validate: (v) => (isValidSlug(v.trim()) ? true : "Use lowercase letters, numbers, single hyphens only."),
  });
  appSlug = appSlug.trim();
  const integrationMode = await pick("How this app relates to shared SaaS / monorepo", INTEGRATION_OPTS);

  section("Frontend");
  const frontendStack = await pick("Frontend stack / framework", FRONTEND_OPTS);

  section("Backend");
  let backendRuntime: BackendRuntime;
  if (frontendStack === "next-ts-fullstack") {
    console.log(pc.yellow("\nNext.js full-stack selected — backend uses Route Handlers / API routes in the same app.\n"));
    backendRuntime = "next-api-routes";
  } else {
    backendRuntime = await pick("Backend runtime / API style", BACKEND_OPTS);
    if (backendRuntime === "next-api-routes") {
      console.log(pc.yellow("\n`next-api-routes` pairs with Next fullstack — switching to Fastify for split SPA + API.\n"));
      backendRuntime = "nodejs-fastify";
    }
  }

  section("Data layer");
  const database = await pick("Primary database", DATABASE_OPTS);
  const redis = await pick("Redis usage", REDIS_OPTS);
  const objectStorage = await pick("Object / blob storage", STORAGE_OPTS);

  section("Version control & Git workflow");
  const platform = await pick("Git hosting", VCS_PLATFORM_OPTS);
  const branching = await pick("Branching model", BRANCHING_OPTS);
  const hooks = await pick("Git hooks tooling", HOOKS_OPTS);
  const commitConvention = await pick("Commit message convention", COMMIT_OPTS);

  section("Tooling & scripts");
  const packageManager = await pick("Package manager (JS/TS ecosystem)", PKG_OPTS);
  const monorepo = await pick("Monorepo orchestrator", MONOREPO_OPTS);
  const containers = await pick("Containers / compose", CONTAINER_OPTS);
  const lintFormat = await pick("Lint & format", LINT_OPTS);
  const apiStyle = await pick("API contract style", API_OPTS);
  const testing = await pick("Primary automated test stack", TEST_OPTS);

  section("Delivery & observability");
  const cicd = await pick("CI/CD platform", CICD_OPTS);
  const observability = await pick("Observability sketch", OBS_OPTS);

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    appSlug,
    integrationMode,
    frontend: { stack: frontendStack },
    backend: { runtime: backendRuntime },
    database,
    redis,
    objectStorage,
    versionControl: {
      platform,
      branching,
      hooks,
      commitConvention,
    },
    tooling: {
      packageManager,
      monorepo,
      containers,
      lintFormat,
      apiStyle,
      testing,
    },
    cicd,
    observability,
  };
}

async function interactive(outRel: string): Promise<SaaSAppBlueprint> {
  printBanner();
  printIntroBox(outRel);

  const ok = await confirm({
    message: pc.red("Continue with blueprint setup?"),
    default: true,
  });
  if (!ok) throw new Error("Aborted.");

  const mode = await select({
    message: pc.bold("Onboarding mode"),
    choices: [
      {
        name: "QuickStart — sensible defaults (edit app.blueprint.json afterward)",
        value: "quick" as const,
      },
      {
        name: "Manual — each dimension (frontend, backend, DB, VCS, tooling, CI…)",
        value: "manual" as const,
      },
    ],
  });

  if (mode === "quick") {
    return defaultBlueprint();
  }

  console.log(pc.dim("\n── Manual — ↑↓ and Enter ──\n"));
  return interactiveManual(outRel);
}

function parseArgs(argv: string[]): {
  help: boolean;
  defaults: boolean;
  show: boolean;
  from?: string;
  out: string;
} {
  let help = false;
  let defaults = false;
  let show = false;
  let from: string | undefined;
  let out = DEFAULT_OUT;

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
  const defaultOutRel = path.relative(REPO_ROOT, DEFAULT_OUT);

  let opts: ReturnType<typeof parseArgs>;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (opts.help) {
    printHelp(defaultOutRel);
    return;
  }

  if (opts.show) {
    try {
      const raw = await fs.readFile(opts.out, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!isValidBlueprint(parsed)) {
        console.error("Invalid blueprint at", opts.out);
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.error("No file at", opts.out);
      process.exitCode = 1;
    }
    return;
  }

  if (opts.from) {
    const abs = path.resolve(REPO_ROOT, opts.from);
    const raw = await fs.readFile(abs, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isValidBlueprint(parsed)) {
      console.error("Invalid blueprint schema in", abs);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  const outRel = path.relative(REPO_ROOT, opts.out);
  const blueprint = opts.defaults ? defaultBlueprint() : await interactive(outRel);

  await fs.mkdir(path.dirname(opts.out), { recursive: true });
  await fs.writeFile(opts.out, JSON.stringify(blueprint, null, 2) + "\n", "utf8");
  console.log(pc.green("\n✔ Wrote " + outRel));
  console.log(pc.dim("Use @agents/architect-agent.md + builder/tooling/dev to scaffold from this blueprint.\n"));
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
