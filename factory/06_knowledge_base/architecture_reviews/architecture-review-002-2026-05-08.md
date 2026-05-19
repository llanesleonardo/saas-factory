# Architecture review — todo-instance + factory (002) — 2026-05-08

## Context

This review **supersedes the open concerns** from **`architecture-review-001-2026-05-08.md`** where the codebase has since evolved, and it aligns with the **master work log** (`factory/06_knowledge_base/master_reviews/master-worklog-001-2026-05-08.md`).

**Current facts:**

- **`apps/todo-instance`** remains **standalone / local-only** (no API, auth, or multi-tenant). Integration mode per **`factory/06_knowledge_base/architecture/ARCHITECTURE.md`**: **standalone** for this vertical.
- **Repo layout:** **`apps/core-saas`** + **`apps/todo-instance`** only (extra sample verticals removed from workspaces).
- **Phases 2–6 are delivered:** persistence UX (filters, bulk actions), refactor + polish (empty state, inline edit, undo), **Phase 5** forward-schema guardrail + **`phase`** convention validation in **`factory/task-queue.json`**, **Phase 6** export/import + deterministic **`createdAt`** ordering + tests.
- **Factory process** is documented in the work log (Mermaid diagram §6.1): Spec → PM → task queue → Dev → Quality gates → Git/PR → **main** → queue closure + QMS evidence.
- **Delivery discipline:** **`agents/git-agent.md`** and **`agents/pm-agent.md`** now state the default **branch-per-loop** rule (feature branch before implementation, PR to **`main`**, exceptions explicit).

This memo sets **boundaries for Phase 7** without assuming an HTTP/backend split unless the spec is updated.

## What’s good (keep)

- **Stable layering:** **`todos.model.ts`** (pure rules), **`todos.storage.ts`** (adapter), **`todos.portable.ts`** (export/import shape), **`components/*`**, **`App.tsx`** — matches the split recommended in review **001** and scales better than a single god file.
- **Explicit persistence contract:** versioned payload **`{ schemaVersion, todos }`**, legacy migration, corrupt/missing tolerance, and **forward-version guardrail** (`schemaVersion > current` does not trash data by accidental empty save).
- **Portable interchange:** Phase 6 treats todos as a **serializable boundary** — good rehearsal for future sync/API work **if** you add an ADR and spec phase later.
- **Verification:** Vitest + RTL coverage on storage, portable IO, and user-visible flows; **`npm run check`** + **`validate-task-queue`** tie factory metadata to CI-minded discipline.
- **Traceability:** Task ids, QMS inbox, and PR-oriented closure (**QMS-PUB-005**) match how agents should ship work.

## Risks / gaps (address before or during Phase 7)

### 1) Phase 7 scope is undefined at the architecture level

The product can stay **local-only** for a long time. Risk is **accidental scope creep** (API, auth) without a written spec phase and **integration mode** decision.

**Mitigation:** PM + Spec Generator add a **Phase 7** section with explicit **goals / non-goals** and integration posture (**standalone** vs future **HTTP-integrated**). No backend code until that exists.

### 2) Import/export is a trust boundary (still low for local-only)

Today import is **user-supplied JSON**. For a browser-only demo this is acceptable; if you ever allow **URL fetch** or **shared links**, treat input as **untrusted** and add validation + size limits + Security review.

### 3) Duplication across future verticals

Patterns in **`todo-instance`** (storage adapter, portable module) are **not yet** lifted to **`packages/*`**. That is fine for a learning vertical; if a second local-first app appears, prefer **shared helpers in a package** over copy-paste (**ARCHITECTURE.md** alignment).

### 4) Monorepo CI surface

With only **two** apps, CI should stay **fast and explicit** which workspaces run **`lint` / `build` / `test`**. Avoid matrix sprawl; add jobs when a new **`apps/*`** gains real scripts.

### 5) List scale (optional NFR)

Deterministic **newest-first** ordering is clear; very large lists may need **virtualization** — only if Phase 7 NFRs demand it.

## Recommendations to PM (next work)

### Option A — Phase 7 **local-only** (default until spec says otherwise)

Examples of thin, verifiable slices (pick what matches product intent):

- **UX:** drag-and-drop reorder (if spec defines ordering rules vs `createdAt`).
- **NFR:** virtualization or cap warnings for large lists.
- **Trust:** stronger import validation messages (still no server).
- **A11y / i18n:** if you declare them as phase goals, tie **acceptance criteria** to measurable checks.

Use **`phase: "7"`** as numeric string and new task ids **`TODO_033+`**. Hand off with **branch-first** (`feature/todo-phase7` or `feature/TODO_033_…`).

### Option B — **HTTP-integrated** or second deployable (only with an explicit decision)

Not automatic after Phase 6. Requires:

- Spec sections for **API contract**, **auth or intentional absence**, errors, and **test strategy** (contract tests, MSW, or integration).
- **Architect** + **Security** pass on boundaries; align **`factory/06_knowledge_base/architecture/ARCHITECTURE.md`** integration mode for that vertical.

Keep **`todo-instance`** local-only unless you consciously merge scopes (prefer a **separate app** + ADR if you want to practice HTTP boundaries without muddying the teaching vertical).

## Recommendations to Dev (implementation hygiene)

- **Branch before coding** per **`agents/git-agent.md`** for each new loop; PR to **`main`** after Quality green.
- Preserve **pure** **`todos.model.ts`** / **`todos.portable.ts`** boundaries when adding Phase 7 behavior.
- Do not weaken **storage** invariants (forward version, corrupt input, migration paths).
- If adding reorder or schema tweaks, extend **`schemaVersion`** / migration policy in **one** place and **update the spec** in lockstep.

## Relation to review 001

| Review 001 theme                         | Status in 002                         |
|-----------------------------------------|---------------------------------------|
| Split god **`App.tsx`**                 | **Done** — components + model helpers |
| Forward schema / `schemaVersion` guard | **Done** — Phase 5                    |
| Numeric **`phase`** in task queue       | **Done** — tooling validation        |
| Optional HTTP / second app path         | **Unchanged** — only if spec + ADR    |

## Handoff

- **PM / Spec Generator:** Draft **Phase 7** in **`specs/todo-spec.md`** (scope + non-goals); emit **`TODO_033+`** tasks.
- **Dev / Git:** **`feature/…`** branch first, then implement; **Quality** then **PR**.
- **Architect (future):** Revisit when integration mode changes or a second vertical copies these patterns — consider **`packages/*`** extraction ADR.
