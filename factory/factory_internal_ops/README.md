# `factory/factory_internal_ops`

Factory-internal operational tooling focused on **telemetry** (run history, assembly-line correlation).

These modules are *about the factory*, not about the product apps.

**Contents:** `telemetry.ts` — `recordRun`, repo root resolution, and hooks into **`factory/03_assembly_lines/07-telemetry/`** (assembly-line JSONL).

Cost / hosting-estimate CLIs previously lived alongside this folder; they were removed. FinOps-style cost modeling remains described in **`factory/06_knowledge_base/factory_specs/factory-os-cost-tracking-spec.md`** for a future implementation.
