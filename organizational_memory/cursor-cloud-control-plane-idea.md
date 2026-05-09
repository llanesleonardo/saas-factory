# Idea: Cloud control plane on top of Cursor agents

## Intent
Build a SaaS “control plane” that treats Cursor as an external **agent runtime** (like a third-party system). The UI/product lives in the cloud; Cursor agents run in cloud mode against cloned repos and produce PRs/evidence.

## Target experience (operator)
- Pick a repo + queue (`factory/task-queue.json` or `factory/task-queues/*.json`)
- Click “Run next task” (or select a task id)
- See live run status/log stream + final result
- Get a PR link (never auto-merge)
- Track evidence: validations run, CI results, QMS inbox record pointers

## Architecture (high level)
- **Control plane (our SaaS)**
  - Stores: users/orgs, repo connections, policy (allowed roles, WIP cap, branch rules)
  - Creates jobs: (task id, role, repo ref, queue file, model, constraints)
  - Observes runs: run id, agent id, status, output artifacts, PR URL
- **Execution plane (Cursor Cloud runtime via `@cursor/sdk`)**
  - Runs agents in cloud mode against a freshly cloned repo
  - Produces code changes and opens PRs (or returns patch + PR opened by control plane)
- **GitHub**
  - CI gates and PR review remain the decision gate artifact

## Integration modes (v1 / v2)
### v1 — prompts + PRs (simple, safest)
- Control plane sends a single prompt that references repo role docs:
  - “Follow `@agents/<role>.md`. Implement only task id X. Branch `feature/X`…”
- Agent runs validations (`npm run check`, `npm run validate-task-queue`, etc.)
- Agent opens PR (or returns instructions to open PR)

### v2 — registry-driven orchestration (stronger, less drift)
- Control plane reads `factory/agent-registry.json` as a contract:
  - which roles exist, next_agents, schemas, approvals
- Control plane generates prompts, chooses next role, and enforces output validation

## Safety gates (non-negotiable)
- Never auto-merge PRs
- One task id per run (bounded scope)
- Always run validators/tests (in-run and/or CI)
- Distinguish failures:
  - startup failure (`CursorAgentError`) vs run failure (`result.status === "error"`)

## Data model (suggested)
- `repos` (url, default branch, installation id)
- `queues` (repo_id, path, type: canonical|derived, last_seen_sha)
- `jobs` (repo_id, queue_path, task_id, role_id, status, created_at, started_at, finished_at)
- `runs` (job_id, cursor_agent_id, cursor_run_id, model_id, runtime=cloud, logs_uri)
- `artifacts` (run_id, type: pr|validation|qms|diff, uri, sha)

## API (suggested)
- `POST /jobs` (create job: repo + task_id + role + queue path)
- `GET /jobs/:id` (status + artifacts)
- `POST /jobs/:id/cancel`
- `GET /repos/:id/queues` (discover queues from repo)

## Open questions
- Should the control plane be allowed to propose queue edits (as PRs) or remain execution-only?
- Should we support both cloud and local runtime, or cloud-only?
- How to store/stream logs: Cursor SDK stream vs our own event store.
- Authentication and permissions model (service accounts, per-org isolation).

## Repo hooks
- Keep PR as the merge gate artifact (aligns with QMS-PUB-005).
- Prefer using existing factory contracts:
  - `factory/task-queue.json` + `factory/task-queues/*.json`
  - `factory/agent-registry.json`
  - `npm run validate-*`

