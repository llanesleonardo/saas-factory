# GITHUB PROJECTS — ONE BOARD PER APP

This repo expects **four GitHub Projects (new Projects, not Classic)** — one for each deployable **`apps/*`** instance below — and routes **Issues** onto the right board using labels:

| Label | App folder | Repository variable (Actions → Variables) |
|-------|------------|---------------------------------------------|
| `app:core-saas` | `apps/core-saas/` | `PROJECT_URL_APP_CORE_SAAS` |
| `app:dentist-instance` | `apps/dentist-instance/` | `PROJECT_URL_APP_DENTIST` |
| `app:plumber-instance` | `apps/plumber-instance/` | `PROJECT_URL_APP_PLUMBER` |
| `app:mission-control-instance` | `apps/mission-control-instance/` | `PROJECT_URL_APP_MISSION_CONTROL` |

## 1. Create four projects

1. GitHub → **Projects** → **New project** (table or board).
2. Name them clearly, e.g. `Core SaaS`, `Dentist instance`, `Plumber instance`, `Mission control`.
3. Open each project → **⋯** → **Settings** and copy the **browser URL**.  
   Examples:
   - `https://github.com/users/YOUR_USERNAME/projects/3`
   - `https://github.com/orgs/YOUR_ORG/projects/5`

## 2. Add repository variables

Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**

| Name | Value |
|------|--------|
| `PROJECT_URL_APP_CORE_SAAS` | Full project URL for core SaaS |
| `PROJECT_URL_APP_DENTIST` | Full project URL for dentist app |
| `PROJECT_URL_APP_PLUMBER` | Full project URL for plumber app |
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

- **Lean waste** template: pick **App / project bucket** (stores `app:…` text in the issue body). **Manually add** the matching **`app:*`** label on the issue so **`issue-add-to-app-project`** can route it (GitHub forms cannot set dynamic labels from dropdown values).
- **Core SaaS / Dentist / Plumber / Mission control** issue templates: they apply the **`app:*`** label directly when the issue is created.
- Workflow **`issue-add-to-app-project`** runs on `opened`, `labeled`, `reopened` and adds the issue to the project whose URL is in the matching variable.

## 5. Filtering in GitHub

- All lean items: `label:"lean issue"`.
- Dentist board work: project **Dentist** or search `label:app:dentist-instance`.
- Mission control board: search `label:app:mission-control-instance`.

Use **one** primary `app:*` label per issue so it lands on one board (cross-cutting work: pick the owning app or split into two issues).
