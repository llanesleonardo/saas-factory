# Factory OS — Tool Registry (spec)

## Purpose & scope

The **Tool Registry** is the Factory OS catalog of **operator-invokable tools** (CLI commands, scripts, and repeatable procedures) that:

- Are used by humans (and agents) during delivery.
- Must remain **stable, discoverable, and validated** as the repo evolves.

This spec defines the Tool Registry’s:

- **Contract** (fields and semantics)
- **Lifecycle** (how tools are added, changed, deprecated)
- **Referencing model** (how roles/docs refer to tools without duplicating command strings everywhere)

Out of scope:

- Implementing the registry file or validator (see `FACTORY_OS_002_tool_registry_json_and_validator`).
- Any secret values; only **names** and **paths** are permitted.

## Design principles

- **Single source of truth**: commands live in one place; docs and roles link to tool ids.
- **Stable ids**: ids do not change unless a tool is genuinely replaced (use deprecation instead).
- **No secrets**: registry never stores tokens, passwords, or unredacted logs.
- **Validated references**: tool ids referenced from role prompts/docs can be validated by CI.

## Registry contract (conceptual)

The registry is a collection of tool entries keyed by a stable `tool_id`.

### Required fields (per tool)

- **`tool_id`** (string)
  - Stable identifier; recommended pattern: `TOOL_<AREA>_<NAME>` or `FACTORY_TOOL_<NAME>`.
- **`title`** (string)
  - Human-friendly name.
- **`owner_role`** (enum string)
  - Which role owns correctness and evolution of this tool entry.
  - Must align with role ids in `factory/agent-registry.json` (e.g. `tooling`, `quality`, `devops`, `docs`).
- **`kind`** (enum string)
  - One of: `npm_script` | `tsx_cli` | `workflow` | `doc_procedure`.
- **`how_to_run`** (object)
  - For `npm_script`: `{ "command": "npm run <script> [-- args]" }`
  - For `tsx_cli`: `{ "command": "npx tsx <path> [args]" }`
  - For `workflow`: `{ "workflow_file": ".github/workflows/<name>.yml", "trigger": "pull_request|push|workflow_dispatch" }`
  - For `doc_procedure`: `{ "doc_path": "factory/06_knowledge_base/<...>.md" }`
- **`artifacts`** (array of objects)
  - Declares what evidence/output the tool produces (if any).
  - Example fields: `type` (`json`|`md`|`artifact`|`stdout`), `path` (repo-relative), `description`.

### Optional fields (per tool)

- **`scope`** (string): which area the tool is for (`factory/`, `factory/06_knowledge_base/`, `apps/<vertical>-instance/`, etc.).
- **`preconditions`** (string[]): prerequisites (e.g. “run from repo root”, “requires Node >= 20”).
- **`inputs`** (string[]): inputs/flags (names only).
- **`outputs`** (string[]): high-level outputs (human summary).
- **`replaces`** (string[]): tool ids this supersedes (for migrations).
- **`deprecated`** (object): `{ "since": "YYYY-MM-DD", "reason": "...", "replacement_tool_id": "..." }`

## Referencing model (no duplicated commands)

### From agent roles

Role prompts and context packs should prefer referencing a tool by **tool id** rather than repeating raw commands in many places.

Example (conceptual reference in a role doc):

- “Run Tool `TOOL_FACTORY_VALIDATE_TASK_QUEUE` before marking a task done.”

The Tool Registry entry then provides the canonical `how_to_run.command`.

### From documentation

Operator docs should link to the tool id (and optionally include the command once) to avoid drift:

- “See Tool `TOOL_FACTORY_NEXT` for the canonical invocation.”

If a doc must include the command for copy/paste, it should be sourced from the tool registry entry and treated as **secondary**.

### CI validation expectations

The Tool Registry validator (implemented later) should ensure:

- Tool ids are unique and stable.
- `owner_role` values are known.
- `how_to_run` references exist (npm script exists in `package.json`, workflow file exists, doc path exists).
- Optional: references from curated docs/role files to `tool_id` values remain valid.

## Examples (no secrets)

### Example: npm script tool

```json
{
  "tool_id": "TOOL_FACTORY_VALIDATE_TASK_QUEUE",
  "title": "Validate task queue integrity",
  "owner_role": "tooling",
  "kind": "npm_script",
  "how_to_run": { "command": "npm run validate-task-queue" },
  "artifacts": [
    { "type": "stdout", "description": "Pass/fail message; non-zero exit on failure" }
  ],
  "scope": "factory/"
}
```

### Example: workflow tool

```json
{
  "tool_id": "TOOL_FACTORY_CI_PARALLEL",
  "title": "Factory CI (parallel)",
  "owner_role": "quality",
  "kind": "workflow",
  "how_to_run": {
    "workflow_file": ".github/workflows/factory-parallel-ci.yml",
    "trigger": "pull_request"
  },
  "artifacts": [
    { "type": "artifact", "path": "factory-next.json", "description": "mfg line next JSON output (uploaded as CI artifact)" }
  ],
  "scope": "factory/"
}
```

## Open questions

- Should tool ids be globally flat, or namespaced by domain (e.g. `factory/validate-task-queue`)?
- Do we want the registry in JSON (`factory/tool-registry.json`) or TypeScript (`factory/tool-registry.ts`)?
- Should the validator also check references *inside* agent markdown files (regex-based), or only validate the tool registry itself initially?

## Handoff

- PM: create follow-up tasks only if the referencing model needs new conventions in docs.
- Tooling: implement `FACTORY_OS_002_tool_registry_json_and_validator` using this contract.

