/**
 * Verified manufacturing registry — list apps promoted after successful manufacture + checks.
 *
 * Registry: factory/03_assembly_lines/03-registry/registry/verified-apps.json (created empty; populated via `add`).
 *
 * Usage:
 *   npm run mfg -- app verified                  # list verified apps (human-readable)
 *   npm run mfg -- app verified -- --json       # machine-readable list
 *   npm run mfg -- app verified -- add <slug>    # run SaaS alignment + instance check, then register
 *   npm run mfg -- app verified -- add <slug> --strict   # require business-needs.json for saas check
 *   npm run mfg -- app verified -- remove <slug> # remove from registry only (does not delete configs/apps)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..", "..");

const REGISTRY_REL = "factory/03_assembly_lines/03-registry/registry/verified-apps.json";
const REGISTRY_ABS = path.join(repoRoot, REGISTRY_REL);

const SLUG = /^[a-z][a-z0-9-]*$/;

type VerifiedEntry = { slug: string; verifiedAt: string; notes?: string };

type VerifiedRegistry = {
  schema_version: 1;
  description?: string;
  apps: VerifiedEntry[];
};

function parseCli(argv: string[]): {
  mode: "list" | "add" | "remove";
  slug?: string;
  json: boolean;
  strict: boolean;
  help: boolean;
} {
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");
  const help = argv.includes("--help") || argv.includes("-h");
  const rest = argv.filter(
    (a) =>
      a !== "--json" &&
      a !== "--strict" &&
      a !== "--help" &&
      a !== "-h" &&
      a !== "--" &&
      !a.includes("app-verified"),
  );
  const sub = rest[0]?.toLowerCase();
  if (sub === "add") {
    return { mode: "add", slug: rest[1]?.trim(), json, strict, help };
  }
  if (sub === "remove" || sub === "rm") {
    return { mode: "remove", slug: rest[1]?.trim(), json, strict, help };
  }
  return { mode: "list", json, strict, help };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function defaultRegistry(): VerifiedRegistry {
  return {
    schema_version: 1,
    description:
      "Apps that completed manufacturing verification (brief + stack + SaaS alignment + scaffolded instance) and were promoted via `mfg app verified add`.",
    apps: [],
  };
}

async function loadRegistry(): Promise<VerifiedRegistry> {
  if (!(await pathExists(REGISTRY_ABS))) {
    await mkdir(path.dirname(REGISTRY_ABS), { recursive: true });
    const empty = defaultRegistry();
    await writeFile(REGISTRY_ABS, `${JSON.stringify(empty, null, 2)}\n`, "utf8");
    return empty;
  }
  const raw = JSON.parse(await readFile(REGISTRY_ABS, "utf8")) as unknown;
  if (typeof raw !== "object" || raw === null || !("apps" in raw)) {
    throw new Error(`${REGISTRY_REL}: invalid registry shape`);
  }
  const r = raw as VerifiedRegistry;
  if (r.schema_version !== 1) {
    throw new Error(`${REGISTRY_REL}: schema_version must be 1`);
  }
  if (!Array.isArray(r.apps)) {
    throw new Error(`${REGISTRY_REL}: apps must be an array`);
  }
  return r;
}

async function saveRegistry(reg: VerifiedRegistry): Promise<void> {
  reg.apps.sort((a, b) => a.slug.localeCompare(b.slug));
  await mkdir(path.dirname(REGISTRY_ABS), { recursive: true });
  await writeFile(REGISTRY_ABS, `${JSON.stringify(reg, null, 2)}\n`, "utf8");
}

function runSaasAlign(slug: string, strict: boolean): number {
  const script = "factory/03_assembly_lines/06-gates/gates/app-saas-align.ts";
  const args = ["tsx", script, "--", slug];
  if (strict) args.push("--strict");
  const r = spawnSync("npx", args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

function instanceDir(slug: string): string {
  // Prefer new nested layout (apps/<slug>/<slug>-instance); fall back to legacy
  // flat (apps/<slug>-instance) so older slugs still verify.
  const nested = path.join(repoRoot, "apps", slug, `${slug}-instance`);
  const legacy = path.join(repoRoot, "apps", `${slug}-instance`);
  return existsSync(nested) ? nested : legacy;
}

function printHelp(): void {
  console.log(`mfg app verified — manufacturing verified-app registry (${REGISTRY_REL})

  list (default)     Apps successfully verified and listed in the registry
  add <slug>         Run SaaS alignment + confirm apps/<slug>/<slug>-instance exists, then append to registry
  remove <slug>      Remove slug from registry only

Flags: --json   Output registry as JSON (list mode)
       --strict Pass --strict to app saas when using add

Examples:
  npm run mfg -- app verified
  npm run mfg -- app verified -- --json
  npm run mfg -- app verified -- add todo
`);
}

async function cmdList(jsonOut: boolean): Promise<void> {
  const reg = await loadRegistry();
  if (jsonOut) {
    console.log(JSON.stringify(reg, null, 2));
    return;
  }
  console.log("\nVerified manufacturing registry\n");
  console.log(`File: ${REGISTRY_REL}`);
  console.log(`Count: ${reg.apps.length}\n`);
  if (reg.apps.length === 0) {
    console.log("  (none yet — use `npm run mfg -- app verified -- add <slug>` after manufacture.)\n");
    return;
  }
  for (const a of reg.apps) {
    console.log(`  • ${a.slug}`);
    console.log(`      verifiedAt: ${a.verifiedAt}`);
    if (a.notes) console.log(`      notes: ${a.notes}`);
  }
  console.log("");
}

async function cmdAdd(slug: string, strict: boolean): Promise<number> {
  if (!slug || !SLUG.test(slug)) {
    console.error("Usage: npm run mfg -- app verified -- add <slug> [--strict]");
    return 1;
  }

  const inst = instanceDir(slug);
  if (!(await pathExists(inst))) {
    console.error(
      `Manufacturing check failed: expected scaffolded app at ${path.relative(repoRoot, inst)} — run mfg app scaffold first.`,
    );
    return 1;
  }

  const code = runSaasAlign(slug, strict);
  if (code !== 0) {
    console.error(`SaaS alignment failed for "${slug}" — fix issues before adding to the verified list.`);
    return code;
  }

  const reg = await loadRegistry();
  const now = new Date().toISOString();
  const idx = reg.apps.findIndex((x) => x.slug === slug);
  if (idx >= 0) {
    reg.apps[idx] = { slug, verifiedAt: now, notes: reg.apps[idx].notes };
  } else {
    reg.apps.push({ slug, verifiedAt: now });
  }
  await saveRegistry(reg);
  console.log(`\nOK: "${slug}" added to verified manufacturing registry (${REGISTRY_REL}).\n`);
  return 0;
}

async function cmdRemove(slug: string): Promise<number> {
  if (!slug || !SLUG.test(slug)) {
    console.error("Usage: npm run mfg -- app verified -- remove <slug>");
    return 1;
  }
  const reg = await loadRegistry();
  const before = reg.apps.length;
  reg.apps = reg.apps.filter((x) => x.slug !== slug);
  if (reg.apps.length === before) {
    console.error(`Slug "${slug}" was not in the verified registry.`);
    return 1;
  }
  await saveRegistry(reg);
  console.log(`\nOK: removed "${slug}" from ${REGISTRY_REL}.\n`);
  return 0;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { mode, slug, json, strict, help } = parseCli(argv);

  if (help) {
    printHelp();
    return;
  }

  if (mode === "add") {
    process.exitCode = await cmdAdd(slug!, strict);
    return;
  }
  if (mode === "remove") {
    process.exitCode = await cmdRemove(slug!);
    return;
  }

  await cmdList(json);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
