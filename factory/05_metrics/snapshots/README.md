# Snapshots (`factory-metrics-YYYY-MM-DD/`)

Each run of **`npm run mfg -- metrics collect`** creates (or overwrites) **`factory-metrics-<UTC-date>/metrics.json`** in this directory.

- **Previous** values in prompts come from the **latest snapshot strictly before** that UTC date (if any).
- Re-running **the same day** overwrites that day’s file; use a new `--day` or archive the folder first if you need history.

Commit these files if you want trend visibility in git; keep them free of secrets.
