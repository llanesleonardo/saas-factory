# `factory/telemetry/` (instrumentation + evidence)

**What this is:** A place for **run evidence** the factory accumulates — e.g. **command/run history** (`run/*.jsonl`), **cost events** (`cost/*.jsonl`), **self-heal** markdown reports (`self-heal/*.md`). It is **not** the task queue, registry, or product contracts.

**VSM lens:** **Measurement / feedback** layer — the lower timeline on a value stream map (what ran, how long, pass/fail, cost hooks). Conceptually it pairs with assembly-line station **`03_assembly_lines/07-telemetry/`** (assembly-line event schema + station README; this directory is where **raw evidence** often lands today).

**Where it should live:** Keep **`factory/telemetry/`** at the factory root — **cross-cutting** (every station can emit events). Do not move it under a single numbered zone unless you only add **pointers**; CLIs under `factory/factory_cli/` (e.g. `telemetry-cli.ts`, `time-tracker.ts`, `mfg.ts`) typically **read/write** here.

**Git:** This path is listed in **`.gitignore`** so local runs do not dirty the repo by default. If you need **committed samples** for CI/docs, use a different path (e.g. `factory/fixtures/...` for golden files) or narrow the ignore rule.
