# Agent action record

## Document metadata
- **Date (UTC):** 2026-05-09
- **Agent role:** tooling
- **Task id / issue:** FACTORY_OS_006_telemetry_run_history_store
- **Spec / PR refs:** `organizational_memory/factory-os-telemetry-spec.md`, `factory/telemetry.ts`, `factory/telemetry-cli.ts`, `package.json`
- **Depends on (optional):** FACTORY_OS_005_telemetry_spec
- **Related inbox records (optional):** `organizational_memory/QMS/inbox/2026-05-09-spec-generator-FACTORY_OS_005_telemetry_spec.md`

## Actions performed
- Implemented a local-first telemetry store under `factory/.local/` (gitignored) that appends run events as JSONL.
- Added `npm run factory:telemetry -- report` to summarize run counts by day and app.
- Instrumented key factory commands to record run history events:
  - `factory:next`
  - `parallel-plan`
  - `factory` (orchestrator)
  - `factory:deploy` (guarded deploy)
- Ensured telemetry stores **command strings only** (no secret values) and avoids storing raw logs (pointers-only philosophy).

## Evidence
- Commands run (local):
  - `npm run factory:next -- --json`
  - `npm run parallel-plan -- --json`
  - `npm run factory`
  - `npm run factory:telemetry -- report`
  - `npm run check`

## Handoff
- Quality: consider adding a CI artifact that captures telemetry summaries once the store has a CI-friendly mode (future).

