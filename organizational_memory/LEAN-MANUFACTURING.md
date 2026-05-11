# LEAN MANUFACTURING × THIS FACTORY (AGENTS + HUMANS)

Lean is about **flowing value with less waste**. Here is how to practice it **in this repo** without new tooling requirements.

## 1. Value stream (see the whole flow)

**Value** = working software a customer can use. Everything else is overhead.

| Stage | Artifact / action | Primary agent(s) | Human |
|-------|-------------------|------------------|--------|
| Need | Problem / market | Support → PM | You approve direction |
| Design | `specs/*-spec.md` | Spec Generator, Architect, Security | You approve spec |
| Plan | `factory/task-queue.json` | PM | You paste / merge JSON |
| Build | `apps/*`, `packages/*` | Dev | You review PRs |
| Verify | tests, CI | QA, Fix | You unblock decisions |
| Ship | merge, deploy | Git, DevOps | You approve prod |
| Learn | tickets, incidents | Support, PM, Docs | Kaizen (below) |

**Practice:** Draw or update this chain when scope drifts. If a step has no owner, **waste** appears (rework, wait time).

---

## 2. Pull, don't push (limit WIP)

- **Pull** = start the next Dev task only when the previous one is **done** (merged or explicitly parked) and capacity exists.
- **WIP limit** = agree a number (e.g. **2** concurrent in-progress tasks per developer). Keep `factory/task-queue.json` honest: at most that many tasks marked in-progress if you add a `status` field later; until then, track WIP **outside** the file (board, sticky note, GitHub Project column "Doing" max 2).

**Practice:** Before `@agents/dev-agent.md` on a new id, ask: *Is something still in QA or open PR?*

---

## 3. Small batches (one piece flow)

- PM tasks stay **≤ ~2 hours** (already in `pm-agent.md`).
- PRs should map to **one task id** when possible (already in `dev-agent.md`).

**Practice:** Split large tasks in PM before Dev starts. **Spike Agent** for unknowns so Dev doesn't become research.

---

## 4. Quality at the source (jidoka)

- **Definition of Done** lives with **Quality Agent** (tests + acceptance).
- **Security Agent** early on risky flows (auth, PHI, payments), not only after breach.
- **Fix Agent** only on **signals** (failing test, CI red)—fix root cause, not symptoms only.

**Practice:** No merging to `main` if CI is red (**stop the line**). Git Agent runs only after QA pass.

---

## 5. Standard work (the agents *are* the standard)

- `@agents/*.md` = **work instructions** for Cursor. Don't skip them for "speed."
- `npm run factory` / `npm run parallel-plan` = **standard work for the task board**.
- **Post-merge closure is standard work:** after a PR merges, close the loop per **`organizational_memory/QMS/published/QMS-PUB-005-pull-request-decision-gate.md`**:
  - mark completed task ids `done` in `factory/task-queue.json`
  - ensure QMS inbox evidence exists (Dev/Quality/Fix as applicable)

**Practice:** When someone finds a better way, update the **agent file** or this doc (standardize the improvement).

---

## 6. Visual management (make work visible)

- **Board:** GitHub Project columns: Backlog → Ready → Doing (WIP cap) → In review → Done.
- **Signals:** CI badge on README, failing workflow = **andon** (red light).
- **Batch view:** `npm run parallel-plan` shows **waves** (what could run in parallel without dependency waste).

**Practice:** Link PR to **task id** in title/body so traceability is visible.

---

## 7. Waste types (TIMWOOD) — quick checklist

| Waste | In software factory | Counter-move |
|-------|----------------------|----------------|
| Transport | Handoffs without context | `@` spec + task + agent in same message |
| Inventory | Huge branches, long-lived PRs | Small PRs, trunk-friendly habits |
| Motion | Context-switching | WIP limits, finish before starting |
| Waiting | Review / env blocked | DevOps runbooks, clear "blocked" column |
| Overproduction | Features no spec ties to | PM + spec traceability |
| Over-processing | Gold-plating, extra refactors | Dev Agent "only this task" |
| Defects | bugs in prod | QA + Security earlier |
| Skills | only one person knows X | Docs Agent + README |

---

## 8. Kaizen (continuous improvement)

- After incidents or releases: short **retro** (15–30 min): what to **start/stop/continue**.
- Feed **one** concrete improvement into **Tooling** (scripts/rules), **Docs** (README), or **PM** (task template), not ten at once.

**Practice:** Use `@agents/support-agent.md` to summarize customer pain; use **PM** to turn one improvement into **one** new or updated task.

---

## 9. Who does what (lean × agents)

| Lean idea | Prefer these `@` agents |
|-----------|-------------------------|
| Line design / reduce handoffs | Architect, Tooling |
| Built-in quality | QA, Security, Fix |
| Smooth flow / ship | DevOps, Git |
| Stable standards | Docs, Tooling |
| Voice of customer → backlog | Support → PM |
| Reduce unknown work before line | Spike → Architect → PM |

---

## 10. Optional next hardening (when you feel pain)

- Add **`status`** on tasks in `task-queue.json` + a tiny validator (`npm run validate-queue`) — **Tooling Agent** can help design it.
- **GitHub Project** template linked from **`organizational_memory/README.md`** or root README.
- **Branch protection** + required CI = automatic **stop the line**.

---

## 11. GitHub Issues (`lean issue` label)

- In GitHub: **Issues → New issue → Lean waste** (issue form under `.github/ISSUE_TEMPLATE/lean-waste.yml`).
- New issues get the label **`lean issue`** (with a space) so you can filter `label:"lean issue"` and run lean kaizen / triage in the browser.
- Workflow **Ensure lean issue label** (`.github/workflows/ensure-lean-label.yml`) creates that label on push to `main` / `master` if it does not exist yet (GitHub does not auto-create labels from templates).
- The form **App / project bucket** writes `app:core-saas` | `app:dentist-instance` | `app:plumber-instance` | `app:mission-control-instance` into the body for humans and search. **Add the same `app:*` label manually** on the issue (sidebar) so **`issue-add-to-app-project`** can attach it to the right **GitHub Project** (§12).

**Practice:** Close a lean issue only with a **countermeasure** linked (PR, doc, rule change, or explicit "won't fix" reason).

---

## 12. GitHub Projects (one board per app)

- Create **four** GitHub Projects (new Projects), one per app bucket: **Core SaaS**, **Dentist instance**, **Plumber instance**, **Mission control** (`apps/mission-control-instance/`).
- Per-app **issue templates** (Core SaaS, Dentist, Plumber, **Mission control instance**) apply labels `app:core-saas`, `app:dentist-instance`, `app:plumber-instance`, `app:mission-control-instance` so the same automation can attach work to the correct board.
- Setup (PAT, repository **Variables** for project URLs, troubleshooting): **`GITHUB-PROJECTS-SETUP.md`** (this folder).
- Workflow: **`issue-add-to-app-project`** adds the issue to the project URL in the variable that matches its **`app:*`** label (each issue needs that label applied — use the sidebar after filing **Lean waste**, or use an issue template that applies `app:*` directly).

---

This file is **normative for humans**; Cursor picks it up when you `@organizational_memory/LEAN-MANUFACTURING.md` with a specific situation ("we're drowning in WIP—what should we change?").
