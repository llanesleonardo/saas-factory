# VSM PROCESS (CURRENT) — SAAS FACTORY

This document captures the **current streamlined Value Stream Map (VSM)** for how work flows from customer need to shipped increments in this repo.

**Principle:** we keep the roadmap at **phase granularity first**, then decompose **only the next phase** into atomic tasks.

---

## VSM map (diagram)

```mermaid
flowchart TB
  %% A "classic" VSM shape:
  %% - Top: information flow + cadences
  %% - Middle: process boxes left→right
  %% - Bottom: lead time vs value-add timeline (placeholders until measured)

  %% -------------------------
  %% 1) INFORMATION FLOW (top)
  %% -------------------------
  subgraph INFO["Information flow (cadence)"]
    direction LR
    CUSTOMER[Customer / client need]:::ext
    SUPPORT[Support / sales / discovery]:::role
    MRP[Planning spine<br/><code>factory/03_assembly_lines/03-registry/registry/phase-queue.json</code><br/><code>factory/03_assembly_lines/03-registry/registry/task-queue.json</code>]:::sys
    BACKLOG[GitHub Issues / Projects (optional)]:::sys

    CUSTOMER -->|signal (as needed)| SUPPORT
    SUPPORT -->|update Product IR| MRP
    BACKLOG -.->|tickets / defects| SUPPORT

    %% Cadence notes (human maintained; change to match reality)
    CAD1["Forecast / planning: per phase (ad-hoc)"]:::note
    CAD2["Execution pull: per task (daily)"]:::note
    CAD1 -.-> MRP
    CAD2 -.-> MRP
  end

  %% -------------------------
  %% 2) PROCESS FLOW (middle)
  %% -------------------------
  subgraph FLOW["Process flow (value stream) — left → right"]
    direction LR
    P0["0 Product IR<br/><code>configs/apps/&lt;app&gt;/&lt;app&gt;.json</code><br/><b>Gate</b>: validate-vertical-config"]:::proc
    P1["1 System IR<br/><code>configs/apps/&lt;app&gt;/app.stack.json</code><br/><b>Gate</b>: mfg stack validate"]:::proc
    P2["2 Scaffold<br/><b>Cmd</b>: mfg app scaffold<br/><b>Check</b>: npm run check"]:::proc
    P3["3 Spec<br/><code>configs/apps/&lt;app&gt;/specs/&lt;app&gt;-spec.md</code><br/><b>Cmd</b>: mfg spec generate"]:::proc
    P4["4 Roadmap (phases only)<br/><code>configs/apps/&lt;app&gt;/specs/PHASES.md</code><br/><code>factory/03_assembly_lines/03-registry/registry/phase-queue.json</code>"]:::proc
    P5["5 Plan one phase<br/><code>factory/03_assembly_lines/03-registry/registry/task-queue.json</code><br/><b>Gate</b>: mfg validate task-queue<br/><b>Helpers</b>: mfg line next, factory:next"]:::proc
    P6["6 Execute loop<br/>Dev → Quality → Fix → Git → merge<br/><b>Closure</b>: mark done"]:::proc
    P7["7 Ship + operate<br/>Deploy + smoke + feedback"]:::proc

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7

    %% Inventory / waiting buffers (triangles): where time tends to accumulate
    W0["△ wait"]:::inv
    W1["△ wait"]:::inv
    W2["△ wait"]:::inv
    W3["△ wait"]:::inv
    W4["△ wait"]:::inv
    W5["△ wait"]:::inv

    P0 --> W0 --> P1
    P1 --> W1 --> P2
    P2 --> W2 --> P3
    P3 --> W3 --> P4
    P4 --> W4 --> P5
    P5 --> W5 --> P6
  end

  %% MRP / planning injects into "Plan one phase"
  MRP -->|select next phase + pull next task| P5

  %% Feedback loops to contracts
  P7 -. "feedback" .-> P0
  P7 -. "feedback" .-> P1
  P7 -. "feedback" .-> P3

  %% -------------------------
  %% 3) TIMELINE (bottom)
  %% -------------------------
  subgraph TIME["Timeline (replace placeholders with measured numbers)"]
    direction LR
    LT["Lead time (LT): TBD days<br/>= sum of waits + process times"]:::metric
    VA["Value-add (VA): TBD hours<br/>= hands-on time only"]:::metric
  end

  %% Styles
  classDef proc fill:#ffffff,stroke:#111827,stroke-width:1px,color:#111827;
  classDef inv fill:#f3f4f6,stroke:#6b7280,stroke-dasharray: 3 3,color:#374151;
  classDef sys fill:#eef2ff,stroke:#4338ca,color:#312e81;
  classDef role fill:#ecfeff,stroke:#0e7490,color:#155e75;
  classDef ext fill:#fff7ed,stroke:#c2410c,color:#7c2d12;
  classDef note fill:#fffbeb,stroke:#a16207,color:#713f12;
  classDef metric fill:#f0fdf4,stroke:#166534,color:#14532d;
```

---

## 0) Customer needs (Product IR)

- **Artifact**: `configs/apps/<app>/<app>.json`
- **Goal**: capture customer need, constraints, success criteria in machine-readable form
- **Gate**: `npm run validate-vertical-config`

---

## 1) Tech stack contract (System IR)

- **Artifact**: `configs/apps/<app>/app.stack.json`
- **Goal**: resolve the stack into a cross-field-consistent contract (frontend/backend/db/auth/obs/jobs/networking/billing/search/email, etc.)
- **Gate**: `npm run mfg -- stack validate -- --all`

---

## 2) Scaffold (make the contract real)

- **Command**: `npm run mfg -- app scaffold -- <app>`
- **Goal**: materialize/update the runnable skeleton and repo wiring **idempotently**

Exit checks (recommended):
- `npm run check`

---

## 3) Spec creation (acceptance + boundaries)

- **Prompt generator**: `npm run generate-spec -- <app>`
- **Prompt output**: `configs/apps/<app>/specs/_generated/<app>-SPEC-PROMPT.md`
- **Spec output**: `configs/apps/<app>/specs/<app>-spec.md`
- **Goal**: acceptance criteria + deterministic workflows + scope/non-goals (spec is the “source of truth” PM compiles into tasks)

---

## 4) Roadmap (phases only; no tasks yet)

- **Per-app roadmap doc**: `configs/apps/<app>/specs/PHASES.md`
- **Machine-readable phase queue**: `factory/03_assembly_lines/03-registry/registry/phase-queue.json`
- **Goal**: a real roadmap that is phase-structured and dependency-aware **before** generating task-level WIP

---

## 5) Plan work (tasks for one phase at a time)

- **Artifact**: `factory/03_assembly_lines/03-registry/registry/task-queue.json`
- **Goal**: decompose the **single next phase** into atomic tasks with deps + acceptance criteria
- **Gate**: `npm run validate-task-queue`

Planning helpers:
- `npm run factory:next` (or `npm run mfg -- line next`)
- `computeParallelBatches` in `factory/factory_libs/planning/task-graph.ts` (waves; no standalone CLI)

---

## 6) Execute loop (per task)

- **Flow**: Dev → Quality → Fix (if needed) → Git (PR) → merge
- **Goal**: verified increments; no partial “done”

Closure rule:
- After merge, mark the task **`status: "done"`** in `factory/03_assembly_lines/03-registry/registry/task-queue.json` and capture evidence when required (QMS).

---

## 7) Ship + operate + feedback

- **Ship**: deploy + smoke checks vs spec acceptance
- **Operate**: support/docs/finops signals
- **Feedback**: update the right contract and repeat:
  - Product IR: `configs/apps/<app>/<app>.json` (needs/constraints changed)
  - System IR: `configs/apps/<app>/app.stack.json` (architecture/stack contract changed)
  - Spec: `configs/apps/<app>/specs/<app>-spec.md` (acceptance/scope changed)

---

## One-line summary

Customer needs → stack contract → scaffold → spec → phase roadmap → phase tasks → Dev/Quality loop → ship → learn → repeat.

