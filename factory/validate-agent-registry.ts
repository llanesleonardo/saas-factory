import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import registry from "./agent-registry.json" with { type: "json" };

type Registry = typeof registry;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

async function assertPathExists(repoRoot: string, relPath: string, label: string): Promise<void> {
  const full = path.join(repoRoot, relPath);
  try {
    await access(full);
  } catch {
    throw new Error(`Missing ${label}: ${relPath}`);
  }
}

async function assertJsonParseable(repoRoot: string, relPath: string, label: string): Promise<void> {
  const full = path.join(repoRoot, relPath);
  const raw = await readFile(full, "utf8");
  try {
    JSON.parse(raw);
  } catch (e: unknown) {
    throw new Error(`Invalid JSON in ${label} at ${relPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");

  const agents = (registry as Registry).agents;
  const agentIds = new Set(Object.keys(agents));

  const errors: string[] = [];

  if (!isNonEmptyString((registry as Registry).task_queue_file)) {
    errors.push("registry.task_queue_file must be a non-empty string");
  } else {
    await assertPathExists(repoRoot, (registry as Registry).task_queue_file, "task_queue_file");
  }

  for (const [id, a] of Object.entries(agents)) {
    if (!isNonEmptyString(a.file)) {
      errors.push(`agents.${id}.file must be a non-empty string`);
    } else {
      try {
        await assertPathExists(repoRoot, a.file, `agent file for ${id}`);
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    if (isNonEmptyString((a as any).context_pack)) {
      try {
        await assertPathExists(repoRoot, String((a as any).context_pack), `context_pack for ${id}`);
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    if (isNonEmptyString((a as any).output_schema)) {
      const schemaPath = String((a as any).output_schema);
      try {
        await assertPathExists(repoRoot, schemaPath, `output_schema for ${id}`);
        await assertJsonParseable(repoRoot, schemaPath, `output_schema for ${id}`);
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    const next = (a as any).next_agents;
    if (Array.isArray(next)) {
      for (const n of next) {
        if (typeof n !== "string") {
          errors.push(`agents.${id}.next_agents contains a non-string entry`);
          continue;
        }
        if (!agentIds.has(n)) {
          errors.push(`agents.${id}.next_agents references unknown agent "${n}"`);
        }
      }
    } else {
      errors.push(`agents.${id}.next_agents must be an array of agent ids`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log("OK — agent-registry.json references are valid.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

