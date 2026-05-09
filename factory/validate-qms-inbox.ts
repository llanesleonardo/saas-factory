import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type RoleId =
  | "pm"
  | "dev"
  | "quality"
  | "fix"
  | "git"
  | "builder"
  | "architect"
  | "security"
  | "devops"
  | "docs"
  | "support"
  | "tooling"
  | "finops"
  | "spike"
  | "spec-generator";

type QmsInboxRecordJson = {
  schema_version: 1;
  date_utc: string;
  agent_role: RoleId;
  task_id: string;
  depends_on?: string[];
  related_inbox_records?: string[];
  spec_pr_refs: string[];
  evidence_paths: string[];
  handoff_next_role: RoleId;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function walkFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = path.join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full, ext));
    else if (st.isFile() && e.endsWith(ext)) out.push(full);
  }
  return out.sort();
}

const ROLE_ENUM: readonly RoleId[] = [
  "pm",
  "dev",
  "quality",
  "fix",
  "git",
  "builder",
  "architect",
  "security",
  "devops",
  "docs",
  "support",
  "tooling",
  "finops",
  "spike",
  "spec-generator",
] as const;

function validateCompanionJson(filePath: string, data: unknown): string[] {
  const errs: string[] = [];
  if (!isRecord(data)) return [`${filePath}: JSON must be an object`];

  if (data.schema_version !== 1) errs.push(`${filePath}: schema_version must be 1`);
  if (!isNonEmptyString(data.date_utc) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(data.date_utc)) {
    errs.push(`${filePath}: date_utc must match YYYY-MM-DD`);
  }
  if (!isNonEmptyString(data.agent_role) || !ROLE_ENUM.includes(data.agent_role as RoleId)) {
    errs.push(`${filePath}: agent_role must be one of: ${ROLE_ENUM.join(", ")}`);
  }
  if (!isNonEmptyString(data.task_id)) errs.push(`${filePath}: task_id required string`);

  if (!Array.isArray(data.spec_pr_refs) || !isStringArray(data.spec_pr_refs) || data.spec_pr_refs.length === 0) {
    errs.push(`${filePath}: spec_pr_refs must be non-empty array of strings`);
  }
  if (
    !Array.isArray(data.evidence_paths) ||
    !isStringArray(data.evidence_paths) ||
    data.evidence_paths.length === 0
  ) {
    errs.push(`${filePath}: evidence_paths must be non-empty array of strings`);
  }

  if (data.depends_on !== undefined && (!Array.isArray(data.depends_on) || !isStringArray(data.depends_on))) {
    errs.push(`${filePath}: depends_on must be array of strings when present`);
  }
  if (
    data.related_inbox_records !== undefined &&
    (!Array.isArray(data.related_inbox_records) || !isStringArray(data.related_inbox_records))
  ) {
    errs.push(`${filePath}: related_inbox_records must be array of strings when present`);
  }

  if (!isNonEmptyString(data.handoff_next_role) || !ROLE_ENUM.includes(data.handoff_next_role as RoleId)) {
    errs.push(`${filePath}: handoff_next_role must be one of: ${ROLE_ENUM.join(", ")}`);
  }

  return errs;
}

function validateMarkdownRecord(filePath: string, md: string): string[] {
  const errs: string[] = [];

  // Legacy inbox records exist that predate the standardized template headings.
  // Enforce the template strictly only when the record opts into it by using the canonical title heading.
  const usesTemplate = md.includes("# Agent action record");
  if (!usesTemplate) return [];

  // Parse markdown headings so we can accept common synonyms (e.g. "Verification / evidence", "Follow-ups").
  const headings = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("#"))
    .map((l) => l.replace(/^#+\s+/, "").toLowerCase());

  const has = (needle: string): boolean => headings.includes(needle.toLowerCase());

  if (!has("agent action record")) errs.push(`${filePath}: missing required heading "# Agent action record"`);
  if (!headings.includes("document metadata")) errs.push(`${filePath}: missing required heading "## Document metadata"`);
  if (!headings.includes("actions performed")) errs.push(`${filePath}: missing required heading "## Actions performed"`);

  const hasEvidenceSection = headings.some((h) => h.includes("evidence") || h.includes("verification"));
  const hasHandoffSection = headings.some((h) => h.includes("handoff") || h.includes("follow-ups") || h.includes("next"));
  if (!hasEvidenceSection) errs.push(`${filePath}: missing an evidence section (e.g. "## Evidence" or "## Verification / evidence")`);
  if (!hasHandoffSection) errs.push(`${filePath}: missing a handoff section (e.g. "## Handoff" or "## Follow-ups")`);

  return errs;
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const inboxDir = path.resolve(__dirname, "..", "organizational_memory", "QMS", "inbox");

  const mdFiles = walkFiles(inboxDir, ".md");
  if (mdFiles.length === 0) throw new Error(`No inbox markdown files found under: ${inboxDir}`);

  const errors: string[] = [];

  for (const mdPath of mdFiles) {
    const md = readFileSync(mdPath, "utf8");
    errors.push(...validateMarkdownRecord(mdPath, md));

    const jsonPath = mdPath.replace(/\.md$/i, ".json");
    try {
      const st = statSync(jsonPath);
      if (st.isFile()) {
        const raw = readFileSync(jsonPath, "utf8").trim();
        if (!raw) {
          errors.push(`${jsonPath}: empty JSON file`);
        } else {
          const parsed = JSON.parse(raw) as unknown;
          errors.push(...validateCompanionJson(jsonPath, parsed));
        }
      }
    } catch {
      // companion JSON is optional
    }
  }

  if (errors.length > 0) {
    throw new Error(["QMS inbox validation failures:", ...errors.map((e) => `- ${e}`)].join("\n"));
  }

  console.log(`OK — QMS inbox records validate (${mdFiles.length} markdown files).`);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

