# Factory OS — Deployment Engine (spec)

## Purpose & scope

The **Deployment Engine** is the Factory OS capability that standardizes **how** the factory deploys apps across environments with **guardrails**:

- consistent environment naming and configuration expectations
- deterministic pre-deploy gates (no “ship from a dirty branch”)
- repeatable rollback expectations

This spec defines:

- the **environment model** (preview / staging / prod)
- required **gates** before a deployment can start
- the expected deploy **inputs/outputs** and evidence

Out of scope:

- Implementing the deploy CLI (see `FACTORY_OS_004_deploy_engine_cli`)
- secrets (only **env var names** are allowed)

## Environment model

### Environments

| Environment | Intent | Typical trigger | Data expectations |
|-------------|--------|-----------------|------------------|
| **preview** | Fast review of a PR’s change | PR open/update | Ephemeral; safe seed data |
| **staging** | Pre-production verification | merge to main or manual promotion | Stable-ish; test tenants/data |
| **prod** | Customer-facing | explicit promotion | Durable; strict controls |

### App targets

An **app target** is a deployable unit, typically:

- `apps/<vertical>-instance/` (frontend deployable)
- optional shared services under `apps/core-saas/` or `packages/*` as defined by `organizational_memory/ARCHITECTURE.md`

The deploy engine should support selecting:

- **one app** (`apps/todo-instance`)
- or a **set of apps** when a change spans multiple deployables

## Required gates (QA-pass equivalent)

### Preconditions (must be true before deploying)

- **Repository state**
  - Deploy runs from a known git ref (commit SHA) on the correct branch.
  - For staging/prod: ref must be **merged to `main`** (no direct deploy from a feature branch).
- **Quality gates**
  - At minimum, the factory spine gates must be green for the ref:
    - `npm run check`
    - `npm run validate-task-queue`
    - `npm run validate-agent-registry`
    - `npm run validate-workflow-machine`
    - fixture harnesses where present (e.g. `validate-agent-output-fixtures`, `validate-qms-inbox*`)
  - For app deploys, add app-specific build/test gates as appropriate (e.g. `npm run build -w apps/<app>`).
- **Decision gate**
  - A PR decision gate equivalent must exist for staging/prod (see `organizational_memory/QMS/published/QMS-PUB-005-pull-request-decision-gate.md`).

### Human override policy

The deploy engine may support an explicit override (for emergencies), but it must be:

- opt-in, explicit, and logged (reason + approver identity outside the repo if required)
- never the default path

## Deploy command expectations (for implementation task)

This spec is implementation-agnostic, but the CLI in `FACTORY_OS_004` should support:

- **dry run** mode (prints what would be deployed and what gates are checked)
- **environment selection**: `preview | staging | prod`
- **target selection**: app path(s) or a named target group
- **gate enforcement**: refuse deploy if required gates are missing/failed
- **evidence output**: a summary suitable for CI artifacts

## Evidence / telemetry expectations

For every deploy attempt, record (at least):

- `timestamp_utc`
- `git_ref` (sha) + branch
- `environment`
- `targets[]`
- `gates_checked[]` and their outcomes
- `result` (`success | failed | aborted`)

This integrates with the Telemetry spec later (`FACTORY_OS_005`).

## Rollback expectations

Rollback should be:

- **possible** without ad-hoc heroics (documented procedure)
- **environment-aware** (prod rollback stricter than preview)

Minimum rollback expectations:

- ability to redeploy a previous known-good git ref
- documented “how to verify rollback succeeded” checks

## Env vars (names only; no secrets)

Deploy engine specs should list only **names** and purposes; examples:

- `VERCEL_TOKEN` (name only; actual value never in repo)
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Additional environment configuration may be required per vertical; those should live in vertical runbooks or DevOps-owned docs.

## Open questions

- Do we require staging for every vertical, or is staging optional per app?
- Should deploy targets be discovered automatically (workspace scan) or defined in a manifest?
- What is the minimal artifact format for deploy evidence (JSON file path + schema)?

## Handoff

- DevOps: implement `FACTORY_OS_004_deploy_engine_cli` using this environment model and gate policy.

