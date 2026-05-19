# Signals — what to read after the line runs

Use this as a **checklist** when doing kaizen: each path is a possible **evidence** attachment for an improvement item or QMS inbox record.

## Local / repo (usually committed)

| Signal | Path or command | What it tells you |
|--------|-------------------|-------------------|
| Typecheck + app configs | `npm run check` | Brief + stack consistency across **`configs/apps/`**. |
| Factory spine | `npm run mfg -- validate factory` | Registries, fixtures, QMS inbox markdown, self-heal fixtures. |
| Task graph | `npm run mfg -- validate task-queue` | Drift, bad deps, `blocked_reason`, phase conventions. |
| Tool roster vs reality | `npm run mfg -- validate tool-registry` | `how_to_run.command` drift from actual **`mfg`** surface. |
| Deploy gates only | `npm run mfg -- deploy preview --dry-run` | Same gates as real tiers without stub “execute”. |

## Gitignored telemetry (local evidence)

Paths are under **`factory/telemetry/`** (see root **`.gitignore`**). They rotate by **UTC day**.

| Signal | Typical path | What it tells you |
|--------|----------------|-------------------|
| Assembly-line events | `factory/telemetry/assembly-line/assembly-line-YYYY-MM-DD.jsonl` | Every **`mfg`** subprocess dispatch + **`recordRun`** wrap: `duration_ms`, `exit_code`, `workstation`, failures. |
| Run history rollups | `factory/telemetry/run/run-history-YYYY-MM-DD.jsonl` | Pass/fail runs by `kind` / `command` (older stream; still useful). |

**Summarize without opening JSONL:**

- **`npm run mfg -- kaizen summary`** — Kaizen digest: slowest **`cli_dispatch_end`** rows, failure samples with **`correlation_id`**, run-history totals (same UTC day).
- **`npm run mfg -- telemetry assembly-line`** / **`telemetry report`** — compact counts only (see **`03_assembly_lines/07-telemetry/README.md`**).

## Human / process

| Signal | Where | What it tells you |
|--------|-------|-------------------|
| QMS inbox records | `factory/06_knowledge_base/qms_docs/inbox/*.md` | What changed, why, commands run (when teams use the inbox convention). |
| Organizational memory | `organizational_memory/` | Architecture, process, lessons (narrative). |
| CI | `.github/workflows/*.yml` | Red builds = **andon**; fix or park before more WIP. |

## Choosing one signal (anti–boil-the-ocean)

1. Reproduce with **one** command from the table above (or **`npm run mfg -- kaizen summary --day …`**).  
2. Copy **one** failing line (or validator stderr) into your improvement note.  
3. Propose **one** countermeasure; verify with the same command after the PR.
