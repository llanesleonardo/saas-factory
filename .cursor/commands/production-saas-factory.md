# PRODUCTION SAAS FACTORY (PARALLEL + GITHUB + VERCEL)

Use this checklist when you want the **upgrade tier**: parallel CI gates, per-app deploy.

## 1. Parallel waves (local)

- Fill `factory/task-queue.json` with tasks and `depends_on`.
- `npm run parallel-plan` — human-readable waves (tasks that can run in parallel share a wave).
- `npm run parallel-plan -- --json` — machine-readable plan (CI uploads this as an artifact).

## 2. GitHub — parallel CI

- Push a branch / open a PR: workflow **Factory CI (parallel)** runs jobs in parallel: **typecheck** (`npm run check`), **factory validators** (task queue, registry, fixtures, QMS inbox checks, etc.), **`npm run factory`**, and **parallel wave plan** JSON (uploaded as an artifact).

## 3. Vertical spec prompts (local)

- `npm run generate-spec -- <vertical>` — see main README **Generate a full vertical spec**.

## 4. Vercel — per app

- Create a Vercel project per app you deploy (see `apps/*/vercel.json` where present).
- Add repo secrets (example for `core-saas`): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_CORE_SAAS` — see `.github/workflows/vercel-deploy.yml`.
- Actions → **Vercel (per app)** → Run workflow → production `true` or `false` (preview).

Add deploy jobs to the workflow when you add more apps to the matrix.
