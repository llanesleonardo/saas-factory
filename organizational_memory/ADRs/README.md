# ADRs (Architecture Decision Records)

This folder records **irreversible or cross-cutting decisions** for the SaaS Factory platform and its operating system.

## Rules of use
- Prefer **small, focused ADRs** with clear context → decision → consequences.
- Link ADRs from the docs they constrain (e.g. `organizational_memory/ARCHITECTURE.md`, `organizational_memory/FACTORY-PROCESS.md`).
- If a decision introduces a new contract, pair it with a **machine-checkable artifact** under `factory/schemas/` or a validator under `factory/`.

## Index
- `ADR-0001-factory-kernel-boundary.md`
- `ADR-0002-task-queue-contract-and-versioning.md`
- `ADR-0003-workflow-state-enforcement.md`

