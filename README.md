# SAAS FACTORY

Monorepo for a base SaaS engine, generated vertical instances, shared packages, agent specs, and factory tooling.

**All factory documentation** (process, mission control, architecture — including **frontend/backend** layout and **SaaS integration modes** — agent router, lean, GitHub Projects, agent run log, **QMS**): **`organizational_memory/README.md`**.

## Layout

- **apps/** — `core-saas` (shared engine) and `todo-instance` (local-only learning vertical).
- **packages/** — shared UI, database, auth, and billing.
- **agents/** — prompt roles (PM, **builder**, dev, **quality**, fix, git, spec generator, architect, security, DevOps, docs, support, tooling, finOps, spike). See **`organizational_memory/AGENTS.md`** for how to `@` each. After substantive work, each role logs a **QMS inbox** record per **`agents/agent-record-for-qms.md`**.
- **organizational_memory/** — **single documentation home** (FACTORY-PROCESS, MISSION-CONTROL, ARCHITECTURE, GITHUB-PROJECTS-SETUP, LEAN-MANUFACTURING, AGENTS, AGENT-RUN-LOG, **`QMS/`** for lessons + controlled procedures).
- **factory/** — task orchestration + CLIs + registries (see `factory/01_production_planning/01_03_task-registry/`, `factory/factory_cli/`, `factory/02_workforce/02_00_agents/agent-registry.json`, `factory/03_assembly_lines/03-registry/registry/`).
- **configs/** — per-app under **`configs/apps/<slug>/`** (`<slug>.json` brief + **`app.stack.json`**; **`npm run mfg -- app negotiate`** can run anytime for ongoing requirements/stack capture — see **`configs/README.md`**).
- **configs/apps/<app>/specs/** — product/technical specifications per app.
- **templates/** — shared outline for generated vertical specs (`vertical-saas-spec.template.md`).
- **.cursor/rules/** — Cursor project rules for the factory workflow (`saas-factory.mdc`).
- **.cursor/commands/** — slash-friendly runbooks (e.g. `generate-vertical-spec.md`).

## Generate a full vertical spec (prompt system)

Configs in **`configs/apps/<vertical>/<vertical>.json`** drive a **deterministic prompt bundle**; Cursor (or any LLM) fills the narrative.

1. **Product brief:** `npm run mfg -- app new` (wizard) or `npm run mfg -- app new -- <vertical>` — full fields; re-run anytime (existing file **pre-fills** prompts, then overwrites). **`--defaults`** for a new file only; **`--defaults --force`** replaces an existing brief with the template. Or edit **`configs/apps/<vertical>/<vertical>.json`** by hand.
2. `npm run mfg -- spec generate <vertical>` — writes `configs/apps/<vertical>/specs/_generated/<vertical>-SPEC-PROMPT.md` (agent rules + JSON + filled template shell).
3. In Cursor, @ that file and ask the agent to execute it: it should write **`configs/apps/<vertical>/specs/<vertical>-spec.md`** end-to-end.
4. Use **`/generate-vertical-spec`** (project command) as a shortcut checklist to the same flow.

There is **no** cloud API in-repo: "automatic" means **one command assembles the prompt**; the model run stays in Cursor unless you later wire `@cursor/sdk` or CI.

## Upgrade tier: parallel agents, GitHub factory, Vercel

| Track | What you get |
|--------|----------------|
| **1. Parallel "agents"** | `factory/factory_libs/planning/task-graph.ts` exposes **`computeParallelBatches`** for any tooling that needs wave math from the same DAG as the planner. Day-to-day sequencing uses **`npm run mfg -- line next`** (and **`-- --json`** for CI); **`factory-parallel-ci`** uploads **`factory-next.json`**. |
| **2. GitHub distributed execution** | CI workflows can run typecheck + factory tooling on every push/PR; keep app-specific matrices only for apps that exist. |
| **3. Vercel per app (optional)** | This repo supports deploying static placeholder apps (or real apps) per `apps/*` folder. Keep `.github/workflows/vercel-deploy.yml` aligned to the apps that exist. |
| **4. Spec prompt system** | Already documented above (`mfg spec generate`, `agents/spec-generator-agent.md`, `templates/`). CI regenerates prompt files in parallel for both verticals. |

Slash command runbook: **`/production-saas-factory`**.

## Run the factory (terminal)

### Prerequisites

- Node **22 LTS** recommended (see `.nvmrc` / `.node-version`)
- Minimum supported Node: **>= 20.19.0** (older patch versions may install with warnings and break modern DOM/tooling deps)

1. `npm install`
2. Paste PM task JSON into `factory/03_assembly_lines/03-registry/registry/task-queue.json` (either a `tasks` array or a top-level array).
3. `npm run mfg -- line orchestrate` — prints a **Cursor-native** runbook per task (agents execute in chat + your commands, not inside this script).

The DFP example used `ts-node`; this repo uses **`tsx`** for ESM + TypeScript without extra config.

## Dev environment (optional)

**`.devcontainer/`** uses the Microsoft **TypeScript + Node** devcontainer image (no repo-managed Compose). **`mfg app new`**, **`mfg app stack`**, **`mfg app scaffold`**, and **`mfg app negotiate`** run as **local `tsx`** on your machine.

## Scripts

Everything factory-related routes through **`npm run mfg -- …`**. Run **`npm run mfg -- help`** for subcommands (app new, app bn, app saas, app verified, app stack, stack validate, spec generate, scaffold, validators, task line, deploy, telemetry, …).

| Script | Purpose |
|--------|---------|
| `npm run check` | `tsc --noEmit` + **`mfg validate apps`** (all vertical briefs + every **`app.stack.json`**) |
| `npm run mfg -- help` | List all **`mfg`** subcommands |
| `npm run mfg -- line orchestrate` | Orchestrator runbook (`factory/03_assembly_lines/03-registry/registry/task-queue.json`) |
| `npm run mfg -- line next` | Next pullable task; **`-- --json`**, **`-- --queue=…`**, **`-- --wip=…`** |
| `npm run mfg -- spec generate <id>` | Assemble `configs/apps/<id>/specs/_generated/<id>-SPEC-PROMPT.md` |
| `npm run mfg -- app new -- <app>` | Vertical brief wizard → **`configs/apps/<app>/<app>.json`** (**`tsx`** on the host) |
| `npm run mfg -- app bn -- <app>` | Business needs bundle → **`configs/apps/<app>/business-needs.json`** (**`tsx`** on the host) |
| `npm run mfg -- app saas -- <app>` | SaaS baseline + alignment across brief / stack / business-needs (`--json`, `--strict`) |
| `npm run mfg -- app verified` | List apps on the verified manufacturing registry (see **`factory/03_assembly_lines/03-registry/registry/verified-apps.json`**) |
| `npm run mfg -- app verified -- add <app>` | After scaffold + SaaS checks pass, promote app into the verified registry |
| `npm run mfg -- app scaffold -- <app>` | Scaffold (**`tsx`** on the host) |
| `npm run mfg -- validate factory` | Registries, task queue, QMS inbox, fixtures, agent-output (CI bundle) |
