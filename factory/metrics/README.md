# Factory metrics (Phase 12 placeholder)

Capture **non-secret** aggregates here (JSON exports, dashboards-as-code, or links).

Suggested dimensions:

| Metric | Notes |
|--------|--------|
| Lead time per task | From `ready` → `done` using **`factory/task-queue.json`** timestamps (field TBD). |
| Quality fail rate | Ratio of `quality` fail vs pass per sprint. |
| Deployment frequency | From CI / DevOps records. |
| Rework / Fix iterations | Count loops per task id. |
| Defect escape | Customer issues tagged BUG post-release (**Support** taxonomy). |

Wire ingestion via **Tooling** / **DevOps** when telemetry exists — do **not** commit PII.
