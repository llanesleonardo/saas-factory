# GITHUB PROJECTS — ONE BOARD PER APP

This repo uses **one GitHub Project (new Projects, not Classic) per deployable `apps/*` app** you track — and routes **Issues** onto the right board using labels:

| Label | App folder | Repository variable (Actions → Variables) |
|-------|------------|---------------------------------------------|
| `app:core-saas` | `apps/core-saas/` | `PROJECT_URL_APP_CORE_SAAS` |
| `app:todo-instance` | `apps/todo-instance/` | `PROJECT_URL_APP_TODO` |
| `app:mission-control-instance` | `apps/mission-control-instance/` | `PROJECT_URL_APP_MISSION_CONTROL` |

## 1. Create one project per app

1. GitHub → **Projects** → **New project** (table or board).
2. Name them clearly, e.g. `Core SaaS`, `Todo instance`, `Mission control`.
3. Open each project → **⋯** → **Settings** and copy the **browser URL**.  
   Examples:
   - `https://github.com/users/YOUR_USERNAME/projects/3`
   - `https://github.com/orgs/YOUR_ORG/projects/5`

## 2. Add repository variables

Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**

| Name | Value |
|------|--------|
| `PROJECT_URL_APP_CORE_SAAS` | Full project URL for core SaaS |
| `PROJECT_URL_APP_TODO` | Full project URL for todo instance |
| `PROJECT_URL_APP_MISSION_CONTROL` | Full project URL for mission control instance |

Leave a variable **empty** to skip auto-adding for that app (workflow job no-ops).

## 3. Personal access token (required for `actions/add-to-project`)

GitHub's default `GITHUB_TOKEN` usually **cannot** add issues to all project setups. Use a **PAT**:

1. Create a **fine-grained PAT** (or classic with `repo` + `project`) with access to this repository and **read/write Projects**.
2. Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**  
   Name: **`ADD_TO_PROJECT_PAT`**  
   Value: the PAT.

See: [actions/add-to-project — Creating a PAT](https://github.com/actions/add-to-project#creating-a-pat-and-adding-it-to-your-repository).

## 4. How issues get onto a board

- **Core SaaS** (and other app) issue templates: they apply the **`app:*`** label directly when the issue is created (when those templates exist in the repo).
- Workflow **`issue-add-to-app-project`** runs on `opened`, `labeled`, `reopened` and adds the issue to the project whose URL is in the matching variable.

## 5. Filtering in GitHub

- If you use an optional **`lean issue`** label for kaizen triage: `label:"lean issue"`.
- Todo app board: search `label:app:todo-instance` (when you add a matching workflow job and variable).
- Mission control board: search `label:app:mission-control-instance`.

Use **one** primary `app:*` label per issue so it lands on one board (cross-cutting work: pick the owning app or split into two issues).
