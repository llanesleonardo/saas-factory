# Self-healing report (strictly gated)

## Summary
- Evidence source: `factory/fixtures/agent-output/quality/invalid-fail-empty-errors.json`
- Failure kind: **quality_gate**
- Failing command: `unknown`

## Failure packet reference
```json
{
  "schema_version": 1,
  "timestamp_utc": "2026-05-09T09:03:45.975Z",
  "task_id_primary": "QUALFIX_002",
  "kind": "quality_gate",
  "failing_command": "unknown",
  "errors": [],
  "source_ref": {
    "type": "file",
    "path": "factory/fixtures/agent-output/quality/invalid-fail-empty-errors.json"
  }
}
```

## Diagnosis
- Quality reported fail but provided zero structured errors.

## Proposed fix plan
- Re-run the Quality gate command and ensure errors[] is populated per schema.
- Attach evidence pointers (file paths or artifact links) for each error.

## Patch scope (bounded)
- (not enough evidence to propose specific files)

## Commands to re-run (Quality gate)
- `npm run check`

## Risk notes / governance
- Without errors/evidence, any patch proposal would be guesswork (forbidden).

## Handoff
Next role: **quality**
