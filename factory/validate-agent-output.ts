/**
 * Validates agent JSON payloads against factory/schemas/*.schema.json (subset enforced in code).
 * Usage:
 *   npm run validate-agent-output -- pm <file.json>
 *   npm run validate-agent-output -- pm   # stdin JSON
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type AgentKind = "pm" | "dev" | "quality";
type JsonPath = string;

function readJsonInput(filePath: string | undefined): unknown {
  const raw =
    filePath !== undefined
      ? readFileSync(path.resolve(filePath), "utf8")
      : readFileSync(0, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty JSON input");
  }
  return JSON.parse(trimmed) as unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function err(messages: string[]): never {
  throw new Error(messages.join("\n"));
}

function pathOf(base: JsonPath, segment: string | number): JsonPath {
  return typeof segment === "number" ? `${base}[${segment}]` : `${base}.${segment}`;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function assertSchemaVersion1(data: Record<string, unknown>, kind: AgentKind, msgs: string[]): void {
  if (data.schema_version === undefined) return;
  if (data.schema_version !== 1) {
    msgs.push(`${kind}: schema_version must be 1 when present`);
  }
}

function assertTaskIdPattern(id: string, p: JsonPath, msgs: string[]): void {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
    msgs.push(`${p} must match ^[A-Za-z][A-Za-z0-9_-]*$`);
  }
}

function assertStringArray(v: unknown, p: JsonPath, msgs: string[]): void {
  if (v === undefined) return;
  if (!isStringArray(v)) msgs.push(`${p} must be array of strings`);
}

function validatePm(data: unknown): void {
  if (!isRecord(data) || !Array.isArray(data.tasks)) {
    err(["pm: output must be an object with tasks[]"]);
  }
  const tasks = data.tasks as unknown[];
  if (tasks.length === 0) {
    err(["tasks must be non-empty"]);
  }
  const msgs: string[] = [];
  assertSchemaVersion1(data, "pm", msgs);
  const allowedStatus = new Set(["backlog", "ready", "in_progress", "blocked", "done"]);
  tasks.forEach((t, i) => {
    if (!isRecord(t)) {
      msgs.push(`tasks[${i}] must be object`);
      return;
    }
    const base = `tasks[${i}]`;
    if (typeof t.id !== "string" || t.id.length < 2) {
      msgs.push(`${base}.id required string`);
    } else {
      assertTaskIdPattern(t.id, `${base}.id`, msgs);
    }
    if (typeof t.title !== "string" || t.title.length < 3) {
      msgs.push(`${base}.title required string (min 3 chars)`);
    }
    if (t.status !== undefined && !allowedStatus.has(String(t.status))) {
      msgs.push(`${base}.status invalid`);
    }
    if (t.depends_on !== undefined && !Array.isArray(t.depends_on)) {
      msgs.push(`${base}.depends_on must be array`);
    }
    if (t.depends_on !== undefined && !isStringArray(t.depends_on)) {
      msgs.push(`${base}.depends_on must be array of strings`);
    }
    assertStringArray(t.acceptance_criteria, `${base}.acceptance_criteria`, msgs);

    const assigned = t.assigned_agent;
    if (assigned !== undefined && typeof assigned !== "string") {
      msgs.push(`${base}.assigned_agent must be string`);
    }
  });
  if (msgs.length) err(msgs);
}

function validateDev(data: unknown): void {
  if (!isRecord(data)) err(["dev: output must be object"]);
  const msgs: string[] = [];
  assertSchemaVersion1(data, "dev", msgs);
  if (typeof data.task_id !== "string" || data.task_id.length === 0) msgs.push("task_id required");
  if (!Array.isArray(data.files_changed) || data.files_changed.length === 0 || !isStringArray(data.files_changed)) {
    msgs.push("files_changed must be non-empty array of strings");
  }
  if (typeof data.summary !== "string" || data.summary.length < 10) {
    msgs.push("summary required (min 10 chars)");
  }
  if (data.branch !== undefined && typeof data.branch !== "string") {
    msgs.push("branch must be string");
  }
  assertStringArray(data.tests_added, "tests_added", msgs);
  assertStringArray(data.commands_run, "commands_run", msgs);
  assertStringArray(data.known_issues, "known_issues", msgs);
  const ht = data.handoff_to;
  const allowed = new Set(["quality", "tooling", "pm", "architect"]);
  if (typeof ht !== "string" || !allowed.has(ht)) {
    msgs.push(`handoff_to must be one of: ${[...allowed].join(", ")}`);
  }
  if (msgs.length) err(msgs);
}

function validateQuality(data: unknown): void {
  if (!isRecord(data)) err(["quality: output must be object"]);
  const msgs: string[] = [];
  assertSchemaVersion1(data, "quality", msgs);
  if (typeof data.task_id !== "string" || data.task_id.length === 0) msgs.push("task_id required");
  const st = data.status;
  if (st !== "pass" && st !== "fail") msgs.push('status must be "pass" or "fail"');
  if (!Array.isArray(data.errors)) msgs.push("errors must be array (empty on pass)");
  if (st === "fail" && Array.isArray(data.errors) && data.errors.length === 0) {
    msgs.push('when status is "fail", errors[] should be non-empty');
  }
  if (data.scope !== undefined) {
    const allowedScope = new Set(["gates", "harness", "harness_and_gates"]);
    if (typeof data.scope !== "string" || !allowedScope.has(data.scope)) {
      msgs.push('scope must be one of: "gates" | "harness" | "harness_and_gates"');
    }
  }
  if (data.summary !== undefined && typeof data.summary !== "string") msgs.push("summary must be string");
  assertStringArray(data.checks_executed, "checks_executed", msgs);
  assertStringArray(data.acceptance_criteria_verified, "acceptance_criteria_verified", msgs);
  assertStringArray(data.commands_run, "commands_run", msgs);
  assertStringArray(data.screenshots, "screenshots", msgs);
  if (data.coverage_summary !== undefined && typeof data.coverage_summary !== "string") msgs.push("coverage_summary must be string");
  if (data.final_verdict !== undefined && typeof data.final_verdict !== "string") msgs.push("final_verdict must be string");

  const allowedLayer = new Set(["api", "ui", "db", "auth", "integration", "harness", "flake_suspected"]);
  if (Array.isArray(data.errors)) {
    data.errors.forEach((e, i) => {
      const p = `errors[${i}]`;
      if (!isRecord(e)) {
        msgs.push(`${p} must be object`);
        return;
      }
      if (typeof e.issue !== "string" || e.issue.length === 0) {
        msgs.push(`${p}.issue required string`);
      }
      if (e.layer !== undefined && (typeof e.layer !== "string" || !allowedLayer.has(e.layer))) {
        msgs.push(`${p}.layer invalid`);
      }
      if (e.file !== undefined && typeof e.file !== "string") msgs.push(`${p}.file must be string`);
      if (e.evidence !== undefined && typeof e.evidence !== "string") msgs.push(`${p}.evidence must be string`);
      if (e.how_to_repro !== undefined && typeof e.how_to_repro !== "string") msgs.push(`${p}.how_to_repro must be string`);
      if (e.acceptance_criterion !== undefined && typeof e.acceptance_criterion !== "string") {
        msgs.push(`${p}.acceptance_criterion must be string`);
      }
    });
  }
  if (data.issues_found !== undefined && !Array.isArray(data.issues_found)) {
    msgs.push("issues_found must be array when present");
  }
  if (data.handoff_to !== undefined) {
    const allowedHandoff = new Set(["fix", "git", "dev", "tooling", "pm"]);
    if (typeof data.handoff_to !== "string" || !allowedHandoff.has(data.handoff_to)) {
      msgs.push("handoff_to invalid");
    }
  }
  assertStringArray(data.known_issues_documented, "known_issues_documented", msgs);
  if (msgs.length) err(msgs);
}

function parseKind(arg: string): AgentKind {
  const k = arg.toLowerCase();
  if (k === "pm" || k === "dev" || k === "quality") return k;
  throw new Error(`Unknown agent kind "${arg}". Use: pm | dev | quality`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    console.log(`Usage: validate-agent-output <pm|dev|quality> [path/to.json]\n  Omit path to read JSON from stdin.`);
    process.exitCode = 0;
    return;
  }
  const kind = parseKind(argv[0]!);
  const filePath = argv[1];
  const data = readJsonInput(filePath);
  if (kind === "pm") validatePm(data);
  else if (kind === "dev") validateDev(data);
  else validateQuality(data);
  console.log(`OK — ${kind} output validates against factory rules.`);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  try {
    main();
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}
