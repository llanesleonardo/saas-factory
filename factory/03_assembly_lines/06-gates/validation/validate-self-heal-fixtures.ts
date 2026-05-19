import { readdir, readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";


type CaseResult = { case_dir: string; ok: boolean; error?: string };

function assertIncludes(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Missing ${label}: expected to include ${JSON.stringify(needle)}`);
  }
}

function runSelfHealViaTsx(repoRoot: string, qualityPath: string, outPath: string): void {
  // Avoid `npx` (network) — use local tsx package directly.
  const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(repoRoot, "factory", "factory_cli", "self-heal.ts");
  const r = spawnSync(process.execPath, [tsxCli, script, `--quality=${qualityPath}`, `--out=${outPath}`], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if ((r.status ?? 1) !== 0) {
    throw new Error(`self-heal failed (exit=${r.status}): ${String(r.stderr ?? r.stdout ?? "").trim()}`);
  }
}

async function runOneCase(repoRoot: string, caseDir: string): Promise<void> {
  const qualityPath = path.join(caseDir, "quality.json");
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "self-heal-fixture-"));
  const outPath = path.join(tmpDir, "report.md");

  runSelfHealViaTsx(repoRoot, qualityPath, outPath);

  const md = await readFile(outPath, "utf8");
  assertIncludes(md, "# Self-healing report (strictly gated)", "title");
  assertIncludes(md, "## Summary", "summary section");
  assertIncludes(md, "## Failure packet reference", "failure packet section");
  assertIncludes(md, "## Proposed fix plan", "fix plan section");
  assertIncludes(md, "## Commands to re-run (Quality gate)", "commands section");
  assertIncludes(md, "## Handoff", "handoff section");

  const name = path.basename(caseDir);
  if (name === "valid-empty-errors") {
    assertIncludes(md, "Next role: **quality**", "handoff role");
    assertIncludes(md, "Quality reported fail but provided zero structured errors.", "diagnosis text");
  } else if (name === "valid-task-queue-hint") {
    assertIncludes(md, "Next role: **tooling**", "handoff role");
    assertIncludes(md, "npm run mfg -- validate task-queue", "rerun command");
    assertIncludes(md, "`factory/03_assembly_lines/03-registry/registry/task-queue.json`", "patch scope hint");
  }
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const root = path.join(__dirname, "..", "fixtures", "self-heal", "cases");
  const entries = await readdir(root, { withFileTypes: true });
  const caseDirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));

  const results: CaseResult[] = [];
  for (const dir of caseDirs) {
    try {
      await runOneCase(repoRoot, dir);
      results.push({ case_dir: path.basename(dir), ok: true });
    } catch (e: unknown) {
      results.push({ case_dir: path.basename(dir), ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  if (failed.length) process.exitCode = 1;
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

