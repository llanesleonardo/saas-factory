# Pull Request Decision Gate (Standard Procedure)

## Document control
| Field | Value |
|-------|--------|
| **Document ID** | QMS-PUB-005 |
| **Revision** | 0.1 |
| **Status** | Draft |
| **Owner (role)** | Git (with Quality / Docs) |
| **Source records** | `organizational_memory/QMS/inbox/2026-05-08-docs-pr-importance.md` |
| **Applicable roles** | Dev, Quality, Fix, Git, DevOps, Docs |
| **Review due** | n/a |

## Purpose & scope

This procedure makes a pull request (PR) the factory’s **decision gate artifact**: the unit of work that becomes **reviewable, traceable, and merge-safe**.

**In scope:** expectations for PRs, what must be in the PR description, and when a PR is eligible to merge.

**Out of scope:** changing branch protection / CODEOWNERS policy (DevOps-owned); replacing Quality gates; legal/compliance approvals outside this repo.

## References

- `agents/git-agent.md` — PR creation and merge guardrails
- `agents/quality-agent.md` — gate execution and pass/fail evidence
- `agents/fix-agent.md` — scoped remediation when CI/Quality fails
- `organizational_memory/AGENTS.md` — role router + why PRs matter
- `organizational_memory/QMS/published/QMS-PUB-002-system-verification-plan.md` — system verification expectations (CI + Quality)

## Procedure / work instruction

1. **Start from a task id (preferred)**  
   - PR should reference the task id(s) it implements (or `n/a` with a short rationale if the change is purely operational/docs).

2. **Ensure scope is coherent**  
   - One PR should represent one coherent unit of intent (avoid mixing unrelated features/refactors).

3. **PR description must include** (minimum)
   - **Summary**: 1–3 bullets describing what changed and why.
   - **Test plan**: commands run (and manual checks when applicable).
   - **Trace links**: task id and spec paths (when relevant); link QMS inbox records if they contain operational evidence.
   - **Notes / rollout**: only if special deploy steps, migrations, or risk are present.

4. **Quality gate attachment (required)**  
   A PR is eligible to merge only when:
   - Required CI checks are **green**, and
   - Quality reports **pass** (or an explicit waiver is recorded per org policy).

5. **Review & approval**  
   - PRs should have at least one reviewer when possible. “Approved” for controlled docs means merged via PR (see `DOCUMENT-CONTROL.md` approval note).

6. **Merge & post-merge hygiene**
   - Merge using the repo’s standard method (no bypass of required checks).
   - If deployment is required, hand off to DevOps with PR link and the verified test plan.
   - **Close the loop on PM tasks + QMS evidence (required when tasks exist):**
     - Update `factory/task-queue.json` so completed task ids are marked **`status: "done"`**.
     - Ensure QMS inbox records exist for substantive work (minimum: **Dev** + **Quality**; add **Fix** records if CI/gates required remediation), per `agents/agent-record-for-qms.md`.
     - If `factory/task-queue.json` is empty, record task ids and scope in the PR body (and backfill the queue later).

## Checklist (copy into PR body if helpful)

- [ ] Task id / scope stated
- [ ] Summary bullets
- [ ] Test plan (commands + any manual checks)
- [ ] CI green
- [ ] Quality pass (or documented waiver)
- [ ] Rollout notes (only if needed)
- [ ] Task queue updated (`status: done`) and QMS inbox records present (when tasks exist)

## Lessons learned & best practices

- **Proven:** PRs bind **quality evidence to a specific diff**; “it passed yesterday” is not sufficient.
- **Proven:** Linking task/spec/QMS records reduces context loss for future agents and humans.
- **Experimental:** Automating PR body templates via Tooling (safe if it does not invent results).

## Revision history
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-05-09 | Docs | Initial publish: PR as decision gate standard procedure |

