# SAAS FACTORY

Monorepo for a base SaaS engine, generated vertical instances, shared packages, agent specs, and factory tooling.

**All factory documentation** (process, mission control, architecture — including **frontend/backend** layout and **SaaS integration modes** — agent router, lean, GitHub Projects, agent run log, **QMS**): **`organizational_memory/README.md`**.

## Layout

- **apps/** — `core-saas` (shared engine) and `todo-instance` (local-only learning vertical).
- **packages/** — shared UI, database, auth, and billing.
- **agents/** — prompt roles (PM, **builder**, dev, **quality**, fix, git, spec generator, architect, security, DevOps, docs, support, tooling, finOps, spike). See **`organizational_memory/AGENTS.md`** for how to `@` each. After substantive work, each role logs a **QMS inbox** record per **`agents/agent-record-for-qms.md`**.
- **organizational_memory/** — **single documentation home** (FACTORY-PROCESS, MISSION-CONTROL, ARCHITECTURE, GITHUB-PROJECTS-SETUP, LEAN-MANUFACTURING, AGENTS, AGENT-RUN-LOG, **`QMS/`** for lessons + controlled procedures).
- **factory/** — task orchestration (`orchestrator.ts`, `run-task.ts`, `task-queue.json`).
- **configs/** — per-vertical configuration JSON.
- **specs/** — product/technical specifications per vertical.
- **templates/** — shared outline for generated vertical specs (`vertical-saas-spec.template.md`).
- **.cursor/rules/** — Cursor project rules for the factory workflow (`saas-factory.mdc`).
- **.cursor/commands/** — slash-friendly runbooks (e.g. `generate-vertical-spec.md`).

## Generate a full vertical spec (prompt system)

Configs in `configs/<vertical>.json` drive a **deterministic prompt bundle**; Cursor (or any LLM) fills the narrative.

1. Edit or add `configs/<vertical>.json`.
2. `npm run generate-spec -- <vertical>` — writes `specs/_generated/<vertical>-SPEC-PROMPT.md` (agent rules + JSON + filled template shell).
3. In Cursor, @ that file and ask the agent to execute it: it should write **`specs/<vertical>-spec.md`** end-to-end.
4. Use **`/generate-vertical-spec`** (project command) as a shortcut checklist to the same flow.

There is **no** cloud API in-repo: "automatic" means **one command assembles the prompt**; the model run stays in Cursor unless you later wire `@cursor/sdk` or CI.

## Upgrade tier: parallel agents, GitHub factory, Vercel

| Track | What you get |
|--------|----------------|
| **1. Parallel "agents"** | `factory/task-graph.ts` exposes **`computeParallelBatches`** (waves of tasks with no blocking edges can run together). `npm run parallel-plan` prints waves; **`--json`** emits a plan for tooling. CI job **parallel-waves** uploads that JSON as an artifact. |
| **2. GitHub distributed execution** | CI workflows can run typecheck + factory tooling on every push/PR; keep app-specific matrices only for apps that exist. |
| **3. Vercel per app (optional)** | This repo supports deploying static placeholder apps (or real apps) per `apps/*` folder. Keep `.github/workflows/vercel-deploy.yml` aligned to the apps that exist. |
| **4. Spec prompt system** | Already documented above (`generate-spec`, `agents/spec-generator-agent.md`, `templates/`). CI regenerates prompt files in parallel for both verticals. |

Slash command runbook: **`/production-saas-factory`**.

## Run the factory (terminal)

### Prerequisites

- Node **22 LTS** recommended (see `.nvmrc` / `.node-version`)
- Minimum supported Node: **>= 20.19.0** (older patch versions may install with warnings and break modern DOM/tooling deps)

1. `npm install`
2. Paste PM task JSON into `factory/task-queue.json` (either a `tasks` array or a top-level array).
3. `npm run factory` — prints a **Cursor-native** runbook per task (agents execute in chat + your commands, not inside this script).

The DFP example used `ts-node`; this repo uses **`tsx`** for ESM + TypeScript without extra config.

## Docker (optional — minimal host installs)

Run **Node factory tooling**, **blueprint infra** (Redis / Postgres when chosen), and **extra language SDKs** (Go, .NET, Python) in containers; the repo mounts at **`/workspace`**. **`npm run app:scaffold`** writes **`docker/compose.generated.yaml`** and patches **`docker/compose.yaml`** from **`configs/app.blueprint.json`** (services appear only when blueprint **`tooling.containers`** is `docker-compose-dev` or `docker-compose-prod-sketch`, and you selected Redis and/or Postgres, etc.). See **`docker/README.md`**.

Quick host commands (Docker CLI only):

| Command | Purpose |
|--------|---------|
| `docker compose -f docker/compose.yaml build node` | Build the Node dev image |
| `docker compose -f docker/compose.yaml run --rm node npm run check` | Typecheck factory |
| `docker compose -f docker/compose.yaml --profile infra up -d` | Start **generated** infra (e.g. Redis **6379**, Postgres **5432** if in blueprint) |

Optional **`npm run docker:*`** shortcuts are listed in the scripts table below.

Use **Dev Containers**: `.devcontainer/devcontainer.json` → reopen folder in container for a Node-based editor environment.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run check` | `tsc --noEmit` on `factory/**/*.ts` |
| `npm run factory` | Orchestrator runbook |
| `npm run parallel-plan` | Dependency waves for `task-queue.json` (ignores `status: done` tasks) |
| `npm run factory:next` | State-aware **planner**: one next task + Dev agent line; optional `--json`, `--wip=2`, `--queue=path`, env `FACTORY_WIP_CAP` |
| `npm run generate-spec -- <id>` | Assemble `specs/_generated/<id>-SPEC-PROMPT.md` |
| `npm run app:configure` (alias `saas:configure`) | Blueprint wizard via **`factory/host-or-docker.ts`**: uses Compose **`node`** on the host; runs **`tsx`** only when already in a container → **`configs/app.blueprint.json`** (`--defaults`, **`--show`**, **`--from`**, **`--help`**) |
| `npm run app:configure:local` | Wizard **always** via local **`tsx`** (no Docker CLI) |
| `npm run app:scaffold` | Scaffold via **`host-or-docker`**; refreshes **`docker/compose.generated.yaml`** + **`docker/compose.yaml`** node env (`--from`, **`--force`**, **`--dry-run`**, **`--skip-install`**) |
| `npm run app:scaffold:local` | Scaffold **always** local **`tsx`** |
| `npm run docker:build` / `docker:sh` / `docker:node` | **`docker/compose.yaml`**: build Node image, shell, or run Node with **5173**/**4000** published |
| `npm run docker:infra` / `docker:infra:down` | Start/stop **generated** blueprint infra (`--profile infra`) |
| `npm run docker:go` / `docker:dotnet` / `docker:python` | One-off **toolchain** containers (`--profile toolchains`; append args after `--`) |
