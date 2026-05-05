# PRODUCTION SAAS FACTORY (PARALLEL + GITHUB + VERCEL)

Use this checklist when you want the **upgrade tier**: parallel CI gates, remote dispatch, per-app deploy.

## 1. Parallel waves (local)

- Fill `factory/task-queue.json` with tasks and `depends_on`.
- `npm run parallel-plan` — human-readable waves (tasks that can run in parallel share a wave).
- `npm run parallel-plan -- --json` — machine-readable plan (CI uploads this as an artifact).

## 2. GitHub — parallel CI

- Push a branch / open a PR: workflow **Factory CI (parallel)** runs **four jobs at once** (typecheck, orchestrator, matrix spec generation for dentist + plumber, parallel wave JSON).

## 3. GitHub — distributed dispatch

- Actions → **Factory distributed dispatch** → Run workflow → choose vertical `all | dentist | plumber`.
- Or trigger via API:

  `gh workflow run factory-distributed-dispatch.yml -f vertical=all`

- For `repository_dispatch`, send event type `factory-run` with JSON body `{ "vertical": "dentist" }` (optional; same resolver as manual).

## 4. Vertical spec prompts (already automated locally)

- `npm run generate-spec -- <vertical>` — see main README **Generate a full vertical spec**.

## 5. Vercel — one project per app

- Create four Vercel projects linked to `apps/core-saas`, `apps/dentist-instance`, `apps/plumber-instance`, `apps/mission-control-instance` (each folder has `index.html` + `vercel.json`).
- Add repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_CORE_SAAS`, `VERCEL_PROJECT_ID_DENTIST`, `VERCEL_PROJECT_ID_PLUMBER`, `VERCEL_PROJECT_ID_MISSION_CONTROL`.
- Actions → **Vercel (per app)** → Run workflow → production `true` or `false` (preview).

Four deploy jobs run **in parallel** (one per `apps/*` instance folder above).
