# AGENT ACTION RECORD (RAW INPUT FOR QMS DOCS)

Every **`agents/*-agent.md`** role that **did substantive work** should leave a **factual, self-contained** record so **Docs Agent** can later consolidate into ISO-style controlled documents under **`organizational_memory/QMS/published/`**.

## When to write

- You changed files, produced JSON, drafted a PR message, ran a meaningful review, or produced durable guidance.
- Skip trivial "no change" or pure clarifying answers with zero repo impact (unless the user asks for a record anyway).

## Where to save

- Path: **`organizational_memory/QMS/inbox/`**
- Filename: **`YYYY-MM-DD-<role>-<task-or-topic>.md`**
  - **role**: `pm` | `dev` | `testing` | `qa` | `fix` | `git` | `builder` | `architect` | `security` | `devops` | `docs` | `support` | `tooling` | `finops` | `spike` | `spec-generator`
  - **task-or-topic**: task id (e.g. `PLU-003`) or short `kebab-case` slug if no id.

## Required sections (use these headings)

```markdown
# Agent action record

## Document metadata
- **Date (UTC):** YYYY-MM-DD
- **Agent role:** <name>
- **Task id / issue:** <id or n/a>
- **Spec / PR refs:** <paths, #PR, links>

## Actions performed
- Bullet list of what you **did** (edits, files added, commands run, decisions).

## Evidence
- Key paths, diff summary, test results, links. No secrets.

## Lessons learned & cautions (optional)
- What worked, what failed, what to repeat or avoid next time.

## Handoff
- What the **next** role or human should do, if anything.
```

Keep the record **concise** (rough guide: under ~80 lines). Use **Mermaid** in the record only when a small diagram removes ambiguity (state, sequence, data flow).

## Relationship to `AGENT-RUN-LOG.md`

- **`organizational_memory/AGENT-RUN-LOG.md`** — optional **one-line** session log for humans.
- **QMS inbox files** — structured **per-role evidence** for documentation and improvement cycles.

Both may be used; they serve different granularity.
