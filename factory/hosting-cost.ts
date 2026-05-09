import { estimateHostingBaseline, type AppSize, type ProviderId } from "./hosting-cost-shared.js";

function parseArgValue(argv: string[], name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1]!;
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function die(msg: string): never {
  throw new Error(msg);
}

function parseProvider(v: string | undefined): ProviderId {
  if (v === "aws" || v === "azure" || v === "gcp" || v === "digitalocean") return v;
  die(`Missing/invalid --provider (aws|azure|gcp|digitalocean). Got: ${JSON.stringify(v)}`);
}

function parseSize(v: string | undefined): AppSize {
  if (!v) return "small";
  if (v === "tiny" || v === "small" || v === "medium") return v;
  die(`Invalid --size (tiny|small|medium). Got: ${JSON.stringify(v)}`);
}


function main(): void {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(
      [
        "Usage:",
        "  npm run factory:hosting-cost -- --app <app> --provider <aws|azure|gcp|digitalocean> [--size tiny|small|medium] [--json]",
        "",
        "Examples:",
        "  npm run factory:hosting-cost -- --app apps/todo-instance --provider digitalocean --size small --json",
        "  npm run factory:hosting-cost -- --app apps/todo-instance --provider aws --size tiny",
        "",
        "Notes:",
        "- Output is a baseline compute-only estimate. It intentionally excludes DB/storage/egress/etc.",
        "- Prices are approximate; see sources in JSON output for what baseline was used.",
      ].join("\n"),
    );
    process.exitCode = 0;
    return;
  }

  const app = parseArgValue(argv, "app");
  if (!app) die("Missing --app (e.g. apps/todo-instance)");
  const provider = parseProvider(parseArgValue(argv, "provider"));
  const size = parseSize(parseArgValue(argv, "size"));
  const asJson = hasFlag(argv, "--json");

  const out = estimateHostingBaseline(app, provider, size);
  if (asJson) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`Estimated monthly cost (baseline) — provider=${provider} size=${size}: $${out.monthly_usd} USD`);
  console.log(`App: ${app}`);
  console.log("Excludes: " + out.excludes.join(", "));
}

try {
  main();
} catch (e: unknown) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}

