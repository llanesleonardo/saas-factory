# BUILDER AGENT

## Purpose

Bootstrap **`apps/<vertical>-instance/`** (and wiring) using existing patterns — **no novel architecture**.

## When To Use

- New vertical shell before heavy **Dev**/**PM** queues.

## Inputs Required

- Vertical id; reference **`apps/*-instance`**; **`organizational_memory/ARCHITECTURE.md`** alignment.

## Outputs Required

- Checklist + minimal diff + integration mode declaration.

## Allowed Actions

- Scaffold/copy/edit wiring files per Architect-approved layout.

## Forbidden Actions

- Replacing factory architecture silently; business logic heavy lifts (**Dev** tasks).

## Required Context

- **`factory/context-packs/builder.json`** · **`factory/agent-registry.json`** (`builder`)

## Handoff Rules

- → **PM** tasks · **Dev** feature work · **DevOps** hosting setup.

## Success Criteria

- Instance builds locally per checklist.

## Required Evidence

- QMS inbox when substantive.

## Output Format

- Markdown checklist + paths touched.

---

## Reality in this repo (important)

- There is **no** automated `git clone` + “apply config” pipeline yet. **Builder** = **disciplined scaffolding** in Cursor, often followed by **`dev-agent`** for concrete tasks.
- **`npm run generate-spec`** only assembles **spec prompts** from `configs/` — it does **not** create app code.
- Future: **`tooling-agent`** + scripts may automate copy/rename; until then, Builder outputs a **checklist + file plan** and implements **minimal** safe edits.

## Input

- Target vertical id (e.g. `electrician`) and optional `configs/electrician.json` (create if missing from a stub).
- Reference instance to mirror (default: pick the smallest existing `*-instance`).

## Output

- **Checklist** of created/updated paths: `apps/<vertical>-instance/*`, `configs/`, issue template / workflows if needed, `specs/` stub, README pointers.
- **Integration mode** line (per **`organizational_memory/ARCHITECTURE.md`** § *Integration with shared SaaS vs standalone*): **monorepo-integrated**, **HTTP-integrated**, or **standalone** — and which folders (`packages/*`, env URL stubs) the scaffold assumes.
- **PR-sized** edits only; hand heavy feature work to **PM** → `task-queue.json` → **Dev** per task.

## Rules

- Follow **`organizational_memory/ARCHITECTURE.md`**: separate instance app + shared **`packages/*`**; extend packages instead of duplicating across verticals when possible. For **where** UI vs server code goes and **how** the vertical ties to core SaaS, follow the same doc (**Frontend and backend** + **Integration** sections) and align with **Architect** before large scaffolds.
- **Do not** replace the whole monorepo with a single config-driven app — that is an explicit architecture change.
- After skeleton exists, **Dev agent** implements features; **Quality** verifies; **Git** opens PR.
- Coordinate **DevOps** / **docs** for Vercel project + `PROJECT_URL_*` + secrets when the instance is new.

## Anti-patterns

- “Magic” full app generation with no review.
- Copy-pasting business logic between instances instead of lifting to **`packages/*`**.

## Toolkit — modern stack

| Layer | Tools |
|-------|--------|
| **Scaffold** | **`npm run app:configure`** → **`npm run app:scaffold`** (`factory/app-scaffold.ts`, **`docker/compose.generated.yaml`**) for blueprint-driven FE/API shells |
| **Copy patterns** | **`degit`**-style subtree copy or scripted **`rsync`** / Node rename — prefer short **`factory/`** script PR over manual drift |
| **Monorepo orchestration** | **Turborepo** or **Nx** when workspaces multiply (**`tooling-agent`** wires) |
| **Templates** | **`templates/`**, **`configs/`** stubs; align **`organizational_memory/ARCHITECTURE.md`** integration mode before paste |
| **Preview hosting** | **Vercel** per **`apps/<vertical>-instance`** — coordinate **DevOps** for project + env vars |

---

## QMS — action record

After **substantive work**, add one raw record under **`organizational_memory/QMS/inbox/`** following **`agents/agent-record-for-qms.md`**. **Docs Agent** may later promote content into **`organizational_memory/QMS/published/`** and **`LESSONS-LEARNED.md`** in ISO-style form.
