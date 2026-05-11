# ISO 9001–STYLE ALIGNMENT (INFORMATIVE)

This repository uses **QMS-inspired** structure for **traceability** and **improvement**. It is **not** a statement of ISO 9001 certification.

The table maps familiar **ISO 9001:2015** themes to where evidence lives in this monorepo. Clause numbers are indicative only; implement a formal QMS with a qualified practitioner if you need certification.

| ISO theme (informative) | Repo artifact |
|---------------------------|---------------|
| Context of the organization | `organizational_memory/ARCHITECTURE.md`, specs |
| Leadership & policy | `FACTORY-PROCESS.md`, `MISSION-CONTROL.md` |
| Planning | `factory/task-queue.json`, `npm run factory:next` |
| Support (docs, tools, knowledge) | `organizational_memory/QMS/published/`, `README.md` |
| Operation (controlled production) | Agent roles `agents/*-agent.md`, CI workflows |
| Performance evaluation | CI results, GitHub Issues, `parallel-plan` artifacts |
| Improvement | `QMS/inbox/` records, `LESSONS-LEARNED.md`, kaizen / lean-related GitHub issues |

**Systems-engineering style IV&V (informative)** — maps classic V-model planning artifacts to **`published/`** (not independent third-party IV&V unless the org engages it):

| IV&V artifact (informative) | Controlled doc |
|-----------------------------|----------------|
| System validation / strategy | `QMS/published/QMS-PUB-001-system-validation-strategy.md` |
| System verification plan (system acceptance) | `QMS/published/QMS-PUB-002-system-verification-plan.md` |
| Subsystem verification plan (subsystem acceptance) | `QMS/published/QMS-PUB-003-subsystem-verification-plan.md` |
| Unit / device test plan | `QMS/published/QMS-PUB-004-unit-device-test-plan.md` |

**Controlled documents** = curated markdown under **`published/`** with the **Document control** block from **`TEMPLATE-CONTROLLED-DOCUMENT.md`**.

**Records** = raw **inbox** agent action records + optional **`AGENT-RUN-LOG.md`** lines.
