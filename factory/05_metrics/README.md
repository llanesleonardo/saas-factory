# Factory metrics (`05_metrics`)

Human-run **pulse** on the factory: combine **automatic probes** (task queue, telemetry JSONL) with **prompted** fields (outcomes, subjective load, friction notes). Each run writes one folder:

`factory/05_metrics/snapshots/factory-metrics-YYYY-MM-DD/metrics.json`

## Why this exists

The assembly line produces **signals** (`07-telemetry`, validators). Kaizen turns signals into changes. **Metrics** is the lightweight **“how are we this week?”** record: comparable numbers over time, without building a full dashboard.

## What gets collected (starter set)

Defined in **`catalog.json`** (extend freely):

| Theme | Examples in starter catalog |
|-------|-----------------------------|
| **Throughput shape** | Task counts by `status`, total tasks |
| **Line noise** | Assembly-line dispatch count, failure-like count (UTC day), run-history line count |
| **Spine** | Last `check` / `validate factory` / `deploy preview --dry-run` — **your attestation** unless you pass **`--probe-cli`** (slow) |
| **People** | Subjective load 1–5, one-line top friction |

Nothing here should store **secrets** or customer PII. Keep **`session_notes`** operational.

## Commands

```bash
# Interactive (TTY): each metric shows Previous / Suggested, you confirm or edit
npm run mfg -- metrics collect

# Same, but run slow probes first (npm run check, validate factory, deploy dry-run)
npm run mfg -- metrics collect --probe-cli

# Fixed UTC day (folder name)
npm run mfg -- metrics collect --day=2026-05-12

# Automation / CI: write probe-backed values only (no prompts)
npm run mfg -- metrics collect --from-probes-only
```

**Alias:** `npm run mfg -- line metrics collect -- …` (same script).

## Layout

| Path | Role |
|------|------|
| **`catalog.json`** | Metric ids, titles, kinds (`number` \| `text` \| `choice`), optional `choices`. |
| **`lib/metrics-probes.ts`** | Read-only helpers: task queue + telemetry day. |
| **`lib/snapshot-store.ts`** | Load previous snapshot (`< day`), write `metrics.json`. |
| **`collect-metrics.ts`** | Inquirer prompts + snapshot writer. |
| **`snapshots/factory-metrics-<day>/metrics.json`** | One JSON document per run (versioned by day folder). |

## Related

- **Signals reference:** `../04_kaizen/SIGNALS.md`
- **Lean practice:** `../06_knowledge_base/process/LEAN-MANUFACTURING.md`
