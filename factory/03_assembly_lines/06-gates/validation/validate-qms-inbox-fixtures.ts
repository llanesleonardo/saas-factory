import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FixtureKind = "valid" | "invalid";

function listCaseDirs(casesRoot: string): string[] {
  return readdirSync(casesRoot)
    .map((e) => path.join(casesRoot, e))
    .filter((p) => statSync(p).isDirectory())
    .sort();
}

function kindForCaseDir(caseDir: string): FixtureKind {
  return path.basename(caseDir).startsWith("invalid-") ? "invalid" : "valid";
}

function runValidate(repoRoot: string, inboxDir: string): { exitCode: number; stderr: string } {
  const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(repoRoot, "factory", "03_assembly_lines", "06-gates", "validation", "validate-qms-inbox.ts");
  const r = spawnSync(process.execPath, [tsxCli, script, `--dir=${inboxDir}`], {
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
  const casesRoot = path.join(__dirname, "..", "fixtures", "qms-inbox", "cases");

  const caseDirs = listCaseDirs(casesRoot);
  assert(caseDirs.length > 0, "No fixture case directories found under factory/03_assembly_lines/06-gates/fixtures/qms-inbox/cases/");

  const failures: string[] = [];
  for (const caseDir of caseDirs) {
    const expected = kindForCaseDir(caseDir);
    const { exitCode, stderr } = runValidate(repoRoot, caseDir);
    const base = path.relative(casesRoot, caseDir);

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

  console.log(`OK — validate-qms-inbox fixtures passed (${caseDirs.length} cases).`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

