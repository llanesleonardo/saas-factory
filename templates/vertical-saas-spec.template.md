---
vertical: "{{vertical}}"
display_name: "{{displayName}}"
generated_from_config: true
---

# {{displayName}} vertical — full SaaS specification

> **Positioning:** {{positioning}}
> **One-line value prop:** {{summary}}

## 1. Executive summary

- **Vertical:** {{vertical}} — deployable app folder `apps/{{vertical}}-instance`
- **Shared engine:** `apps/core-saas` + `packages/ui`, `packages/db`, `packages/auth`, `packages/billing`
- **Primary geography / markets:** {{regionsList}}
- **Compliance drivers:** {{complianceList}}

Describe in 2 short paragraphs: who buys, why now, and what "done" looks like for MVP.

## 2. Business context & ICP

| Field | Detail |
|-------|--------|
| Ideal customer profile | Expand from config + industry norms |
| Buyer vs user | Who signs vs who logs in daily |
| Sales motion | Self-serve / inside sales / field — pick one with rationale |
| Alternatives | What they use today (spreadsheets, generic tools, competitors) |

## 3. User personas & jobs-to-be-done

**Primary: {{primaryUser}}**

- Goals:
- Pain points:
- Top 5 jobs-to-be-done (JTBD):

**Secondary users:** {{secondaryUsersList}}

- For each role: goals, permissions sketch, key screens.

## 4. Product scope

### 4.1 MVP (ship first)

{{mvpScopeHint}}

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

### 6.2 Core domain ({{displayName}})

- Entities, states, invariants, notifications.

### 6.3 Billing & entitlements (Stripe)

- **Config hint:** {{billingModel}}
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
- Internationalization (if {{regionsList}} implies multi-locale)

## 9. Integrations

**Wishlist from config:** {{integrationsList}}

For each: read/write, auth method, failure behavior, MVP vs later.

## 10. Compliance & risk

Regulatory context: {{complianceList}}

Product-level controls (not legal advice): data retention, BAA/vendor notes as placeholders, audit trail needs.

## 11. Explicitly out of scope

Minimum 3 bullets.

## 12. Open questions

Decisions that need the human product owner.

## 13. Traceability

- Vertical id: `{{vertical}}` — PM agent should decompose this spec into `factory/task-queue.json` tasks with stable ids.
