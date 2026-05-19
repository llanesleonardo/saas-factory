# ISO 9001–STYLE ALIGNMENT (INFORMATIVE)

This repository uses **QMS-inspired** structure for **traceability** and **improvement**. It is **not** a statement of ISO 9001 certification.

The table maps familiar **ISO 9001:2015** themes to where evidence lives in this monorepo. Clause numbers are indicative only; implement a formal QMS with a qualified practitioner if you need certification.

| ISO theme (informative) | Repo artifact |
|---------------------------|---------------|
| Context of the organization | `factory/06_knowledge_base/architecture/ARCHITECTURE.md`, specs |
| Leadership & policy | `factory/06_knowledge_base/process/FACTORY-PROCESS.md`, `factory/06_knowledge_base/operations/MISSION-CONTROL.md` |
| Planning | `factory/03_assembly_lines/03-registry/registry/task-queue.json`, `npm run mfg -- line next` |
| Support (docs, tools, knowledge) | `factory/06_knowledge_base/qms_docs/published/`, repository root `README.md` |
| Operation (controlled production) | Agent roles `factory/02_workforce/02_00_agents/agent_definitions/*-agent.md`, CI workflows |
| Performance evaluation | CI results, GitHub Issues, `factory-next.json` (line next) and validator artifacts |
| Improvement | `factory/06_knowledge_base/qms_docs/inbox/` records, `factory/06_knowledge_base/qms_docs/LESSONS-LEARNED.md`, kaizen / lean-related GitHub issues |

**Systems-engineering style IV&V (informative)** — maps classic V-model planning artifacts to **`published/`** (not independent third-party IV&V unless the org engages it):

| IV&V artifact (informative) | Controlled doc |
|-----------------------------|----------------|
| System validation / strategy | `factory/06_knowledge_base/qms_docs/published/QMS-PUB-001-system-validation-strategy.md` |
| System verification plan (system acceptance) | `factory/06_knowledge_base/qms_docs/published/QMS-PUB-002-system-verification-plan.md` |
| Subsystem verification plan (subsystem acceptance) | `factory/06_knowledge_base/qms_docs/published/QMS-PUB-003-subsystem-verification-plan.md` |
| Unit / device test plan | `factory/06_knowledge_base/qms_docs/published/QMS-PUB-004-unit-device-test-plan.md` |

**Controlled documents** = curated markdown under **`published/`** with the **Document control** block from **`TEMPLATE-CONTROLLED-DOCUMENT.md`**.

**Records** = raw **inbox** agent action records + optional **`factory/06_knowledge_base/agents_docs/AGENT-RUN-LOG.md`** lines.
