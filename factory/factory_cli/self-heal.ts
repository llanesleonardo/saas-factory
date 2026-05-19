import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ensureTelemetryDir, repoRootFromHere } from "../factory_internal_ops/telemetry.js";

type QualityStatus = "pass" | "fail";

type QualityError = {
  layer?: string;
  file?: string;
  issue: string;
  evidence?: string;
  how_to_repro?: string;
  acceptance_criterion?: string;
};

type QualityOutput = {
  schema_version?: 1;
  task_id: string;
  scope?: string;
  status: QualityStatus;
  summary?: string;
  commands_run?: string[];
  errors: QualityError[];
  handoff_to?: string;
};

type FailurePacket = {
  schema_version: 1;
  timestamp_utc: string;
  task_id_primary?: string;
  app?: string;
  kind: "quality_gate";
  failing_command: string;
  errors: Array<{
    code: string;
    message: string;
    evidence?: string;
    file?: string;
    how_to_repro?: string;
  }>;
  source_ref: { type: "file"; path: string };
};

function nowIso(): string {
  return new Date().toISOString();
}

function utcDayNow(): string {
  return nowIso().slice(0, 10);
}

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

function normalizeQualityToFailurePacket(q: QualityOutput, sourcePath: string): FailurePacket {
  const failingCommand = q.commands_run?.[0] ?? "unknown";
  const errors = (q.errors ?? []).map((e, idx) => ({
    code: `QUALITY_ERROR_${String(idx + 1).padStart(2, "0")}`,
    message: e.issue,
    evidence: e.evidence,
    file: e.file,
    how_to_repro: e.how_to_repro,
  }));

  return {
    schema_version: 1,
    timestamp_utc: nowIso(),
    task_id_primary: q.task_id,
    kind: "quality_gate",
    failing_command: failingCommand,
    errors,
    source_ref: { type: "file", path: sourcePath },
  };
}

function suggestionLibrary(pkt: FailurePacket): {
  diagnosis: string[];
  fix_plan: string[];
  patch_scope: string[];
  rerun_commands: string[];
  handoff_role: "fix" | "tooling" | "dev" | "quality";
  risk_notes: string[];
} {
  const diagnosis: string[] = [];
  const fixPlan: string[] = [];
  const patchScope = new Set<string>();
  const rerun = new Set<string>();
  let handoff: "fix" | "tooling" | "dev" | "quality" = "fix";
  const risks: string[] = [];

  if (pkt.errors.length === 0) {
    diagnosis.push("Quality reported fail but provided zero structured errors.");
    fixPlan.push("Re-run the Quality gate command and ensure errors[] is populated per schema.");
    fixPlan.push("Attach evidence pointers (file paths or artifact links) for each error.");
    rerun.add(pkt.failing_command === "unknown" ? "npm run check" : pkt.failing_command);
    handoff = "quality";
    risks.push("Without errors/evidence, any patch proposal would be guesswork (forbidden).");
    return {
      diagnosis,
      fix_plan: fixPlan,
      patch_scope: [],
      rerun_commands: [...rerun],
      handoff_role: handoff,
      risk_notes: risks,
    };
  }

  // Heuristics: keep deterministic and conservative.
  const text = pkt.errors.map((e) => `${e.message} ${e.file ?? ""}`.toLowerCase()).join("\n");

  if (text.includes("validate-task-queue") || text.includes("task queue")) {
    diagnosis.push("Failure appears related to task queue integrity/validation.");
    fixPlan.push("Run `npm run mfg -- validate task-queue` to reproduce and read the failing task id(s).");
    fixPlan.push("Fix ids, depends_on, and status fields in the canonical task queue, then re-run validation.");
    rerun.add("npm run mfg -- validate task-queue");
    patchScope.add("factory/03_assembly_lines/03-registry/registry/task-queue.json");
    patchScope.add("factory/01_production_planning/01_03_task-registry/*/phase-breakdown-*.json");
    handoff = "tooling";
  }

  if (text.includes("validate-tool-registry") || text.includes("tool-registry")) {
    diagnosis.push("Failure appears related to tool registry validation.");
    fixPlan.push("Run `npm run mfg -- validate tool-registry` and update `factory/03_assembly_lines/03-registry/registry/tool-registry.json` references.");
    rerun.add("npm run mfg -- validate tool-registry");
    patchScope.add("factory/03_assembly_lines/03-registry/registry/tool-registry.json");
    handoff = "tooling";
  }

  if (text.includes("tsc") || text.includes("typescript") || text.includes("typecheck")) {
    diagnosis.push("Failure appears related to TypeScript typecheck.");
    fixPlan.push("Run `npm run check` and patch the minimal files referenced by the error output.");
    rerun.add("npm run check");
    handoff = "fix";
  }

  if (text.includes("eslint") || text.includes("lint")) {
    diagnosis.push("Failure appears related to linting.");
    fixPlan.push("Run the relevant lint command and apply the smallest fix that satisfies the rule.");
    rerun.add("npm run lint -w apps/todo-instance");
    handoff = "fix";
  }

  if (diagnosis.length === 0) {
    diagnosis.push("Failure did not match known heuristics; follow structured errors to reproduce.");
    fixPlan.push("Reproduce using the failing command and focus only on files referenced in errors/evidence.");
    rerun.add(pkt.failing_command === "unknown" ? "npm run check" : pkt.failing_command);
    risks.push("If errors reference security/billing/auth boundaries, request Security review before patching.");
  }

  // Universal governance reminders
  risks.push("No auto-merge: any patch must go through PR review.");
  risks.push("Quality re-run required after patch.");

  return {
    diagnosis,
    fix_plan: fixPlan,
    patch_scope: [...patchScope].sort(),
    rerun_commands: [...rerun].sort(),
    handoff_role: handoff,
    risk_notes: risks,
  };
}

function renderReport(args: {
  pkt: FailurePacket;
  qualityPath: string;
  plan: ReturnType<typeof suggestionLibrary>;
}): string {
  const { pkt, qualityPath, plan } = args;
  const lines: string[] = [];

  lines.push("# Self-healing report (strictly gated)");
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Evidence source: \`${qualityPath}\``);
  lines.push(`- Failure kind: **${pkt.kind}**`);
  lines.push(`- Failing command: \`${pkt.failing_command}\``);
  lines.push("");

  lines.push("## Failure packet reference");
  lines.push("```json");
  lines.push(JSON.stringify(pkt, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## Diagnosis");
  for (const d of plan.diagnosis) lines.push(`- ${d}`);
  lines.push("");

  lines.push("## Proposed fix plan");
  for (const s of plan.fix_plan) lines.push(`- ${s}`);
  lines.push("");

  lines.push("## Patch scope (bounded)");
  if (plan.patch_scope.length === 0) {
    lines.push("- (not enough evidence to propose specific files)");
  } else {
    for (const f of plan.patch_scope) lines.push(`- \`${f}\``);
  }
  lines.push("");

  lines.push("## Commands to re-run (Quality gate)");
  for (const c of plan.rerun_commands) lines.push(`- \`${c}\``);
  lines.push("");

  lines.push("## Risk notes / governance");
  for (const r of plan.risk_notes) lines.push(`- ${r}`);
  lines.push("");

  lines.push("## Handoff");
  lines.push(`Next role: **${plan.handoff_role}**`);
  lines.push("");

  return lines.join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(
      [
        "Usage:",
        "  npm run mfg -- line self-heal -- --quality <path-to-quality-output.json> [--out <path.md>] [--json]",
        "",
        "Notes:",
        "- Generates a strictly-gated self-healing report (no auto-merge, no code changes).",
        "- Output defaults under factory/telemetry/self-heal/ (gitignored).",
      ].join("\n"),
    );
    process.exitCode = 0;
    return;
  }

  const qualityPath = parseArgValue(argv, "quality");
  if (!qualityPath) die("Missing --quality <path-to-quality-output.json>");

  const repoRoot = repoRootFromHere(import.meta.url);
  const raw = await readFile(qualityPath, "utf8");
  const q = JSON.parse(raw) as QualityOutput;

  if (q.status === "pass") {
    console.log(JSON.stringify({ status: "noop", reason: "quality_pass", task_id: q.task_id }, null, 2));
    return;
  }

  const pkt = normalizeQualityToFailurePacket(q, qualityPath);
  const plan = suggestionLibrary(pkt);

  const localDir = await ensureTelemetryDir(repoRoot);
  const outDir = path.join(localDir, "self-heal");
  await mkdir(outDir, { recursive: true });
  const defaultOut = path.join(outDir, `self-heal-${utcDayNow()}-${q.task_id}.md`);
  const outPath = parseArgValue(argv, "out") ?? defaultOut;

  const report = renderReport({ pkt, qualityPath, plan });
  await writeFile(outPath, report, "utf8");

  if (hasFlag(argv, "--json")) {
    console.log(
      JSON.stringify(
        {
          status: "ok",
          written_to: outPath,
          task_id: q.task_id,
          failing_command: pkt.failing_command,
          handoff_role: plan.handoff_role,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Wrote self-healing report: ${outPath}`);
  console.log(`Next role: ${plan.handoff_role}`);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

