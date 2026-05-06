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

function validatePm(data: unknown): void {
  if (!isRecord(data) || !Array.isArray(data.tasks)) {
    err(["PM output must be an object with tasks[]"]);
  }
  const tasks = data.tasks as unknown[];
  if (tasks.length === 0) {
    err(["tasks must be non-empty"]);
  }
  const msgs: string[] = [];
  const allowedStatus = new Set(["backlog", "ready", "in_progress", "blocked", "done"]);
  tasks.forEach((t, i) => {
    if (!isRecord(t)) {
      msgs.push(`tasks[${i}] must be object`);
      return;
    }
    if (typeof t.id !== "string" || t.id.length < 2) {
      msgs.push(`tasks[${i}].id required string`);
    }
    if (typeof t.title !== "string" || t.title.length < 3) {
      msgs.push(`tasks[${i}].title required string (min 3 chars)`);
    }
    if (t.status !== undefined && !allowedStatus.has(String(t.status))) {
      msgs.push(`tasks[${i}].status invalid`);
    }
    if (t.depends_on !== undefined && !Array.isArray(t.depends_on)) {
      msgs.push(`tasks[${i}].depends_on must be array`);
    }
    if (t.acceptance_criteria !== undefined && !Array.isArray(t.acceptance_criteria)) {
      msgs.push(`tasks[${i}].acceptance_criteria must be array`);
    }
  });
  if (msgs.length) err(msgs);
}

function validateDev(data: unknown): void {
  if (!isRecord(data)) err(["Dev output must be object"]);
  const msgs: string[] = [];
  if (typeof data.task_id !== "string") msgs.push("task_id required");
  if (!Array.isArray(data.files_changed) || data.files_changed.length === 0) {
    msgs.push("files_changed must be non-empty array");
  }
  if (typeof data.summary !== "string" || data.summary.length < 10) {
    msgs.push("summary required (min 10 chars)");
  }
  const ht = data.handoff_to;
  const allowed = new Set(["quality", "tooling", "pm", "architect"]);
  if (typeof ht !== "string" || !allowed.has(ht)) {
    msgs.push(`handoff_to must be one of: ${[...allowed].join(", ")}`);
  }
  if (msgs.length) err(msgs);
}

function validateQuality(data: unknown): void {
  if (!isRecord(data)) err(["Quality output must be object"]);
  const msgs: string[] = [];
  if (typeof data.task_id !== "string") msgs.push("task_id required");
  const st = data.status;
  if (st !== "pass" && st !== "fail") msgs.push('status must be "pass" or "fail"');
  if (!Array.isArray(data.errors)) msgs.push("errors must be array (empty on pass)");
  if (st === "fail" && Array.isArray(data.errors) && data.errors.length === 0) {
    msgs.push('when status is "fail", errors[] should be non-empty');
  }
  if (Array.isArray(data.errors)) {
    data.errors.forEach((e, i) => {
      if (!isRecord(e) || typeof e.issue !== "string") {
        msgs.push(`errors[${i}].issue required string`);
      }
    });
  }
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
