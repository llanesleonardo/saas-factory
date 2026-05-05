<!-- Auto-assembled by factory/generate-spec.ts at 2026-05-04T22:30:29.096Z -->

# Cursor task: generate full vertical spec

Follow **Spec Generator Agent** rules below, then write the completed document to:

`specs/dentist-spec.md`

---

# Spec Generator Agent

Role: **Vertical SaaS specification author** (product + technical, implementation-ready).

## Input

- `configs/<vertical>.json` — vertical id, positioning, users, compliance, billing hints, integrations.
- `templates/vertical-saas-spec.template.md` — section outline (may contain `{{placeholders}}` already substituted by the factory CLI).

## Output

- One **complete** Markdown file: `specs/<vertical>-spec.md` (overwrite or create).
- No code, no task JSON — **spec only**. Use concrete examples, acceptance-style criteria, and explicit **out of scope** where unsure.

## Rules

- Infer reasonable industry details only when clearly implied by the vertical; otherwise list **Open questions** instead of guessing.
- Every major section must have real content (no empty "TBD" sections — use bullets or tables).
- Align naming with repo: `core-saas`, `packages/*`, `apps/<vertical>-instance`.
- Include **MVP** vs **Phase 2** explicitly.
- Call out **compliance** (e.g. HIPAA for healthcare US) when `compliance` in config suggests it; expand obligations at a product level (not legal advice).
- **Tenancy**: assume B2B multi-tenant SaaS unless config says otherwise; state model (org per customer, roles).
- End with **Traceability**: reference `vertical` id for PM / task-queue workflows.

## Self-check before finishing

- [ ] Personas have goals, pain points, and primary workflows each.
- [ ] At least 8 functional requirement bullets across modules (auth, core domain, billing, admin).
- [ ] Data entities named (5+) with 1-line purpose each.
- [ ] Non-functional: security, availability, backups, audit logs (as applicable).
- [ ] **Out of scope** has ≥3 items.

---

## Embedded vertical config (source of truth)

```json
{
  "vertical": "dentist",
  "displayName": "Dental practice",
  "summary": "Operations and patient engagement SaaS for independent dental practices.",
  "positioning": "HIPAA-aware practice hub: scheduling, treatment plans, reminders, and payments on shared core-saas.",
  "primaryUser": "Practice office manager",
  "secondaryUsers": [
    "Dentist",
    "Hygienist",
    "Front-desk staff"
  ],
  "regions": [
    "US"
  ],
  "compliance": [
    "HIPAA",
    "State dental board recordkeeping (verify)"
  ],
  "billingModel": "Per-location subscription + optional per-provider seats; Stripe Customer Portal for upgrades.",
  "integrationsWishlist": [
    "Stripe",
    "Twilio or email provider",
    "Google Calendar / Outlook",
    "Insurance clearinghouse (Phase 2)"
  ],
  "mvpScopeHint": "MVP: org + roles, patient directory (PHI-aware), appointments, basic charting notes, reminders, Stripe for one plan, audit log on PHI access."
}
```

---

## Starting outline (placeholders already substituted where possible)

Expand every section into implementation-ready prose. Remove instructional lines that duplicate this header block.

---
vertical: "dentist"
display_name: "Dental practice"
generated_from_config: true
---

# Dental practice vertical — full SaaS specification

> **Positioning:** HIPAA-aware practice hub: scheduling, treatment plans, reminders, and payments on shared core-saas.
> **One-line value prop:** Operations and patient engagement SaaS for independent dental practices.

## 1. Executive summary

- **Vertical:** dentist — deployable app folder `apps/dentist-instance`
- **Shared engine:** `apps/core-saas` + `packages/ui`, `packages/db`, `packages/auth`, `packages/billing`
- **Primary geography / markets:** US
- **Compliance drivers:** HIPAA, State dental board recordkeeping (verify)

Describe in 2 short paragraphs: who buys, why now, and what "done" looks like for MVP.

## 2. Business context & ICP

| Field | Detail |
|-------|--------|
| Ideal customer profile | Expand from config + industry norms |
| Buyer vs user | Who signs vs who logs in daily |
| Sales motion | Self-serve / inside sales / field — pick one with rationale |
| Alternatives | What they use today (spreadsheets, generic tools, competitors) |

## 3. User personas & jobs-to-be-done

**Primary: Practice office manager**

- Goals:
- Pain points:
- Top 5 jobs-to-be-done (JTBD):

**Secondary users:** Dentist, Hygienist, Front-desk staff

- For each role: goals, permissions sketch, key screens.

## 4. Product scope

### 4.1 MVP (ship first)

MVP: org + roles, patient directory (PHI-aware), appointments, basic charting notes, reminders, Stripe for one plan, audit log on PHI access.

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

### 6.2 Core domain (Dental practice)

- Entities, states, invariants, notifications.

### 6.3 Billing & entitlements (Stripe)

- **Config hint:** Per-location subscription + optional per-provider seats; Stripe Customer Portal for upgrades.
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
- Internationalization (if US implies multi-locale)

## 9. Integrations

**Wishlist from config:** Stripe, Twilio or email provider, Google Calendar / Outlook, Insurance clearinghouse (Phase 2)

For each: read/write, auth method, failure behavior, MVP vs later.

## 10. Compliance & risk

Regulatory context: HIPAA, State dental board recordkeeping (verify)

Product-level controls (not legal advice): data retention, BAA/vendor notes as placeholders, audit trail needs.

## 11. Explicitly out of scope

Minimum 3 bullets.

## 12. Open questions

Decisions that need the human product owner.

## 13. Traceability

- Vertical id: `dentist` — PM agent should decompose this spec into `factory/task-queue.json` tasks with stable ids.
