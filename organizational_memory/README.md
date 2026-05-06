# ORGANIZATIONAL_MEMORY

**Single home** for factory documentation: process, architecture, mission control, agent router, lean practices, GitHub Projects setup, and the manual agent run log template.

Role **definitions** (`*-agent.md`) stay under **`agents/`** so `@agents/<name>-agent.md` paths stay short; everything else you read for context lives here.

| Document | Purpose |
|----------|---------|
| **[AGENTS.md](AGENTS.md)** | Which `@agents/*` to use, Mermaid diagrams, per-role use cases, lesson routing |
| **[FACTORY-PROCESS.md](FACTORY-PROCESS.md)** | End-to-end lifecycle (spec → deploy → use) |
| **[MISSION-CONTROL.md](MISSION-CONTROL.md)** | Sources of truth, VSM “you are here”, pointer to agent log |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | `apps/*-instance` + `packages/*`, **frontend/backend** layout, **SaaS integration modes**, CI/workflow notes |
| **[GITHUB-PROJECTS-SETUP.md](GITHUB-PROJECTS-SETUP.md)** | One GitHub Project per app, PAT, Actions variables |
| **[LEAN-MANUFACTURING.md](LEAN-MANUFACTURING.md)** | Lean × agents/humans (WIP, waste, kaizen, Issues) |
| **[AGENT-RUN-LOG.md](AGENT-RUN-LOG.md)** | Append-only template for logging Cursor agent sessions |
| **[MRP-PHASE-B-AND-C.md](MRP-PHASE-B-AND-C.md)** | After Phase A planner: **Mission control UI** (Phase B) + **SDK agent runner** (Phase C), with jidoka and trust ladder |
| **[QMS/README.md](QMS/README.md)** | QMS-inspired **records** (`inbox/`), **controlled docs** (`published/`), **lessons learned**, ISO-theme alignment; agents log → **Docs Agent** curates |
| **[AGENT-FILE-STANDARD.md](AGENT-FILE-STANDARD.md)** | Required headings (`Purpose` … `Output Format`) for every **`agents/*-agent.md`** |
| **[SAAS-FACTORY-EVOLUTION.md](SAAS-FACTORY-EVOLUTION.md)** | Phased roadmap — registry, schemas, workflow machine, mission control, metrics |
| **[agent-diagrams/README.md](agent-diagrams/README.md)** | **Mermaid** process diagram per agent + **[factory-spine.md](agent-diagrams/factory-spine.md)** overview |

Project overview and scripts: root **`README.md`**.

Registry/schemas/context packs live under **`factory/`** (`agent-registry.json`, `schemas/`, `context-packs/`, `workflow-state-machine.json`).
