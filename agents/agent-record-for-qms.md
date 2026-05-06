# AGENT ACTION RECORD (RAW INPUT FOR QMS DOCS)

This file defines **how agent work becomes durable evidence** in the SaaS Factory—not casual chat logs.

## What this system is

It is **not** “another agent log.” It is the ingestion layer for a **QMS-inspired traceability loop**: autonomous execution stays accountable because **work** (commits, PRs, configs) is paired with **evidence** (who did what, why, what to verify next).

It deliberately enables:

| Pillar | Meaning |
|--------|---------|
| **Traceability** | Role + task + artifacts tied together |
| **Auditability** | Decisions and scope explained without secrets |
| **Knowledge persistence** | Lessons survive context-window resets |
| **Handoff structure** | Next actor knows what to do |

That mirrors patterns used in **regulated or high-assurance** industries—adapted here as **documentation discipline**, not a claim of certification.

---

## Separation of work vs evidence

- **Execution** happens in branches, CI, chat-driven edits.
- **Evidence** lands in **`organizational_memory/QMS/inbox/`** as structured Markdown **after** substantive work.

Chat transcripts alone rot; **inbox records** are the compact, factual substrate **Docs Agent** promotes into **`QMS/published/`** and **`LESSONS-LEARNED.md`**.

---

## Factory placement

```text
PM → Dev → Quality → Fix → Git → DevOps  (delivery chain)
              │
              └──► QMS/inbox (raw records per substantive role turn)
                        │
                        ▼
                   Docs Agent (curate)
                        │
                        ▼
              organizational_memory/QMS/published/ (+ LESSONS-LEARNED)
```

**Chat turn:** when invoked for implementation, each role still opens with **Resources & dependencies** per **`organizational_memory/AGENTS.md`**. The QMS record is **separate**, written **after** substantive repo impact.

---

## When to write

- You changed files, produced JSON, drafted durable PR text, ran meaningful reviews, or left operational guidance that others depend on.
- Skip trivial clarifications with **zero** durable artifact (unless the user asks for a record anyway).

**Friction rule:** records must stay **short and factual**. Prefer bullets over essays; link paths instead of pasting walls of output.

---

## Where to save

- Path: **`organizational_memory/QMS/inbox/`**
- Filename: **`YYYY-MM-DD-<role>-<task-or-topic>.md`**
  - **role**: `pm` | `dev` | `quality` | `fix` | `git` | `builder` | `architect` | `security` | `devops` | `docs` | `support` | `tooling` | `finops` | `spike` | `spec-generator` (legacy filenames may still use `testing` or `qa`)
  - **task-or-topic**: task id (e.g. `PLU-003`) or short `kebab-case` slug if no id.

---

## Required sections (use these headings)

```markdown
# Agent action record

## Document metadata
- **Date (UTC):** YYYY-MM-DD
- **Agent role:** <name>
- **Task id / issue:** <id or n/a>
- **Spec / PR refs:** <paths, #PR, links>
- **Depends on (optional):** <task ids from factory/task-queue.json when helpful>
- **Related inbox records (optional):** <other QMS/inbox filenames this connects to>

## Actions performed
- Bullet list of what you **did** (edits, files added, commands run, decisions).

## Evidence
- Key paths, diff summary, test results, links. No secrets.

## Lessons learned & cautions (optional)
- What worked, what failed, what to repeat or avoid next time.

## Handoff
- What the **next** role or human should do, if anything.
```

Keep the record **concise** (rough guide: under ~80 lines). Use **Mermaid** only when a small diagram removes ambiguity (state, sequence, data flow).

### Metadata additions (traceability upgrade)

When reconstructing evolution matters, fill **Depends on** and **Related inbox records** so records form a **loose task graph** without requiring separate tooling yet. Tie ids to **`factory/task-queue.json`** when used.

---

## Optional machine-readable companion (future-friendly)

Human-first Markdown remains canonical. When automation needs structured ingestion, you **may** add a sibling JSON file next to the same basename, e.g. `2026-05-05-dev-PLU-003.json`, with a minimal shape:

```json
{
  "schema_version": 1,
  "date_utc": "2026-05-05",
  "agent_role": "dev",
  "task_id": "PLU-003",
  "depends_on": ["PLU-001"],
  "spec_pr_refs": ["feature/PLU-003"],
  "evidence_paths": ["apps/plumber-instance/src/..."],
  "handoff_next_role": "quality"
}
```

**Do not** duplicate secrets or full logs into JSON. This repo does **not** yet enforce schema validation—**Tooling** may add **`JSON Schema` + CI check** later.

---

## Design strengths (why this shape)

1. **Structured sections** — humans scan quickly; machines can parse companion JSON later.
2. **Inbox vs published** — raw truth ingests first; **Docs Agent** normalizes into controlled docs.
3. **Role accountability** — each agent owns its evidence; fewer “who broke this?” gaps.
4. **Handoff** — forces continuity across Dev / Quality / Fix / Git / DevOps.

---

## Known risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Log explosion** | Strict brevity; skip trivial turns; periodic **Docs** aggregation into **`published/`**; future rollups (daily/sprint) if volume grows |
| **Over-documentation trap** | Record **facts + pointers**, not polish; never block shipping on literary quality |
| **Schema drift** | Keep this template authoritative; optional JSON **`schema_version`**; Tooling may add validators |
| **Isolated records** | Use **Depends on** / **Related inbox records** / task ids to link the graph |

---

## Relationship to `AGENT-RUN-LOG.md`

- **`organizational_memory/AGENT-RUN-LOG.md`** — optional **one-line** session log for humans.
- **`QMS/inbox/*.md`** — structured **per-role evidence** for controlled docs and lessons.

Both may be used; different granularity.

---

## Elite / roadmap (optional upgrades)

1. **Task graph layer** — consistently populate **`depends_on`** in metadata and mirror **`factory/task-queue.json`** when relevant.
2. **Validated structured logs** — JSON Schema in CI for companion `.json` files (Tooling).
3. **Summarization tiers** — sprint-level rollup docs in **`published/`** produced by **Docs Agent** from inbox batches.

These are **incremental**; the Markdown template above remains the **minimum viable** audit trail today.
