# Factory OS: Self-Healing Layer (Spec, strictly gated)

## 1) Purpose
Define a **self-healing layer** that can:

- Detect failures (Quality gates, CI, validators)
- Propose **retry plans** and **minimal fix suggestions**
- Optionally generate **draft patches**

…without ever bypassing the factory’s core governance:
- **No unattended merges**
- **Quality re-run required**
- **PR review required**
- **Human-in-the-loop** for any action that could change scope or affect production

This spec is a contract for `FACTORY_OS_010_self_healing_pipeline`.

---

## 2) Non-goals / explicit exclusions
- Automatic merging, auto-approval, or auto-deploy to staging/prod
- Running fixes against production directly
- Silent modification of the canonical task queue or workflow state machine
- “AI free-form refactors” (patches must be bounded and attributable)
- Using secrets or accessing external systems by default (no cloud billing access, no SaaS admin access)

---

## 3) Inputs (failure signals)

The self-healing layer MUST only act on **explicit, captured evidence**, never “guessing” runtime state.

### 3.1 Primary inputs (required)
- **Quality output JSON** (schema-backed) that includes pass/fail + errors + commands_run
- **CI job output** for the failing step(s) (logs as pointers, not embedded)
- **Repository context** (commit SHA, branch, diff base)

### 3.2 Secondary inputs (optional)
- `factory/.local/run-history-YYYY-MM-DD.jsonl` (telemetry run events)
- `factory:next --json` output (task context)
- Validator outputs (task-queue, tool-registry, agent-output, QMS inbox)

### 3.3 Normalization requirement
All inputs must be normalized into a single **FailurePacket** concept (even if stored as JSON later).

Required fields (conceptual):
- `schema_version: 1`
- `timestamp_utc`
- `task_id_primary` (if known)
- `app` (if known)
- `kind`: `quality_gate | ci | validator | deploy_guard`
- `failing_command` (string)
- `errors[]`: normalized error objects with:
  - `code` (short stable identifier when possible)
  - `message` (human readable)
  - `evidence` pointer(s) (file paths / artifact names / URLs)

---

## 4) Allowed actions (strictly bounded)

Self-healing actions are **suggestions** and **draft artifacts**. They do not land changes by themselves.

### 4.1 Allowed action types
- **Retry suggestion**
  - Example: “Re-run `npm run check` after regenerating task queues.”
- **Diagnosis summary**
  - “These 2 errors are the root cause; the rest are downstream noise.”
- **Minimal patch proposal**
  - A bounded change list targeting the failing surface area only
- **Draft patch generation (optional)**
  - A candidate code diff that must go through the standard Dev → Quality → Git flow

### 4.2 Forbidden action types
- Merging a PR
- Pushing directly to protected branches
- Editing audit records to fabricate evidence
- Expanding scope beyond what is needed to pass the failed gate

---

## 5) Outputs (artifacts)

### 5.1 SelfHealingReport (required)
Produced as Markdown and optionally as JSON in future work.

Required sections:
- **Summary** (1–3 bullets)
- **Failure packet reference** (where the evidence is)
- **Proposed fix plan** (ordered steps)
- **Patch scope** (explicit file list and why)
- **Commands to re-run** (must match Quality gate expectations)
- **Risk notes** (what could go wrong)
- **Handoff** (which role runs next)

### 5.2 Patch bundle (optional)
If draft patches are generated, they MUST be accompanied by:
- a file list
- rationale per file
- rollback note (how to revert)

---

## 6) Governance gates (hard requirements)

The self-healing layer MUST conform to these invariants:

### 6.1 No auto-merge invariant
- The system MUST NOT merge changes on its own.

### 6.2 Quality rerun invariant
- Any proposed patch MUST be re-verified by **Quality** with reproducible commands.

### 6.3 PR review invariant
- Any patch MUST go through a PR review step (human review), even if trivial.

### 6.4 Evidence invariant
- All actions MUST reference evidence pointers; no “trust me” outcomes.
- If evidence is missing, the system MUST output a **blocking request** (what evidence is needed).

---

## 7) Determinism rules (reduce thrash)

### 7.1 Bounded attempt budget
For a given failure packet:
- The system MUST limit itself to \(N\) patch attempts (default **2**) before escalating.
- Escalation means: “handoff to human / specialist role with evidence.”

### 7.2 Minimal-change rule
- Patch proposals MUST prefer the smallest change that resolves the failing gate.
- Refactors are only allowed if the failure is caused by structural debt and the refactor is explicitly bounded.

### 7.3 Stable reproduction
- The system MUST produce a deterministic reproduction recipe:
  - exact command(s)
  - file(s) involved
  - expected before/after outcomes

---

## 8) Interaction with factory roles (handoff contract)

Recommended handoff targets:
- **Fix**: when failure is a known narrow defect and a minimal patch is possible
- **Tooling**: when the failure is in schemas/validators/CLI contracts
- **DevOps**: when failure is in deploy gating or environment constraints
- **Security**: when failure touches secrets handling, auth, or data boundary issues

The self-healing layer MUST NOT impersonate these roles; it produces a report and suggested next invocation.

---

## 9) Security and privacy
- Never embed secrets in reports.
- Never fetch private URLs as part of the default workflow.
- Evidence is pointer-only; store references to artifacts and files, not full logs.
- If a patch touches auth/billing/PII boundaries, the report MUST request **Security review**.

---

## 10) MVP vs Phase 2 (self-healing maturity)

### MVP (acceptable first implementation for OS_010)
- Input: Quality fail JSON + local reproduction logs
- Output: SelfHealingReport + optional patch proposal text
- No automation beyond generating the report and optionally a patch file set

### Phase 2
- Automatic FailurePacket capture from CI artifacts
- “Fix suggestion library” for common failures (lint, types, schema drift, missing files)
- Optional “patch drafting” that opens a PR draft (still no merge)

---

## 11) Acceptance criteria mapping (FACTORY_OS_009)
- Failure inputs are defined (Quality output JSON, CI evidence) and normalized (Section 3).
- Allowed actions are explicitly bounded (Section 4) and governance invariants are explicit (Section 6).
- Auto-merge is forbidden; Quality rerun + PR review are required (Section 6).

