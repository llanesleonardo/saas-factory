# Sales and the assembly line — simple guide

## The idea in one sentence

Sales turns a customer need into a **signed work order**; the factory turns that order into **phases → tasks → an agent-driven sprint loop → a deploy**, with every step traceable through `mfg trace order <orderId>`.

## Diagram — from conversation to running software

```mermaid
flowchart TB
  subgraph sales["1 — Sales"]
    A[Discovery: need / scope / timeline]
    B["mfg app quote (when priced bundle needed)"]
    C["mfg so → sales order"]
    D["mfg wo → work order (allowed to manufacture)"]
  end

  subgraph plan["2 — Intake + planning"]
    E["mfg order validate <orderId>"]
    F["mfg order lifecycle <orderId> set scheduled"]
    G["mfg app bdphase -- <orderId>\n(default 6-phase SaaS template if no source)"]
    H["mfg app build-tasks -- <orderId>\n(loops phases → merges into task-queue.json)"]
  end

  subgraph build["3 — Build (pipeline stops here)"]
    I["mfg app scaffold -- <slug>"]
    J["mfg sprint init <orderId> <slug>"]
    K["mfg sprint board <orderId> <slug>\n(prints the board → next task)"]
  end

  subgraph loop["4 — Manual sprint loop"]
    L["mfg sprint task prompt <taskId>\n→ paste into agent in apps/<slug>/"]
    M["mfg line done <taskId>\n(or --status blocked --reason …)"]
    N["mfg sprint board <orderId> <slug>\n(refreshes workstation rows)"]
  end

  subgraph close["5 — Ship + trace"]
    O["mfg gates review <orderId> <slug> (when ready)"]
    P["mfg deploy preview | staging | prod"]
    Q["mfg trace order <orderId>\n(derived chain: phases → tasks → sprints → prompts → telemetry)"]
  end

  A --> B --> C --> D --> E --> F --> G --> H
  H --> I --> J --> K --> L --> M --> N
  N --> L
  N --> O --> P --> Q
```

## The ordered steps

1. **Discovery.** Capture problem, users, must-haves vs nice-to-haves, timeline, sign-off owner.
2. **Quote** (when needed): `npm run mfg -- app quote -- <slug>`.
3. **Sales order:** `npm run mfg -- so`.
4. **Work order:** `npm run mfg -- wo` → factory is allowed to manufacture.
5. **Intake check:** `npm run mfg -- order validate <orderId>`.
6. **Lifecycle:** `npm run mfg -- order lifecycle <orderId> set scheduled`.
7. **Phases:** `npm run mfg -- app bdphase -- <orderId>` (synthesizes the default 6-phase SaaS plan if no `phase-queue.json` / `PHASES.md` source exists).
8. **Tasks:** `npm run mfg -- app build-tasks -- <orderId>` — loops every phase, writes per-phase `phase-breakdown-*.json`, auto-merges into `task-queue.json`.
9. **Scaffold:** `npm run mfg -- app scaffold -- <slug>` (frontend + API workspaces).
10. **Sprint init:** `npm run mfg -- sprint init <orderId> <slug> --title "…" --goal "…"`. **The automated pipeline ends here.**
11. **Sprint board:** `npm run mfg -- sprint board <orderId> <slug>` — prints tasks grouped by phase, computes the four workstation rows from the queue, and points at the next ready task.
12. **Hand the task to an agent:** `npm run mfg -- sprint task prompt <taskId>` writes `sprint-NNN/prompts/<taskId>.md` and prints it; open the file from a second Cursor window scoped to `apps/<slug>/`.
13. **Mark complete:** `npm run mfg -- line done <taskId>` (or `--status blocked --reason "<why>"`).
14. **Re-run the board** and repeat 12–13 until every task is done.
15. **Delivery review** (when ready): `npm run mfg -- gates review <orderId> <slug>`.
16. **Deploy:** `npm run mfg -- deploy preview` → `staging` → `prod` (`preview` is fast feedback; `staging`/`prod` require clean `main` + clean tree).
17. **Trace the chain:** `npm run mfg -- trace order <orderId>` — reads `factory/08_traceability/orders/<orderId>.json` (phases → tasks → sprints → prompts → telemetry, with source pointers).

### One-shot variants

```bash
npm run pipeline      -- <slug>     # runs steps 2–11, then stops at sprint hand-off
npm run pipeline:plan -- <slug>     # prints the plan, doesn't execute
npm run purge         -- <slug>     # removes every artifact for that slug (incl. trace index)
```

Opt back into the legacy auto-downstream chain with `--with-gates-review`, `--with-deploy`, `--with-kaizen`, `--with-metrics`, `--with-verified`, or `--full-auto`.
