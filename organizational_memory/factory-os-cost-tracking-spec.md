# Factory OS: Cost Tracking (Spec)

## 1) Purpose
Provide a **deterministic, auditable cost model** for the factory so we can answer:

- **Per run**: “How much did this run cost (models + runtime + infra)?”
- **Per app/day**: “What did we spend today for a given app?”
- **Per tool/role**: “Where are the largest cost drivers?”

This spec is written so costs can start **manual-first**, then become more automated over time without breaking the storage contract.

---

## 2) Scope / non-goals

### In scope
- A **cost event model** aligned to telemetry run history:
  - costs attributable to a run id / job id / task id(s) / app
- A **rollup model**: per-run and per-app/day totals
- A **source classification** system:
  - manual entries vs automated measurements vs derived estimates
- Explicit rules for **currency**, **time windows**, and **attribution**

### Out of scope (for this spec)
- Cloud billing API integrations (AWS CUR, Azure Cost Management, GCP Billing export)
- Recommending “best provider” automatically (that’s a later FinOps/PM optimization task)
- Any claim of exactness; the model supports **estimates with provenance**

---

## 3) Definitions
- **Run**: a single invocation of a factory command (e.g. `factory:next`, `parallel-plan`, `factory:deploy`) or a role-driven activity that produces evidence.
- **App**: the owner bucket from `task.app` (e.g. `apps/todo-instance`, `factory/`, `organizational_memory/`).
- **Cost event**: a record representing one cost component (model, runtime, infra, etc.).
- **Rollup**: aggregation over a day (UTC) and app.

---

## 4) Cost model (event schema v1)

### 4.1 CostEvent (conceptual)
Each event is a single line item with clear provenance.

Required fields:
- `schema_version`: `1`
- `timestamp_utc`: ISO-8601 timestamp
- `day_utc`: `YYYY-MM-DD` derived from `timestamp_utc`
- `app`: app id / bucket (string)
- `kind`: `model | runtime | infra | SaaS | other`
- `source`: `manual | measured | estimated`
- `label`: human-friendly short label (e.g. `gpt-5.2`, `node_minutes`, `lightsail_baseline`)
- `amount_usd`: number (>= 0)

Attribution fields (optional but recommended):
- `run_id`: ties to telemetry run history (preferred)
- `job_id`: ties to telemetry job id
- `task_id_primary`: canonical primary task id (when known)
- `task_ids[]`: list of tasks involved (when known)
- `agent_role`: `pm|dev|quality|...` (when a role is primary driver)
- `tool_id`: `TOOL_*` (when a tool registry entry is the cost driver)

Evidence fields:
- `notes`: short free text, no secrets
- `evidence[]`: pointers only (file path or URL), no raw logs

### 4.2 Currency
- All stored cost amounts are **USD**.
- If a source is in another currency, conversion must be recorded in `notes` and stored as USD.

---

## 5) Rollups

### 5.1 Per-run rollup
Goal: produce a single “run total” view for a given `run_id` (or `job_id` when run_id is absent).

Rules:
- `run_total_usd = sum(amount_usd)` for all cost events with matching `run_id`.
- If `run_id` is missing, a system MAY fall back to grouping by `job_id + command + started_at_utc` (telemetry fields) but MUST record the derivation in rollup `notes`.

Recommended output shape (conceptual):
- `run_id`
- `app`
- `started_at_utc`, `ended_at_utc` (from telemetry when possible)
- `totals_by_kind` (map)
- `total_usd`
- `line_items[]` (optional)

### 5.2 Per-app/day rollup
Goal: support daily FinOps reporting.

Rules:
- Rollup window is **UTC day**.
- `app_day_total_usd = sum(amount_usd)` for events where `day_utc` matches and `app` matches.
- A rollup SHOULD break down by:
  - `kind` (model/runtime/infra/SaaS/other)
  - `source` (manual/measured/estimated)

Recommended output shape (conceptual):
- `day_utc`
- `app`
- `total_usd`
- `totals_by_kind`
- `totals_by_source`
- `top_labels[]` (optional)

---

## 6) Storage (local-first v1)

### 6.1 Storage location
Local-first storage mirrors telemetry’s approach and avoids secrets.

Recommended paths:
- **Cost events (append-only JSONL)**:
  - `factory/.local/cost-events-YYYY-MM-DD.jsonl`
- **Optional rollup cache (JSON)**:
  - `factory/.local/cost-rollups-YYYY-MM-DD.json`

### 6.2 Append-only requirement
- Writers MUST append one JSON object per line (JSONL).
- Readers MUST ignore blank lines.
- Events MUST be independently parseable (no multi-line JSON).

---

## 7) Data sources: manual vs automated vs estimated

### 7.1 Manual inputs (MVP-friendly)
Manual inputs are allowed and expected initially.

Examples:
- “We paid $20 for a tool this month; allocate $0.67/day to `factory/` as `SaaS`.”
- “This run used a paid model; operator recorded $0.12 for the run as `model`.”

Manual inputs MUST:
- include `source: "manual"`
- include a short `notes` line describing where the number came from (invoice, dashboard, operator estimate)

### 7.2 Measured inputs (preferred when available)
Measured inputs come from metered systems.

Examples:
- CI minutes consumed (if available)
- Container runtime seconds (if metered)

Measured inputs MUST:
- include `source: "measured"`
- include evidence pointers (e.g., artifact path or URL)

### 7.3 Estimated inputs (acceptable, with provenance)
Estimated inputs are allowed when exact measurement is not available.

This includes “baseline hosting cost” estimates for infra.

The factory currently has a helper command:
- `npm run factory:hosting-cost -- --app <app> --provider <...> --size <...> --json`

When using that output to create cost events:
- `kind: "infra"`
- `source: "estimated"`
- `label`: include provider + size (e.g. `digitalocean_small_baseline`)
- `notes`: capture the decision (why this provider/size)

---

## 8) Integration points

### 8.1 Telemetry linkage
Cost tracking is designed to attach to telemetry runs:
- `run_id`, `job_id`, `command`, `started_at_utc`, `ended_at_utc`
- `app`, `task_id_primary`, `task_ids`, `agent_role`

Costs can be generated:
- **Inline** while recording a run (future enhancement), or
- **Post-hoc** by reading run history and adding cost events (MVP approach).

### 8.2 Tool registry linkage
If a cost driver is a specific tool, include:
- `tool_id: "TOOL_*"`

This enables reporting like “cost by tool_id”.

---

## 9) Reporting requirements (minimum)

The system SHOULD be able to answer:
- Total cost per app/day (UTC) with kind breakdown
- Total cost per run_id with line item breakdown
- Optional: top 5 labels by cost for a day/app

---

## 10) Safety and privacy
- NEVER store secrets, API keys, account ids, or raw invoices.
- Evidence is pointer-only (file paths or URLs).
- If a value could reveal sensitive spend, store it but ensure it is not printed by default in “human summary” modes unless `--json` is requested (implementation choice).

---

## 11) Acceptance criteria mapping (FACTORY_OS_007)
- **Cost fields + rollups**: per-run and per-app/day rollups are defined (Sections 4–5).
- **Data sources**: manual vs measured vs estimated is explicit (Section 7).
- **Integration**: telemetry/tool attribution is defined (Section 8).
