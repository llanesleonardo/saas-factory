import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import agentRegistry from "../../../02_workforce/02_00_agents/agent-registry.json" with { type: "json" };

type ToolKind = "npm_script" | "tsx_cli" | "workflow" | "doc_procedure";
type ArtifactType = "json" | "md" | "artifact" | "stdout";

type ToolEntry = {
  tool_id: string;
  title: string;
  owner_role: string;
  kind: ToolKind;
  scope?: string;
  how_to_run: {
    command?: string;
    workflow_file?: string;
    trigger?: string;
    doc_path?: string;
  };
  artifacts: Array<{ type: ArtifactType; path?: string; description: string }>;
};

type ToolRegistry = { schema_version: 1; tools: ToolEntry[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function loadPackageScripts(repoRoot: string): Set<string> {
  const pkgPath = path.join(repoRoot, "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as unknown;
  if (!isRecord(pkg) || !isRecord(pkg.scripts)) return new Set();
  return new Set(Object.keys(pkg.scripts));
}

function parseNpmRunScript(command: string): string | undefined {
  // Accept: "npm run <script>" or "npm run <script> -- ..."
  const m = command.trim().match(/^npm\s+run\s+([A-Za-z0-9:_-]+)\b/);
  return m?.[1];
}

function validateToolRegistry(reg: ToolRegistry, repoRoot: string): string[] {
  const errors: string[] = [];
  const roles = new Set(Object.keys((agentRegistry as any).agents ?? {}));
  const scripts = loadPackageScripts(repoRoot);

  if (reg.schema_version !== 1) errors.push(`schema_version must be 1`);
  if (!Array.isArray(reg.tools) || reg.tools.length === 0) errors.push(`tools[] must be non-empty`);

  const seen = new Set<string>();
  for (let i = 0; i < (reg.tools?.length ?? 0); i++) {
    const t = reg.tools[i]!;
    const p = `tools[${i}]`;

    if (!/^TOOL_[A-Z0-9_]+$/.test(t.tool_id)) errors.push(`${p}.tool_id must match ^TOOL_[A-Z0-9_]+$`);
    if (seen.has(t.tool_id)) errors.push(`${p}.tool_id duplicate: ${t.tool_id}`);
    seen.add(t.tool_id);

    if (typeof t.title !== "string" || t.title.trim().length < 3) errors.push(`${p}.title required`);
    if (typeof t.owner_role !== "string" || t.owner_role.trim().length === 0) errors.push(`${p}.owner_role required`);
    else if (!roles.has(t.owner_role)) errors.push(`${p}.owner_role unknown: ${t.owner_role}`);

    if (t.kind !== "npm_script" && t.kind !== "tsx_cli" && t.kind !== "workflow" && t.kind !== "doc_procedure") {
      errors.push(`${p}.kind invalid`);
    }

    // how_to_run checks
    if (!isRecord(t.how_to_run)) errors.push(`${p}.how_to_run required object`);
    else {
      if (t.kind === "npm_script" || t.kind === "tsx_cli") {
        const cmd = t.how_to_run.command;
        if (typeof cmd !== "string" || cmd.trim().length === 0) errors.push(`${p}.how_to_run.command required`);
        if (typeof cmd === "string" && cmd.includes("\n")) errors.push(`${p}.how_to_run.command must be single-line`);
        if (t.kind === "npm_script" && typeof cmd === "string") {
          const script = parseNpmRunScript(cmd);
          if (!script) errors.push(`${p}.how_to_run.command must start with "npm run <script>"`);
          else if (!scripts.has(script)) errors.push(`${p}.how_to_run.command references missing npm script: ${script}`);
        }
        if (t.kind === "tsx_cli" && typeof cmd === "string") {
          // best-effort: require it to be npx tsx
          if (!cmd.trim().startsWith("npx tsx ")) errors.push(`${p}.how_to_run.command should start with "npx tsx "`);
        }
      }
      if (t.kind === "workflow") {
        const wf = t.how_to_run.workflow_file;
        if (typeof wf !== "string" || wf.trim().length === 0) errors.push(`${p}.how_to_run.workflow_file required`);
        else {
          const wfAbs = path.join(repoRoot, wf);
          try {
            readFileSync(wfAbs, "utf8");
          } catch {
            errors.push(`${p}.how_to_run.workflow_file not found: ${wf}`);
          }
        }
        const trigger = t.how_to_run.trigger;
        if (typeof trigger !== "string" || trigger.trim().length === 0) errors.push(`${p}.how_to_run.trigger required`);
      }
      if (t.kind === "doc_procedure") {
        const doc = t.how_to_run.doc_path;
        if (typeof doc !== "string" || doc.trim().length === 0) errors.push(`${p}.how_to_run.doc_path required`);
        else {
          const docAbs = path.join(repoRoot, doc);
          try {
            readFileSync(docAbs, "utf8");
          } catch {
            errors.push(`${p}.how_to_run.doc_path not found: ${doc}`);
          }
        }
      }
    }

    // artifacts
    if (!Array.isArray(t.artifacts) || t.artifacts.length === 0) errors.push(`${p}.artifacts must be non-empty array`);
    else {
      t.artifacts.forEach((a, j) => {
        const ap = `${p}.artifacts[${j}]`;
        if (a.type !== "json" && a.type !== "md" && a.type !== "artifact" && a.type !== "stdout") {
          errors.push(`${ap}.type invalid`);
        }
        if (typeof a.description !== "string" || a.description.trim().length === 0) {
          errors.push(`${ap}.description required`);
        }
        if (a.path !== undefined) {
          if (typeof a.path !== "string" || a.path.trim().length === 0) errors.push(`${ap}.path must be string when present`);
          else {
            const abs = path.join(repoRoot, a.path);
            // Only verify repo paths (not build outputs) when they look like repo files.
            if (a.path.startsWith("factory/") || a.path.startsWith("organizational_memory/") || a.path.startsWith(".github/")) {
              try {
                readFileSync(abs, "utf8");
              } catch {
                errors.push(`${ap}.path not found: ${a.path}`);
              }
            }
          }
        }
      });
    }
  }

  return errors;
}

function readRegistry(repoRoot: string): ToolRegistry {
  const p = path.join(
    repoRoot,
    "factory",
    "03_assembly_lines",
    "03-registry",
    "registry",
    "tool-registry.json",
  );
  const raw = readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) throw new Error("factory/03_assembly_lines/03-registry/registry/tool-registry.json must be an object");
  if ((parsed as any).schema_version !== 1) throw new Error("tool-registry schema_version must be 1");
  if (!Array.isArray((parsed as any).tools)) throw new Error("tool-registry tools[] must be an array");
  // basic normalization: ensure entries have required keys before casting
  const tools = ((parsed as any).tools as unknown[]).map((t, i) => {
    if (!isRecord(t)) throw new Error(`tools[${i}] must be an object`);
    return t as unknown as ToolEntry;
  });
  return { schema_version: 1, tools };
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
  const reg = readRegistry(repoRoot);
  const errs = validateToolRegistry(reg, repoRoot);
  if (errs.length > 0) {
    throw new Error(["Tool registry validation failures:", ...errs.map((e) => `- ${e}`)].join("\n"));
  }
  console.log(`OK — tool-registry validates (${reg.tools.length} tools).`);
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

