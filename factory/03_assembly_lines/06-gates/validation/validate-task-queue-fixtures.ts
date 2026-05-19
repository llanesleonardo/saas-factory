import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FixtureKind = "valid" | "invalid";

function listFixtureFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort();
}

function kindForFile(filePath: string): FixtureKind {
  const base = path.basename(filePath);
  return base.startsWith("invalid-") ? "invalid" : "valid";
}

function runValidate(repoRoot: string, queuePath: string): { exitCode: number; stderr: string } {
  const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(repoRoot, "factory", "03_assembly_lines", "06-gates", "validation", "validate-task-queue.ts");
  const r = spawnSync(process.execPath, [tsxCli, script, `--queue=${queuePath}`], {
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
  const fixturesDir = path.join(__dirname, "..", "fixtures", "task-queue");
  const files = listFixtureFiles(fixturesDir);
  assert(files.length > 0, "No fixture files found under factory/03_assembly_lines/06-gates/fixtures/task-queue/");

  const failures: string[] = [];

  for (const f of files) {
    const kind = kindForFile(f);
    const { exitCode, stderr } = runValidate(repoRoot, f);
    if (kind === "valid" && exitCode !== 0) {
      failures.push(`Expected PASS but failed: ${path.basename(f)}\n${stderr}`.trim());
    }
    if (kind === "invalid" && exitCode === 0) {
      failures.push(`Expected FAIL but passed: ${path.basename(f)}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(["Fixture validation failures:", ...failures.map((s) => `\n---\n${s}`)].join("\n"));
  }

  console.log(`OK — validate-task-queue fixtures passed (${files.length} files).`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

