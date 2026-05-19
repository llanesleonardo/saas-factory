# Context packs

Lightweight **path hints** per agent (`*.json`). Pair with **`factory/02_workforce/02_00_agents/agent-registry.json`** `context_pack` fields.

Use when composing Cursor prompts: `@` only these paths + the role file to reduce noise.

**Path conventions:** replace `<vertical>` / `<app>` with the app slug; global task queue lives at **`factory/03_assembly_lines/03-registry/registry/task-queue.json`**; published IV&V procedures used in packs live under **`factory/06_knowledge_base/qms_docs/published/`**; routing, architecture, and lean docs live under **`factory/06_knowledge_base/`** (see **`factory/06_knowledge_base/docs/README.md`**).
