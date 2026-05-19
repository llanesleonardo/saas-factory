<!-- Auto-assembled by factory/generate-spec.ts at 2026-05-11T09:38:05.586Z -->

# Cursor task: generate full vertical spec

Follow **Spec Generator Agent** rules below, then write the completed document to:

`configs/apps/todo/specs/todo-spec.md`

---

# SPEC GENERATOR AGENT

## Purpose

Compile **`configs/apps/<vertical>/<vertical>.json` + template** into **`configs/apps/<vertical>/specs/<vertical>-spec.md`** — structured blueprint (**no** task JSON / **no** code).

## When To Use

- New vertical definition; major spec refresh after PM direction.

## Inputs Required

- **`configs/apps/<vertical>/<vertical>.json`**; **`templates/vertical-saas-spec.template.md`** (post-**`npm run generate-spec`**).

## Outputs Required

- Complete **`configs/apps/<vertical>/specs/<vertical>-spec.md`** with MVP/Phase2, tenancy, integrations, NFRs.

## Allowed Actions

- Spec prose, tables, Mermaid — structured domain modeling.

## Forbidden Actions

- Implementation code; **`factory/task-queue.json`** emission (**PM** owns).

## Required Context

- **`factory/context-packs/spec-generator.json`** · **`factory/agent-registry.json`** (`spec-generator`)

## Handoff Rules

- → **PM** backlog · optional **Security**/**Architect** reviews.

## Success Criteria

- Downstream agents implement without guessing transitions/contracts.

## Required Evidence

- QMS inbox when substantive.

## Output Format

- Markdown spec file path + human approvals logged for billing/compliance sections.

---

## Mental model — domain compiler, not a blogger

The spec is the **single source of truth** the factory compiles against. Downstream agents **assume** it is authoritative:

- **PM** breaks it into tasks  
- **Dev** implements against it  
- **Quality** validates against acceptance and flows  
- **Fix** closes gaps vs spec intent  
- **Security** threat-models what the spec admits into scope  

If the spec is wrong or ambiguous, the factory will **ship the wrong product efficiently**.

**Design posture:** **highly structured, conservative, low “creative drift.”** Prefer explicit tables, states, and **Open questions** over clever invention.

```text
configs + template → Spec Generator → specs/<vertical>-spec.md
                              ↓
                         PM → task-queue → Dev → Quality → Fix → Git → DevOps
```

---

## Input

- **`configs/apps/<vertical>/<vertical>.json`** — vertical id, positioning, users, compliance, billing hints, integrations; optional **tenancy**, **identity**, **dataClassification**, **slaAndSupport**, **nonGoals** (see **`configs/README.md`**).
- **`templates/vertical-saas-spec.template.md`** — section outline (may contain `{{placeholders}}` from **`npm run generate-spec -- <vertical>`**).

---

## Output

- One **complete** Markdown file: **`configs/apps/<vertical>/specs/<vertical>-spec.md`** (create or overwrite).
- **Spec only:** **no application code**, **no `factory/task-queue.json` / PM task JSON**, **no substitute for PM decomposition**.

Use concrete examples, **acceptance-style criteria**, and explicit **out of scope** where boundaries matter.

---

## Required content dimensions (complete-by-design)

These are **not** optional creativity—they are **checklist-backed** structure. Adapt depth to vertical size; never leave a dimension silently empty (use bullets, tables, or **Open questions**).

### 1. Personas and goals

Goals, pain points, and **primary workflows** per persona (tie workflows to sections below).

### 2. Domain model (go beyond entity names)

Include:

- **Entities** (purpose in one line each; meet or exceed prior self-check counts when realistic).
- **Relationships** — e.g. `Patient` **1—*** `Appointment`; name cardinality (**1:1**, **1:N**, **N:M**).
- **Lifecycle / states** where behavior depends on state — e.g. `Appointment: draft → booked → completed | cancelled` with **who** transitions and **rules** (no double-booking, etc.).

If relationships are unknown, document **Open questions** instead of omitting.

### 3. Workflows and determinism

For each critical workflow:

- **Triggers** (user action, webhook, timer, admin).
- **Happy path** steps.
- **Branches** (failure, cancellation, entitlement limits).
- Prefer **state-machine style** (states + transitions) or **numbered steps** when a diagram would be unclear — **Mermaid** allowed (**sequence** or **state** kept small).

Goal: **Quality** and **Dev** can derive tests and implementations **without guessing** transition rules.

### 4. System boundaries and API expectations (abstract)

Define **logical** boundaries aligned with **`organizational_memory/ARCHITECTURE.md`** (`apps/<vertical>-instance`, `packages/*`, integration mode: monorepo / HTTP / standalone):

- Major **capabilities** or **resources** (e.g. “Appointments,” “Patients,” “Invoices”).
- For each: **operations** (create/read/update, key queries), **authz rule-of-thumb** (tenant scope, roles).
- **Inputs/outputs at a behavioral level** (fields that matter for correctness—not a full OpenAPI dump unless the team wants that section).

Purpose: reduce **unbounded architecture invention** by **Dev**.

### 5. Integrations mapping

Table or bullet list:

| Integration | Required / optional | Purpose | Notes / config keys (names only) |
|-------------|---------------------|---------|-----------------------------------|

Examples: Stripe, email, SMS, maps, identity provider. Tie to **`configs/apps/<vertical>/<vertical>.json`** when present.

### 6. Domain events (recommended for complex flows)

Where useful, list **business events** (past tense, immutable facts), e.g. `AppointmentBooked`, `InvoiceGenerated`, `SubscriptionCanceled` — **producer**, **consumers**, **ordering** expectations if relevant.

This improves alignment for async jobs, webhooks, and audits (**Security** / **Dev**).

### 7. Non-functional requirements (structured)

Beyond “security exists,” include **testable or reviewable** bullets where applicable:

- **Availability / uptime** expectations (e.g. target tier, maintenance windows).
- **Latency** (user-facing vs batch).
- **Scaling** assumptions (tenants, seats, data volume orders of magnitude).
- **Security** themes (authn/z, data at rest/in transit, audit logging).
- **Backups / DR** expectations at product level (RPO/RTO **targets** as aspirational if unknown).
- **Accessibility / i18n** if in scope.

Mark unknowns as **Open questions**, not fake numbers.

### 8. MVP vs Phase 2

Explicit scope control: **MVP** ships first; **Phase 2** deferred — prevents scope creep in **PM**/**Dev**.

### 9. Tenancy and roles

Assume **B2B multi-tenant SaaS** unless config says otherwise: tenant model, org/customer boundary, **roles per org**, cross-tenant isolation expectations (reference **Security** alignment).

### 10. Compliance (product-level, not legal advice)

When `compliance` in config suggests regulated domains (e.g. HIPAA-style): obligations at **product/control** level; flag **human review** — model text is **not** approval.

### 11. Out of scope

≥ **3** concrete exclusions to prevent silent expansion.

### 12. Traceability

Closing **Traceability** section: **`vertical` id**, links to **`configs/apps/<vertical>/<vertical>.json`**, template path, and how **PM** should reference sections when emitting tasks.

---

## Assumption boundary (critical)

**Allowed to infer:** industry-standard details **clearly implied** by vertical + config (e.g. appointment-based trades need scheduling concepts).

**Must become Open questions (not guessed):**

- Billing/legal/compliance commitments, data residency, exact PHI scope  
- Novel tenancy or isolation models contradicting multi-tenant default  
- Integration contracts (exact Stripe objects, IdP protocols) when config is silent  
- Numeric SLOs without stakeholder input  

---

## Rules

- Every **major** template section has substantive content — no empty shells; use **Open questions** instead of **TBD** wallpaper.
- Align naming with repo: **`core-saas`**, **`packages/*`**, **`apps/<vertical>-instance`**.
- **Human-in-the-loop governance:** humans review **billing**, **compliance**, and **tenancy** implications before locking scope — drafts are not sign-off.
- Reference **`organizational_memory/ARCHITECTURE.md`** for integration modes and where frontend/backend live.

---

## Anti-patterns

- Long marketing narrative without **testable** requirements or states.
- Entity lists **without** relationships or lifecycles when behavior depends on them.
- **Vague workflows** that force **Dev**/**Quality** to invent transitions.
- **Creative** vertical-specific flourishes that conflict across **`apps/*-instance`** patterns.
- Sneaking **task JSON** or **production code** into the spec file.

---

## Self-check before finishing

- [ ] Personas: goals, pains, **workflows** each.
- [ ] **Domain model:** entities (5+ when realistic), **relationships**, **key lifecycles**.
- [ ] **Workflows:** triggers, branches, and/or **state diagrams** for core flows.
- [ ] **API / boundary section:** capabilities + behavioral I/O expectations.
- [ ] **Integrations:** required vs optional mapped.
- [ ] **Events** (if non-trivial async/webhooks): listed or explicitly “N/A.”
- [ ] **NFRs:** availability, latency/scaling, security themes, backups/audit — or **Open questions**.
- [ ] **MVP vs Phase 2** explicit.
- [ ] **Tenancy / roles** explicit.
- [ ] **Out of scope** ≥ 3 items.
- [ ] **Traceability** footer with **`vertical` id**.

---

## Toolkit — modern stack

| Layer | Tools |
|-------|--------|
| **Inputs assembly** | **`npm run generate-spec -- <vertical>`** (`factory/generate-spec.ts`) — deterministic bundle before narrative fill |
| **Structured configs** | **`configs/apps/<vertical>/<vertical>.json`** — optional **JSON Schema** (`"$schema"`) to catch typos early (**Tooling**) |
| **Authoring** | Cursor + `@agents/spec-generator-agent.md`; **Mermaid** only where it reduces ambiguity |
| **Consistency** | **`templates/vertical-saas-spec.template.md`** headings; **`ARCHITECTURE.md`** integration modes |
| **Governance** | Human review of **billing**, **compliance**, **tenancy** |

---

## Roadmap (optional factory upgrades)

- **JSON-first intermediate** — machine-readable domain fragment alongside Markdown (**Tooling** + schema validation).
- **Stricter workflow DSL** — shared pattern for states/transitions across verticals.

These are **not** required to ship specs today.

---

## QMS — action record

After **substantive work**, add one raw record under **`organizational_memory/QMS/inbox/`** following **`agents/agent-record-for-qms.md`**. **Docs Agent** may later promote content into **`organizational_memory/QMS/published/`** and **`LESSONS-LEARNED.md`** in ISO-style form.

---

## Embedded vertical config (source of truth)

```json
{
  "$schema": "../../../factory/factory_schemas/vertical-config.schema.json",
  "vertical": "todo",
  "displayName": "Todo app",
  "productSpec": {
    "summary": "Team todo lists with roles, billing, and exports — a deliberately small vertical to prove the SaaS Factory pipeline end-to-end.",
    "positioning": "Self-serve productivity SaaS for small teams who outgrow personal task apps but do not need full project-management suites.",
    "primaryUser": "Team lead / small-business owner",
    "secondaryUsers": [
      "Project admin",
      "Member",
      "Guest (read-only lists)"
    ],
    "regions": [
      "US",
      "EU (English v1)"
    ],
    "nonGoals": [
      "Native iOS/Android apps",
      "Offline-first / local-only sync",
      "Built-in chat or video",
      "Full Gantt or resource management",
      "Self-hosted / on-prem edition"
    ]
  },
  "businessModel": {
    "billingModel": "Freemium: 1 workspace, max 2 users (no charge). Pro: Stripe subscription billed per active user per workspace per month; unlimited workspaces. Customer Portal for upgrade/cancel; optional 14-day Pro trial.",
    "slaAndSupport": "Target 99.5% monthly API availability for paid tiers; status page TBD. Support: in-app email link + docs; no phone SLA in MVP."
  },
  "systemConstraints": {
    "compliance": [
      "GDPR-style export/delete on request (EU users)",
      "No HIPAA/PCI in todo content — card data only via Stripe hosted surfaces",
      "SOC 2 not required for MVP; document roadmap if selling enterprise"
    ],
    "complianceEnforcement": {
      "requiresDataDeletionAPI": true,
      "requiresDataExport": true,
      "requiresAuditTrail": true
    },
    "identity": {
      "current": "email-password",
      "required": [
        "email-verification"
      ]
    },
    "identityRoadmap": {
      "mfa": "future",
      "magicLink": "future",
      "sso": "enterprise-only"
    },
    "tenancy": {
      "tenantModel": {
        "type": "workspace-based",
        "isolation": "row-level"
      },
      "membershipModel": {
        "userToWorkspace": "many-to-many"
      },
      "billingUnit": "per-user-per-workspace",
      "notes": "Guest role is workspace-bound read-only. Row-level isolation by workspace_id. Free tier hard limit 1 workspace and 2 users; Pro removes workspace cap."
    },
    "dataClassification": "Todo text is user-provided content (personal/business sensitive); treat as customer data under DPA. Store encrypted at rest per cloud provider; application-level secrets in env/Key Vault. Retention: soft-delete + purge window configurable per workspace admin (default 30 days).",
    "mvpScope": {
      "auth": "email-password",
      "projectLimit": 1,
      "userLimit": 2,
      "billing": "stripe-per-user-per-workspace",
      "roles": [
        "admin",
        "member",
        "guest"
      ],
      "features": [
        "todos",
        "lists",
        "workspace-invites",
        "billing",
        "csv-export",
        "audit-log-membership"
      ]
    }
  },
  "integrationPlan": {
    "integrations": {
      "payments": "stripe",
      "communication": "email",
      "exports": [
        "csv"
      ],
      "sync": [
        "calendar"
      ],
      "notes": "Stripe Customer Portal + webhooks; transactional email (invites, receipts)."
    }
  }
}
```

---

## Starting outline (placeholders already substituted where possible)

Expand every section into implementation-ready prose. Remove instructional lines that duplicate this header block.

---
vertical: "todo"
display_name: "Todo app"
generated_from_config: true
---

# Todo app vertical — full SaaS specification

> **Positioning:** Self-serve productivity SaaS for small teams who outgrow personal task apps but do not need full project-management suites.
> **One-line value prop:** Team todo lists with roles, billing, and exports — a deliberately small vertical to prove the SaaS Factory pipeline end-to-end.

## 1. Executive summary

- **Vertical:** todo — deployable app folder `apps/todo-instance`
- **Shared engine:** `apps/core-saas` + `packages/ui`, `packages/db`, `packages/auth`, `packages/billing`
- **Primary geography / markets:** US, EU (English v1)
- **Compliance drivers:** GDPR-style export/delete on request (EU users), No HIPAA/PCI in todo content — card data only via Stripe hosted surfaces, SOC 2 not required for MVP; document roadmap if selling enterprise

### Config-derived product boundaries

| Area | Detail |
|------|--------|
| Tenancy model | {
  "tenantModel": {
    "type": "workspace-based",
    "isolation": "row-level"
  },
  "membershipModel": {
    "userToWorkspace": "many-to-many"
  },
  "billingUnit": "per-user-per-workspace",
  "notes": "Guest role is workspace-bound read-only. Row-level isolation by workspace_id. Free tier hard limit 1 workspace and 2 users; Pro removes workspace cap."
} |
| Identity & access | {
  "identity": {
    "current": "email-password",
    "required": [
      "email-verification"
    ]
  },
  "identityRoadmap": {
    "mfa": "future",
    "magicLink": "future",
    "sso": "enterprise-only"
  }
} |
| Data classification | Todo text is user-provided content (personal/business sensitive); treat as customer data under DPA. Store encrypted at rest per cloud provider; application-level secrets in env/Key Vault. Retention: soft-delete + purge window configurable per workspace admin (default 30 days). |
| SLA & support posture | Target 99.5% monthly API availability for paid tiers; status page TBD. Support: in-app email link + docs; no phone SLA in MVP. |
| Non-goals (seed list) | Native iOS/Android apps, Offline-first / local-only sync, Built-in chat or video, Full Gantt or resource management, Self-hosted / on-prem edition |

Treat this table as authoritative hints from `configs/apps/<vertical>/<vertical>.json`; expand into §6–§11 below.

Describe in 2 short paragraphs: who buys, why now, and what "done" looks like for MVP.

## 2. Business context & ICP

| Field | Detail |
|-------|--------|
| Ideal customer profile | Expand from config + industry norms |
| Buyer vs user | Who signs vs who logs in daily |
| Sales motion | Self-serve / inside sales / field — pick one with rationale |
| Alternatives | What they use today (spreadsheets, generic tools, competitors) |

## 3. User personas & jobs-to-be-done

**Primary: Team lead / small-business owner**

- Goals:
- Pain points:
- Top 5 jobs-to-be-done (JTBD):

**Secondary users:** Project admin, Member, Guest (read-only lists)

- For each role: goals, permissions sketch, key screens.

## 4. Product scope

### 4.1 MVP (ship first)

{
  "auth": "email-password",
  "projectLimit": 1,
  "userLimit": 2,
  "billing": "stripe-per-user-per-workspace",
  "roles": [
    "admin",
    "member",
    "guest"
  ],
  "features": [
    "todos",
    "lists",
    "workspace-invites",
    "billing",
    "csv-export",
    "audit-log-membership"
  ]
}

List **must-have** capabilities as numbered requirements with acceptance notes.

### 4.2 Phase 2+

Explicitly deferred features (calendar depth, mobile native, advanced analytics, etc.).

## 5. Core user workflows

For each workflow: **trigger → steps → success outcome → failure / edge cases**.

1. Onboarding & tenant setup
2. Core domain workflow #1 (vertical-specific)
3. Core domain workflow #2
4. Billing & plan changes
5. User/role admin
6. Support / audit view (if applicable)

## 6. Functional requirements (by module)

### 6.1 Authentication & organizations

- Identity providers, session model, org membership, invites, MFA policy.

### 6.2 Core domain (Todo app)

- Entities, states, invariants, notifications.

### 6.3 Billing & entitlements (Stripe)

- **Config hint:** Freemium: 1 workspace, max 2 users (no charge). Pro: Stripe subscription billed per active user per workspace per month; unlimited workspaces. Customer Portal for upgrade/cancel; optional 14-day Pro trial.
- Plans, trials, usage vs seat, webhooks, dunning, invoices — tie to `packages/billing`.

### 6.4 Admin & configuration

- Feature flags per tenant, branding, integrations.

### 6.5 Reporting & exports

- CSV/PDF, schedules, PII handling.

## 7. Data model (conceptual)

List entities with: **name**, **purpose**, **key fields**, **relations**. Target ≥5 entities.

## 8. Non-functional requirements

- Security (encryption, secrets, OWASP-minded controls)
- Performance & scale assumptions
- Availability & RTO/RPO (plain language)
- Observability (logs, metrics, traces)
- Internationalization (if US, EU (English v1) implies multi-locale)

## 9. Integrations

**Wishlist from config:** payments: stripe, communication: email, exports: csv, sync: calendar

For each: read/write, auth method, failure behavior, MVP vs later.

## 10. Compliance & risk

Regulatory context: GDPR-style export/delete on request (EU users), No HIPAA/PCI in todo content — card data only via Stripe hosted surfaces, SOC 2 not required for MVP; document roadmap if selling enterprise

Product-level controls (not legal advice): data retention, BAA/vendor notes as placeholders, audit trail needs.

## 11. Explicitly out of scope

**Seed list from config:** Native iOS/Android apps, Offline-first / local-only sync, Built-in chat or video, Full Gantt or resource management, Self-hosted / on-prem edition

Minimum 3 concrete bullets (expand the seed list if it is short).

## 12. Open questions

Decisions that need the human product owner.

## 13. Traceability

- Vertical id: `todo` — PM agent should decompose this spec into `factory/task-queue.json` tasks with stable ids.
