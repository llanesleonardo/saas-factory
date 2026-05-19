# Production SaaS factory (slash command)

Use this as a **checklist** when operating the monorepo factory: specs, task queue, next task, CI evidence.

- `npm run mfg -- line next` — next pullable task (human-readable paste lines).
- `npm run mfg -- line next -- --json` — machine-readable next task (CI uploads **`factory-next.json`** in **`factory-parallel-ci`**).
