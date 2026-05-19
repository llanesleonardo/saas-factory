/**
 * Guarded deploy orchestrator — **delivery station** (`08-delivery/`).
 * Invoked via `npm run mfg -- deploy preview|staging|prod` or `mfg line deploy -- --env …`.
 */
import { spawnSync } from "node:child_process";
import { recordRun, repoRootFromHere } from "../../factory_internal_ops/telemetry.js";

type EnvName = "preview" | "staging" | "prod";

function die(msg: string): never {
  throw new Error(msg);
}

function parseArg(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(`${name}=`.length);
  const idx = argv.indexOf(name);
  if (idx !== -1 && argv[idx + 1] !== undefined) return argv[idx + 1]!;
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { stdio: "inherit", encoding: "utf8", shell: process.platform === "win32" });
  if ((r.status ?? 1) !== 0) {
    die(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function capture(cmd: string, args: string[]): string {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", shell: process.platform === "win32" });
  if ((r.status ?? 1) !== 0) {
    const err = String(r.stderr ?? "").trim();
    die(`Command failed: ${cmd} ${args.join(" ")}${err ? `\n${err}` : ""}`);
  }
  return String(r.stdout ?? "").trim();
}

function parseEnv(v: string | undefined): EnvName {
  if (v === "preview" || v === "staging" || v === "prod") return v;
  die(`Missing or invalid --env (expected preview|staging|prod). Got: ${JSON.stringify(v)}`);
}

function requireCleanRepoForPromotion(env: EnvName): void {
  if (env === "preview") return;
  const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") {
    die(`Refusing ${env} deploy: must be on branch "main" (current: ${branch}).`);
  }
  const dirty = capture("git", ["status", "--porcelain=v1"]);
  if (dirty.length > 0) {
    die(`Refusing ${env} deploy: working tree not clean. Commit/stash changes first.`);
  }
}

function runRequiredGates(env: EnvName, force: boolean): void {
  const gates = [
    ["npm", ["run", "check"]],
    ["npm", ["run", "mfg", "--", "validate", "factory"]],
  ] as const;

  if (env === "preview") {
    // Preview is allowed to be lighter-weight later; today we keep it consistent.
  }

  if (force) return;
  for (const [cmd, args] of gates) run(cmd, [...args]);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(
      [
        "Deploy tiers (where the running app is exercised):",
        "",
        "  preview   — Visual / smoke testing: fast feedback on UI and happy paths.",
        "            Typical: local dev servers (apps/* npm run dev), Vite preview, ephemeral PR env, or a dev slot URL.",
        "",
        "  staging   — Thorough testing: integration, data migrations, perf-ish checks, stakeholder UAT.",
        "            Typical: shared staging subscription / namespace; may stop here (no prod) until sign-off.",
        "",
        "  prod      — Live customer traffic. Only when the system is functionally ready and accepted.",
        "            Typical: production subscription / region; stricter gates and clean main.",
        "",
        "Usage (preferred):",
        "  npm run mfg -- deploy preview   [--target <app-path>] [--dry-run] [--force --force-reason <text>]",
        "  npm run mfg -- deploy staging  [-- …]",
        "  npm run mfg -- deploy prod     [-- …]",
        "",
        "Equivalent:",
        "  npm run mfg -- line deploy -- --env preview|staging|prod  [-- …]",
        "",
        "Orchestrator source: factory/03_assembly_lines/08-delivery/deploy.ts",
        "",
        "Notes:",
        "- Guarded orchestrator only; does NOT store secrets. Wire real targets under DevOps (e.g. Azure, Vercel).",
        "- staging/prod: refuses unless branch is main and working tree is clean (preview skips that).",
        "- Default: runs gates (npm run check + mfg validate factory) before proceed. --force requires --force-reason (min 10 chars).",
        "- Execution after gates is still a stub until wired to your cloud pipeline.",
      ].join("\n"),
    );
    process.exitCode = 0;
    return;
  }

  const env = parseEnv(parseArg(argv, "--env"));
  const target = parseArg(argv, "--target");
  const dryRun = hasFlag(argv, "--dry-run");
  const force = hasFlag(argv, "--force");
  const forceReason = parseArg(argv, "--force-reason");

  if (force && (!forceReason || forceReason.trim().length < 10)) {
    die("When using --force, you must also provide --force-reason (min 10 chars).");
  }

  requireCleanRepoForPromotion(env);

  console.log("");
  console.log(`Deployment plan:`);
  console.log(`  env:    ${env}`);
  if (target) console.log(`  target: ${target}`);
  console.log(`  gates:  ${force ? "SKIPPED (forced)" : "RUN"}`);
  console.log(`  mode:   ${dryRun ? "dry-run" : "execute (stub)"}`);
  if (force) console.log(`  force:  ${forceReason}`);
  console.log("");

  const repoRoot = repoRootFromHere(import.meta.url);
  await recordRun(
    repoRoot,
    {
      kind: "deploy",
      workstation: "08-delivery",
      command: `npm run mfg -- deploy ${env}${target ? ` --target ${target}` : ""}${dryRun ? " --dry-run" : ""}${force ? " --force" : ""}`,
      app: "factory/",
    },
    async () => {
      runRequiredGates(env, force);
    },
  );

  if (dryRun) {
    console.log("DRY RUN — gates passed (or were forced). No deployment executed.");
    return;
  }

  // Implementation is environment-specific and owned by DevOps; we intentionally keep
  // this first version as a safe orchestrator shell. FACTORY_OS_004 should extend this
  // to call the actual deploy target (e.g. Vercel) with names-only env wiring.
  console.log("EXECUTE (stub) — deployment execution not implemented yet.");
  console.log("Next: wire to a real deploy target (e.g. Vercel) per factory-os-deploy-engine-spec.md.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
