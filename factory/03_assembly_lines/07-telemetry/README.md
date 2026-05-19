# Station: Telemetry (measure the line)

## Assembly-line event log (canonical code here)

**`assembly-line-log.ts`** — append-only **JSONL** of activity across **all** assembly-line stations (every `mfg` dispatch to gates, scaffold, registry, delivery, *etc.*), including **failed** subprocess exits and **errors** from `recordRun`-wrapped operations.

| Output | Contents |
|--------|----------|
| `factory/telemetry/assembly-line/assembly-line-YYYY-MM-DD.jsonl` | One JSON object per line (`schema_version` 1). Gitignored with `factory/telemetry/`. |

**Event kinds**

- **`cli_dispatch_start` / `cli_dispatch_end`** — every `npx tsx …` spawned by `mfg` (workstation inferred from script path). End events include `exit_code`, `duration_ms`, and `error` when non-zero.
- **`operation_start` / `operation_complete` / `operation_error`** — async flows wrapped with `recordRun` in `factory/factory_internal_ops/telemetry.ts` (orchestrator, line-next, deploy). Failures include serialized `message` / `stack`.

**Workstation id rule** (see `inferWorkstationFromScriptPath`)

| Script path pattern | Workstation id |
|---|---|
| `factory/03_assembly_lines/<NN-name>/...`              | `<NN-name>` (e.g. `01-intake`, `04-scaffold`, `05-sprints`, `06-gates`, `08-delivery`) |
| `factory/03_assembly_lines/06-gates/validation/...`    | `06-gates-validation` (distinct sub-workstation) |
| `factory/<other>/...` *(outside assembly lines)*       | folder name with `_` → `-` (e.g. `factory/00_product_definitions/...` → `00-product-definitions`, `factory/01_production_planning/...` → `01-production-planning`, `factory/factory_cli/...` → `factory-cli`) |

Per-script overrides (cross-cutting scripts that physically live in a shared station folder but author work for another workstation):

| Script | Workstation id |
|---|---|
| `06-gates/gates/new-vertical-config.ts` (`app new`)       | `00-product-definitions` |
| `06-gates/gates/app-blueprint-config.ts` (`app stack`)    | `00-product-definitions` |
| `06-gates/gates/app-business-needs.ts` (`app bn`)         | `00-product-definitions` |
| `06-gates/gates/app-quote.ts` (`app quote`)               | `00-product-definitions` |
| `06-gates/gates/app-bdphase.ts` (`app bdphase`)           | `01-production-planning` |
| `06-gates/gates/delivery-review.ts` (`gates review`)      | `08-delivery` |
| `06-gates/gates/app-verified.ts` (`app verified`)         | `07-verified-product` |
| `01_00_work_orders/order-validate.ts` (`order validate`)  | `01-intake` |

**Reporting (developer commands)**

```bash
npm run mfg -- telemetry report [--day YYYY-MM-DD] [--app <slug>]
npm run mfg -- telemetry assembly-line [--day YYYY-MM-DD]
# legacy alias:
npm run mfg -- line telemetry -- report | assembly-line …
```

**Related**

- Run history (separate stream): `factory/telemetry/run/run-history-*.jsonl` — `npm run mfg -- line telemetry -- report`
- **Actuators:** `factory/factory_cli/time-tracker.ts`, `telemetry-cli.ts`

## VSM timing (future)

Per-stage **cycle time** and **wait time** (classic VSM lower timeline) are not fully modeled yet. Target: tie timestamps here to planning targets under `factory/01_production_planning/` when present.
