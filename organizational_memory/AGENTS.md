# WHICH AGENT DO I TALK TO?

There is **one** Cursor chat. You choose a **role** by `@`-mentioning the matching file and telling the model to follow it for this turn. **Shortcut:** run **slash commands** under **`.cursor/commands/agent-*.md`** (e.g. `agent-dev`) which point at the same prompts. **Registry:** **`factory/agent-registry.json`** (categories, `next_agents`, schemas).

Handoff overview: see **`organizational_memory/AGENT-MAP.md`**.

**Lean manufacturing (humans + agents):** see **`organizational_memory/LEAN-MANUFACTURING.md`** — value stream, WIP limits, quality at source, waste checklist, kaizen. Ask Cursor to apply it with `@organizational_memory/LEAN-MANUFACTURING.md` (e.g. "we have too much WIP—suggest concrete repo/process changes").

## How calling an agent works

```mermaid
flowchart LR
  U[You]
  C[Cursor chat]
  A["@-mention agents/*.md"]
  M[Model follows that role]
  O[Output plus file edits]

  U -->|"instruction"| C
  C --> A
  A --> M
  M --> O
```

Typical **chain** (same chat, new message each time—you re-`@` the next role):

```mermaid
flowchart LR
  S[Spec Generator]
  P[PM]
  D[Dev]
  QU[Quality]
  F[Fix]
  G[Git]

  S --> P
  P --> D
  D --> QU
  QU -->|"fail"| F
  F --> QU
  QU -->|"pass"| G
```

**Quality** ( **`quality-agent.md`** ) carries **test harness / environments** (partner to **Dev**) **and** runs **verification gates** (build, tests, pass/fail JSON).

**Specialist stations** (Ford-line extras — `@` when needed; not every task uses every role):

```mermaid
flowchart TB
  SPI[Spike]
  AR[Architect]
  FIN[FinOps]
  PM[PM]
  BL[Builder]
  SEC[Security]
  DV[Dev]
  QUAL[Quality]
  DOV[DevOps]
  DOC[Docs]
  SUP[Support]
  TOO[Tooling]

  SPI --> AR
  AR --> PM
  FIN --> PM
  PM --> BL
  BL --> DV
  SEC --> DV
  DV --> QUAL
  SEC --> QUAL
  DOV --> QUAL
  SUP --> PM
  TOO --> DV
  TOO --> QUAL
  DOC --> DV
```

## Resources manifest (every agent invocation)

**Analogy — construction:** To build a wall you need **materials** (inputs). To bring **electricity** you need **permits, inspections, and utility coordination** (governance and dependencies). SaaS Factory agents should surface the same idea in software: what **artifacts**, **access**, **tools**, **other roles**, and **approvals** this turn depends on before laying brick or wiring code.

Whenever you **`@`** any **`agents/*-agent.md`** role, the agent **starts its reply** with a short manifest so dependencies are visible (pull-system thinking: don’t start work that assumes missing inputs).

Use this template **first**, then continue with the role’s normal behavior:

```markdown
### Resources & dependencies (this turn)
- **Role:** …
- **Task id / traceability:** … (or `n/a` + how work is bounded)
- **Inputs:** specs, configs, paths, tickets …
- **Tools / runtime:** Docker, Node, cloud CLI, feature flags …
- **Access / secrets:** repos, env vars, dashboards (name only — never paste secrets)
- **Human or org gates:** approvals, vendor dependency, compliance sign-off …
- **Upstream / downstream agents:** who already acted or should act next …
- **Blockers / unknowns:** … (`none` if clear)
```

If something critical is missing, say so **in Blockers** and ask for it before large edits (unless the user tells you to proceed anyway).

## Quick router

Each role file includes **`## Toolkit — modern stack`** (and PM / Architect / FinOps include factory **`Toolkit`** tables): curated **current-era tools** — IDE, CI, tests, security scanners, billing, docs sites — aligned with this repo where possible.

| I want to… | `@` this file | Say something like… |
|------------|----------------|---------------------|
| Turn a spec into a **task list** (JSON, no code) | `agents/pm-agent.md` | "Act as PM Agent per this file. Output only the JSON task list for `specs/plumber-spec.md`." |
| **Implement** one task in the codebase | `agents/dev-agent.md` | "Act as Dev Agent. Task id `PLU-003` only. Branch `feature/PLU-003`." |
| **Harness + gates** — local/CI env, fixtures, mocks **and** build/tests / acceptance | `agents/quality-agent.md` | "Act as Quality Agent for task `PLU-003`: align `.env.test` / compose / CI test job if needed; run `npm run build` / tests; report pass/fail JSON." |
| **Fix** failures Quality reported (no new features) | `agents/fix-agent.md` | "Act as Fix Agent. Here are the errors: …" |
| **Commit / PR / git** steps | `agents/git-agent.md` | "Act as Git Agent. Commit with message …, push branch, draft PR body." |
| **Generate / expand** a full vertical **spec** | `agents/spec-generator-agent.md` | With `specs/_generated/<vertical>-SPEC-PROMPT.md` after `npm run generate-spec`, or "expand section 6 of `specs/plumber-spec.md`." |
| **Improve** the **spec markdown** | `agents/spec-generator-agent.md` | "Act as Spec Generator Agent. Update `specs/plumber-spec.md` with: …" |
| **System boundaries / ADRs** | `agents/architect-agent.md` | "Act as Architect Agent. Where should job-state live: instance vs package?" |
| **Threats, controls, HIPAA-style checklist** | `agents/security-agent.md` | "Act as Security Agent. Review this PHI flow before we implement." |
| **Deploy, rollback, CI/Vercel runbooks** | `agents/devops-agent.md` | "Act as DevOps Agent. Document rollback for plumber preview deploy." |
| **README, runbooks, operator docs** | `agents/docs-agent.md` | "Act as Docs Agent. Add a 'First run' section to README for plumber." |
| **QMS — controlled docs & lessons** | `agents/docs-agent.md` + `organizational_memory/QMS/inbox/*.md` | "Act as Docs Agent. Turn these inbox records into a `published/` controlled document + update `LESSONS-LEARNED.md` per `agents/docs-agent.md`." |
| **Tickets → FAQ → PM feedback** | `agents/support-agent.md` | "Act as Support Agent. Turn this transcript into triage + spec gaps." |
| **Scripts, generators, Cursor rules** | `agents/tooling-agent.md` | "Act as Tooling Agent. Add an npm script to validate task-queue JSON." |
| **Plans, Stripe, metering, unit economics, instance profitability** | `agents/finops-agent.md` | "Act as FinOps Agent. Estimate MRR vs hosting + Stripe COGS for dentist-instance; recommend optimize vs sunset review tasks." |
| **Time-boxed unknown** (library, integration) | `agents/spike-agent.md` | "Act as Spike Agent, max 1h: can we use X for routing? Decision only." |
| **Bootstrap a new vertical app** (`apps/<id>-instance/`, configs, wiring) | `agents/builder-agent.md` | "Act as Builder Agent: scaffold `electrician-instance` from plumber pattern; no auto clone pipeline yet." |
| **Lean / flow / waste / WIP / kaizen** | `organizational_memory/LEAN-MANUFACTURING.md` | "Using LEAN-MANUFACTURING.md, review our process for: …" (normative doc; pair with Tooling/PM for changes.) File **Issues → Lean waste** (`lean issue` + **App / project bucket** → routes to that app's **GitHub Project** when configured — see **`organizational_memory/GITHUB-PROJECTS-SETUP.md`**). |

You can **@ more than one file** (e.g. `@specs/plumber-spec.md` + `@agents/pm-agent.md`).

## Role boundary matrix (factory-system work)

Use this when the work is about the **factory platform itself** (schemas, validators, CI gates, docs, QMS).

- **PM**: owns what becomes a task id in `factory/task-queue.json` (scope, acceptance criteria, dependencies, priority, closure expectations).
- **Dev**: owns implementation of a single task (code changes) and a clean handoff to Quality; does **not** own CI policy or harness design.
- **Quality**: owns harness + gates + evidence (fixtures, env, mocks/seeds, CI proof). Quality is the “stop-the-line” authority on pass/fail.
- **Fix**: owns remediation only when Quality/CI fails; minimal, scoped fixes until gates are green again.
- **Tooling**: owns factory kernel and automation (schemas, validators, planners/orchestrator ergonomics, CI wiring for factory tooling).
- **Docs**: owns operator docs and QMS consolidation (promoting `organizational_memory/QMS/inbox/` into `organizational_memory/QMS/published/`, updating `LESSONS-LEARNED.md`, maintaining cross-links).
- **DevOps**: owns deployment/infra automation and runbooks when the factory touches deploy surfaces (environment model, deploy guardrails, rollback).
- **Architect**: owns ADR-level decisions when a change affects architecture boundaries, integration mode, or shared package decisions.

### Quick ownership map

- **Schemas / contracts**: Tooling (authoring), PM (task definition), Quality (fixture coverage), Docs (human-facing conventions when needed)
- **Validators / CLIs**: Tooling (implementation), Quality (fixtures + gates), Fix (unblock failures), PM (keeps tasks aligned)
- **CI gates**: Quality (what must be proven + evidence shape), Tooling/DevOps (wiring), Fix (repair), Docs (how to run / interpret)
- **Task decomposition & prioritization**: PM (primary), Architect (boundary decisions), Tooling (factory primitives), Docs (doc tasks)
- **QMS inbox records (`organizational_memory/QMS/inbox/`)**: each role writes its own record after substantive work (per `agents/agent-record-for-qms.md`)
- **Published QMS docs (`organizational_memory/QMS/published/`)**: Docs Agent only (curation + document control)

### Why pull requests matter (factory principle)

In SaaS Factory, a pull request is the **decision gate artifact** that makes work **reviewable, traceable, and merge-safe**:

- **Quality gates attach to one diff**: CI/Quality results are tied to exactly what merges.
- **Traceability**: PR links **task id ↔ spec ↔ code ↔ QMS records**.
- **Scope control**: reviewers catch accidental file changes before `main`.
- **Audit trail**: discussion/approvals/timestamps are durable evidence.
- **Rollback clarity**: PRs are easy to revert/bisect.

### QMS IV&V controlled procedures (informative)

Standalone **verification / validation** procedures live under **`organizational_memory/QMS/published/`** (registry **`QMS/DOCUMENT-CONTROL.md`**, overview **`QMS/README.md`**): **QMS-PUB-001** system validation strategy · **QMS-PUB-002** system verification (acceptance) · **QMS-PUB-003** subsystem verification (acceptance) · **QMS-PUB-004** unit & device test plan. **`factory/agent-registry.json`** → **`references.qms_ivv_procedures`** lists the same paths for tooling.

## Phrase you can reuse

```text
For this message only, follow the role and rules in @agents/<FILE>.md.
My input: <paste lesson, error, or task>.
Do not switch to other roles unless I ask.
```

Use the exact filename: `pm-agent`, `builder-agent`, `dev-agent`, `quality-agent`, `fix-agent`, `git-agent`, `spec-generator-agent`, `architect-agent`, `security-agent`, `devops-agent`, `docs-agent`, `support-agent`, `tooling-agent`, `finops-agent`, `spike-agent`. (**`testing-agent`** / **`qa-agent`** remain as short redirects to **`quality-agent`**.) For lean practices (not a code role), use **`@organizational_memory/LEAN-MANUFACTURING.md`**.

---

## PM Agent (`pm-agent.md`)

**Call when:** you need a **structured backlog** from a spec, not code.

**Example use cases**

- "Break `specs/plumber-spec.md` into tasks under 2 hours each, with `depends_on`."
- "We added a new MVP requirement—regenerate only the JSON for tasks that changed."
- "Validate that every section of the spec has at least one task id."

**Output:** JSON task list → paste into `factory/task-queue.json`.

---

## Builder Agent (`builder-agent.md`)

**Call when:** you are **adding a new vertical instance** (`apps/<vertical>-instance/`) or turning an empty shell into a first PR-ready skeleton — **not** for every feature (that's **Dev**).

**Example use cases**

- "Create `apps/electrician-instance/` mirroring `plumber-instance` + `vercel.json` + stub `index.html`; add `configs/electrician.json`."
- "List every file and workflow row needed so GitHub Project label `app:electrician-instance` works."
- "After skeleton exists, hand off first real tasks to PM → task-queue → Dev."

**Output:** checklist + minimal diffs; **no** claim of a fully automated clone/apply pipeline (see **`organizational_memory/ARCHITECTURE.md`** Builder section).

---

## Dev Agent (`dev-agent.md`)

**Call when:** you are implementing **one assigned task** in the repo.

**Expert bar:** **`agents/dev-agent.md`** defines **expert developer doctrine**—systems + product + **AI collaboration** (review/steer, don’t blindly merge), backend/FE/SQL/testing/DevOps/security literacy, and **structure agents can extend**.

**Example use cases**

- "Implement `PLU-005` in `apps/plumber-instance` only; branch `feature/PLU-005`."
- "Add the API route described in the task; do not refactor unrelated modules."
- "Lesson learned: always use this error shape—apply to the files you touched for this task."

**Output:** code changes + short summary of files touched.

---

## Quality Agent (`quality-agent.md`)

**Call when:** you need **test environments / harness** (partner to **Dev**) **and/or** **verification** — build, tests, manual checklists — with a single accountable role.

**Example use cases**

- "Add `docker-compose.test.yml` + seed script so integration tests have Postgres + Redis."
- "Wire GitHub Actions test job to use `NODE_ENV=test` and documented secret names only."
- "Run the test suite and report `{ status, errors }` per quality-agent."
- "Define a manual test checklist for the plumber job board from the spec."

**Output:** harness/config changes when needed + **`{ status, errors }`** JSON for gates; may suggest follow-up **Fix** work.

---

## Fix Agent (`fix-agent.md`)

**Call when:** **Quality** (or CI) reported **specific failures** and you want fixes **without** scope creep.

**Example use cases**

- "These 3 test failures: fix only what's needed to pass."
- "Build fails with this stack trace—minimal patch."
- "Do not add the calendar feature; only resolve the type error."

**Output:** targeted patches; then call **Quality** again.

---

## Git Agent (`git-agent.md`)

**Call when:** work is done and you want **version control hygiene** (commit message, branch, PR text).

**Example use cases**

- "Draft a conventional commit for the current diff; task id in the subject."
- "Write PR description linking to `PLU-003` and listing files changed."
- "Suggest branch name and rebase steps before merge."

**Output:** text for you to run in terminal / GitHub (or let Cursor apply if you approve).

---

## Spec Generator Agent (`spec-generator-agent.md`)

**Call when:** the **spec markdown** itself should be created, expanded, or corrected.

**Example use cases**

- "Turn `specs/_generated/plumber-SPEC-PROMPT.md` into a full `specs/plumber-spec.md`."
- "Add a 'Data retention' subsection under compliance for HIPAA."
- "Mark Phase 2 items clearly; tighten MVP acceptance bullets."

**Output:** updates under `specs/<vertical>-spec.md` — blueprint-style spec (entities + relationships + lifecycles, deterministic workflows, integration map, structured NFRs); **no** task JSON or code here (then **PM** for backlog).

---

## Architect Agent (`architect-agent.md`)

**Call when:** boundaries across `apps/*`, `packages/*`, or cross-cutting technical decisions.

**Example use cases** — "Where does auth session live for instances?" · "Draft an ADR for event sourcing vs CRUD for jobs." · "This change touches 3 packages—order the migrations." · "Should **electrician-instance** be **monorepo-integrated**, **HTTP-integrated** to core SaaS, or **standalone**?" · "Where do **frontend** bundles vs **backend** routes live for this vertical?"

**Output:** decision + consequences; optional ADR markdown path you provide.

---

## Security & Compliance Agent (`security-agent.md`)

**Call when:** threats, controls, secrets, PHI/PCI scope, dependency risk before or after implementation.

**Example use cases** — "Review OAuth callback flow." · "HIPAA minimum technical controls for audit log." · "Flag PII in logs for this PR diff."

**Output:** structured review — attack surface, data classification, **severity-ranked** findings (with remediation tiers), multi-tenant isolation checks when relevant — plus actionable checklist for Dev / Quality / DevOps (not legal advice).

---

## DevOps / SRE Agent (`devops-agent.md`)

**Call when:** deploy, rollback, GitHub Actions, Vercel, env/secrets **names**, smoke checks after release.

**Example use cases** — "Write rollback steps for failed Vercel prod deploy." · "Suggest health check after merge to main."

**Output:** runbook + minimal workflow/config edits.

---

## Docs Agent (`docs-agent.md`)

**Call when:** onboarding, operator guides, README, API usage docs for humans — and when you need **QMS-inspired** outputs: **controlled procedures** under **`organizational_memory/QMS/published/`**, **document control** metadata, **Mermaid** process diagrams, and the rolling **`organizational_memory/QMS/LESSONS-LEARNED.md`** register from **`organizational_memory/QMS/inbox/`** records (see **`agents/agent-record-for-qms.md`**).

**Example use cases** — "Document `npm run factory` for new hires." · "Add troubleshooting for empty `task-queue.json`." · "Consolidate last sprint’s inbox files into one approved work instruction with revision history."

**Output:** markdown updates; **published** docs use **`organizational_memory/QMS/TEMPLATE-CONTROLLED-DOCUMENT.md`**; no invented flags without verifying repo; do **not** claim ISO certification unless the org truly has it.

---

## Support / CS Agent (`support-agent.md`)

**Call when:** customer voice: triage templates, FAQ, routing feedback to PM/spec.

**Example use cases** — "Turn these 5 tickets into FAQ + spec gaps." · "Classify: bug vs doc vs training."

**Output:** structured triage — issue taxonomy, severity, **user intent vs actual**, repro confidence, frequency signal, vertical/version linkage, routing (Quality/Fix vs PM/Spec vs Docs vs Security/DevOps), closure checklist; FAQ/outline as needed (**PII redacted**).

---

## Tooling / DX Agent (`tooling-agent.md`)

**Call when:** factory ergonomics — scripts, templates, `.cursor` rules, `factory/*` helpers.

**Example use cases** — "Add JSON schema validation for `task-queue.json`." · "Normalize npm script names across README."

**Output:** factory automation (scaffold/validator/CI/editor) with **golden-path** docs; versioning/drift/rollback notes when tooling behavior changes; **small blast radius** — avoid huge frameworks.

---

## FinOps / Billing Agent (`finops-agent.md`)

**Call when:** plans, Stripe objects, metering, dunning, entitlements vs spec — plus **economic snapshots** (MRR/COGS/margin bands per **`apps/<vertical>-instance`**), cost attribution, optimize / scale / sunset **recommendations** (tasks for PM/DevOps; no autonomous production kills unless org built governance).

**Example use cases** — "Map 'per location' pricing to Stripe Prices." · "Health JSON for plumber-instance given exports." · "Rules when margin drops below 40%."

**Output:** plan matrix + `packages/billing` sketch + optional structured economics JSON (not tax/legal/accounting advice).

---

## Spike / Research Agent (`spike-agent.md`)

**Call when:** unknown tech or integration **before** committing the line to full Dev work.

**Example use cases** — "2h spike: does library X support offline queue?" · "Feasibility of maps provider Y under our compliance note."

**Output:** time-boxed **decision** (proceed / caveats / stop) with **confidence** + **residual risk**, hypothesis→test→result, evidence, **Architect**/PM handoff; spike memo for reuse; **no** production code unless explicitly waived.

---

## Lessons learned (where to send them)

| Kind of lesson | Prefer |
|----------------|--------|
| New vertical folder / scaffold / "clone pattern" | `@agents/builder-agent.md` |
| How we build / code structure | `@agents/dev-agent.md` |
| Where code *should* live / platform shape | `@agents/architect-agent.md` |
| Scope, priorities, tasks, acceptance | `@agents/pm-agent.md` (often **after** spec edits via spec-generator) |
| Harness (env, fixtures, CI matrix, mocks) **and** gates (tests, regressions, acceptance) | `@agents/quality-agent.md` |
| Only while fixing red CI/tests | `@agents/fix-agent.md` |
| Security / privacy / compliance (technical) | `@agents/security-agent.md` |
| Deploy / ops / incidents | `@agents/devops-agent.md` |
| How to run / explain the product | `@agents/docs-agent.md` |
| What customers hit in the field | `@agents/support-agent.md` |
| Repo scripts, generators, editor rules | `@agents/tooling-agent.md` |
| Pricing, plans, Stripe modeling | `@agents/finops-agent.md` |
| "Should we use X?" (time-boxed) | `@agents/spike-agent.md` |
| **QMS evidence → procedures / lessons** | Raw **`organizational_memory/QMS/inbox/`** per role, then **`@agents/docs-agent.md`** to curate **`published/`** + **`LESSONS-LEARNED.md`** |

---

## Optional: factory reminder

`npm run factory` prints a **runbook** per task (Dev → Quality → Fix → Git). It does **not** open chat for you; use the router table to decide who to `@` for each step.

### Per-app task queues (optional)

By default the factory reads from **`factory/task-queue.json`**. If you want one queue per app (or per domain bucket), use:

- **Generate per-app queues**: `npm run task-queues:sync` → writes `factory/task-queues/*.json` and `factory/task-queues/index.json`
- **Pick next task from a specific queue**: `npm run factory:next -- --queue=factory/task-queues/<queue>.json`
- **Parallel waves for a specific queue**: `npm run parallel-plan -- --queue=factory/task-queues/<queue>.json`
- **Runbook for a specific queue**: `npm run factory -- --queue=factory/task-queues/<queue>.json`

