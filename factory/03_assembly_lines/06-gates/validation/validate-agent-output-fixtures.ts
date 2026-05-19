import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FixtureKind = "valid" | "invalid";

function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkJsonFiles(full));
    else if (st.isFile() && e.endsWith(".json")) out.push(full);
  }
  return out.sort();
}

function kindForFile(filePath: string): FixtureKind {
  return path.basename(filePath).startsWith("invalid-") ? "invalid" : "valid";
}

function agentKindForFile(filePath: string): "pm" | "dev" | "quality" {
  const parts = filePath.split(path.sep);
  const idx = parts.lastIndexOf("agent-output");
  const kind = parts[idx + 1];
  if (kind === "pm" || kind === "dev" || kind === "quality") return kind;
  throw new Error(`Cannot determine agent kind from path: ${filePath}`);
}

function runValidate(repoRoot: string, kind: "pm" | "dev" | "quality", fixturePath: string): { exitCode: number; stderr: string } {
  const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(repoRoot, "factory", "03_assembly_lines", "06-gates", "validation", "validate-agent-output.ts");
  const r = spawnSync(process.execPath, [tsxCli, script, kind, fixturePath], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  return { exitCode: r.status ?? 1, stderr: String(r.stderr ?? "") };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const fixturesDir = path.join(__dirname, "..", "fixtures", "agent-output");
  const files = walkJsonFiles(fixturesDir);
  assert(files.length > 0, "No fixture files found under factory/03_assembly_lines/06-gates/fixtures/agent-output/");

  const failures: string[] = [];
  for (const f of files) {
    const kind = agentKindForFile(f);
    const expected = kindForFile(f);
    const { exitCode, stderr } = runValidate(repoRoot, kind, f);
    const base = path.relative(fixturesDir, f);
    if (expected === "valid" && exitCode !== 0) {
      failures.push(`Expected PASS but failed: ${base}\n${stderr}`.trim());
    }
    if (expected === "invalid" && exitCode === 0) {
      failures.push(`Expected FAIL but passed: ${base}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(["Fixture validation failures:", ...failures.map((s) => `\n---\n${s}`)].join("\n"));
  }

  console.log(`OK — validate-agent-output fixtures passed (${files.length} files).`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

