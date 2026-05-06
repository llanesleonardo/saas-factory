# Factory output schemas

Machine-readable shapes for agent handoffs. Validate with:

```bash
npm run validate-agent-output -- pm path/to/pm-output.json
npm run validate-agent-output -- dev path/to/dev-output.json
npm run validate-agent-output -- quality path/to/quality-output.json
```

Or stdin:

```bash
cat pm-output.json | npm run validate-agent-output -- pm
```

## Files

| Schema | Role |
|--------|------|
| `pm-output.schema.json` | Task list payloads from **PM** |
| `dev-output.schema.json` | **Dev** completion / handoff summary |
| `quality-output.schema.json` | **Quality** gate + evidence |
| `agent-registry.schema.json` | **`factory/agent-registry.json`** |
| `workflow-state-machine.schema.json` | **`factory/workflow-state-machine.json`** |

Human-authored **`factory/task-queue.json`** remains compatible when tasks omit optional PM schema fields (`description`, `acceptance_criteria`, …).
