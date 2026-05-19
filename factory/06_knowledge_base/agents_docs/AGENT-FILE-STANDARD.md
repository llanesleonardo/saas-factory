# Agent file standard (SaaS Factory)

Every **`agents/*-agent.md`** role SHOULD expose the following headings so operators and automation share one mental model. Detailed doctrine may follow these headings.

| Section | Intent |
|---------|--------|
| **Purpose** | One-bound sentence — why this agent exists. |
| **When To Use** | Triggers / lifecycle placement. |
| **Inputs Required** | Artifacts, ids, constraints. |
| **Outputs Required** | Deliverables (files + structured payloads). |
| **Allowed Actions** | What edits/decisions are in-bounds. |
| **Forbidden Actions** | Hard boundaries (other roles’ turf). |
| **Required Context** | Typical `@` paths — mirror **`factory/context-packs/`**. |
| **Handoff Rules** | Next roles — mirror **`factory/agent-registry.json`**. |
| **Success Criteria** | “Done” for this turn. |
| **Required Evidence** | QMS inbox when substantive (**`agents/agent-record-for-qms.md`**). |
| **Output Format** | Paths to **`factory/factory_schemas/*.schema.json`** when JSON applies. |

**Categories**

- **Execution** — May modify product/factory artifacts per role (**registry `category: execution`**).
- **Advisory** — Primarily guidance (**registry `category: advisory`**).

Canonical routing + manifests: **`factory/06_knowledge_base/routing/AGENTS.md`**.
