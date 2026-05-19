# Factory knowledge base

**Single home** under `factory/06_knowledge_base/` for factory documentation: process, architecture, mission control, agent routing, lean practices, GitHub Projects setup, specs, QMS, and sales / assembly-line guides.

Role **definitions** (`*-agent.md`) live under **`factory/02_workforce/02_00_agents/agent_definitions/`** for `@` paths; narrative and procedures live in the subfolders below.

## Core guides (by category)

| Topic | Path |
|-------|------|
| **Agent router** — which `@` role when, copy-paste phrases | [routing/AGENTS.md](../routing/AGENTS.md) |
| **End-to-end lifecycle** (spec → deploy → use) | [process/FACTORY-PROCESS.md](../process/FACTORY-PROCESS.md) |
| **Lean × agents / humans** (WIP, waste, kaizen) | [process/LEAN-MANUFACTURING.md](../process/LEAN-MANUFACTURING.md) |
| **Value chain (Porter) × software factory** — primary + support activities mapped to this repo | [process/VALUE-CHAIN-SOFTWARE-FACTORY.md](../process/VALUE-CHAIN-SOFTWARE-FACTORY.md) |
| **Mission control** — sources of truth, VSM “you are here” | [operations/MISSION-CONTROL.md](../operations/MISSION-CONTROL.md) |
| **Workflow machine validation** | [operations/WORKFLOW-MACHINE-VALIDATION.md](../operations/WORKFLOW-MACHINE-VALIDATION.md) |
| **Architecture** — `apps/*-instance`, `packages/*`, integration modes | [architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md) |
| **`apps/core-saas` purpose** | [architecture/CORE-SAAS-PURPOSE.md](../architecture/CORE-SAAS-PURPOSE.md) |
| **Roadmap** — registry, schemas, mission control, metrics | [roadmap/SAAS-FACTORY-EVOLUTION.md](../roadmap/SAAS-FACTORY-EVOLUTION.md) |
| **MRP Phases B & C** (control tower + SDK runner) | [roadmap/MRP-PHASE-B-AND-C.md](../roadmap/MRP-PHASE-B-AND-C.md) |
| **Sales & assembly-line** — `mfg` spine checklist | [go_to_market/SALES-AND-ASSEMBLY-LINE-GUIDE.md](../go_to_market/SALES-AND-ASSEMBLY-LINE-GUIDE.md) |

## Verified products (replication)

| Topic | Path |
|-------|------|
| **Zone README** (registry + how to add packages) | [`../../07_verified_product/README.md`](../../07_verified_product/README.md) |
| **Example: todo** (gold pattern for new verticals) | [`../../07_verified_product/products/todo/README.md`](../../07_verified_product/products/todo/README.md) |

## Supporting folders

| Topic | Path |
|-------|------|
| **GitHub Projects** (PAT, variables, one board per app) | [github/GITHUB-PROJECTS-SETUP.md](../github/GITHUB-PROJECTS-SETUP.md) |
| **Append-only agent session log (template)** | [agents_docs/AGENT-RUN-LOG.md](../agents_docs/AGENT-RUN-LOG.md) |
| **Agent file headings standard** | [agents_docs/AGENT-FILE-STANDARD.md](../agents_docs/AGENT-FILE-STANDARD.md) |
| **Per-role narrative summaries** | [agents_docs/README.md](../agents_docs/README.md) |
| **Factory spine (Mermaid)** | [agents_docs/factory-spine.md](../agents_docs/factory-spine.md) |
| **QMS** — inbox, published IV&V procedures, lessons | [qms_docs/README.md](../qms_docs/README.md) |
| **Factory OS / VSM specs** | [factory_specs/](../factory_specs/) |
| **ADRs** | [ADRs/](../ADRs/) |
| **Architecture reviews** | [architecture_reviews/](../architecture_reviews/) |
| **Blueprint trees** | [blueprint_verticals/](../blueprint_verticals/) |

Project overview and top-level scripts: repository root **`README.md`**.

Registry, schemas, and context packs: **`factory/02_workforce/`**, **`factory/03_assembly_lines/03-registry/`**, **`factory/factory_schemas/`**.
