# Unit & Device Test Plan

## Document control

| Field | Value |
|-------|--------|
| **Document ID** | QMS-PUB-004 |
| **Revision** | 0.1 |
| **Status** | Draft |
| **Owner (role)** | Quality (with Dev) |
| **Source records** | `factory/06_knowledge_base/qms_docs/inbox/2026-05-06-docs-ivv-published-suite.md` |
| **Applicable roles** | Dev, Quality, Fix, Tooling |
| **Review due** | n/a |

## Purpose & scope

This plan maps **lowest-level verification** (unit tests and narrowly scoped component/device checks) to SaaS Factory delivery. It parallels classic **unit / device test plans** in systems engineering: smallest testable pieces before subsystem integration (QMS-PUB-003).

**“Device”** here means deployable or runnable units in software terms — e.g. a server handler, a CLI script, a mocked adapter — not hardware fabrication.

**In scope:** naming conventions for tests, harness ownership, CI invocation, and expectation that failures route through Fix → Quality.

**Out of scope:** full integration/E2E strategy beyond pointers (owned by Quality + DevOps as repo maturity grows).

## References

- `agents/quality-agent.md` — harness, fixtures, `NODE_ENV=test`, pass/fail JSON
- `agents/dev-agent.md` — implementation alongside tests for tasks
- QMS-PUB-003 — escalation path to subsystem verification

## Test layers (informative)

| Layer | Intent | Typical tooling |
|-------|--------|-----------------|
| **Unit** | Functions, pure logic, isolated modules | Framework chosen per package/app |
| **Component / narrow integration** | Single boundary with doubles/mocks | Same + test DB/redis when configured |

## Procedure

1. **Harness first when needed** — For tasks touching persistence or external APIs, Quality + Dev align fixtures (`docker-compose.test.yml`, seeds) before claiming done.
2. **Co-locate tests** — Follow existing repo conventions (`*.test.ts`, `__tests__/`, etc.); Tooling normalizes when drift appears.
3. **Minimum bar** — New non-trivial logic includes tests **or** explicit waiver + issue id logged on PR (waivers are rare).
4. **Run locally and in CI** — Dev runs targeted tests; CI runs project/root scripts defined for the workspace; failures produce **`{ status, errors }`** narrative for Fix per Quality agent.
5. **Traceability** — Prefer naming tests or describe blocks after task id or spec subsection when practical.

## Checklist (Quality / Dev)

| Step | Done |
|------|------|
| Harness documented or unchanged | ☐ |
| New/changed tests cover acceptance of task | ☐ |
| CI job includes affected package/app when matrix exists | ☐ |
| No secrets in tests or fixtures | ☐ |

## Lessons learned & best practices

- **Proven:** Tests owned **with** the task reduce backlog collapse at release.
- Prefer fast unit feedback; reserve heavy integration for subsystem/system plans.

## Revision history

| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-05-06 | Docs | Initial publish — SE V-model parity (unit / device test plan) |
