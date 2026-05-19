# Workforce — catalog (`factory/02_workforce/`)

This directory is the **catalog** for factory **agents**, **tools**, and **workstations**: definitions, assignments, maps, and glue code that describe *who* does work, *with what*, and *where* on the line. Supporting material (**capacity**, skill matrix, load balancing) sits beside that catalog so planning can confirm staffing before work hits **`01_production_planning/`** and **`03_assembly_lines/`**.

| Catalog facet | Primary locations here |
|---------------|-------------------------|
| **Agents** | `02_00_agents/agent_definitions/*-agent.md` (role markdown), `agent-registry.json`, `context-packs/*.json`; optional `agent-definitions/*.ts` stubs |
| **Tools** | `02_01_tools/` (`tool-registry.json`, `tool-definitions/`, `tool-assignment.ts`) |
| **Workstations** | `02_02_workstations/` (`workstation-map.json`, `workstation-assignment.ts`, `workstation_definitions/*-workstation.md`) — Agile iteration + systems-engineering verification (see map `model` + `stations.*`) |

**Canonical machine-readable registries (repo source of truth):**

- Agents + routing: `factory/02_workforce/02_00_agents/agent-registry.json` (keep in sync with `factory/03_assembly_lines/03-registry/registry/agent-registry.json`)
- Tools (assembly-line roster): `factory/03_assembly_lines/03-registry/registry/tool-registry.json`
- Task queue, phase queue, workflow machine, verified apps: `factory/03_assembly_lines/03-registry/registry/`

Workforce-local **`02_01_tools/tool-registry.json`** is a compact workstation-oriented roster; validation and full tool ids use the **`03-registry/registry/tool-registry.json`** file above.

This folder holds a **workforce-oriented view**: assignments, workstation maps, and stubs that can grow into orchestration without replacing the kernel registries above.

## The lean analogy (made precise)

| Lean concept | Your `workforce/` equivalent |
|--------------|------------------------------|
| Worker at a station | Agent assigned to a workstation (`02_00_agents/agent-assignment.ts`, `02_02_workstations/workstation-map.json`) |
| Worker skill card | `capacity/skill-matrix.json` |
| Tool crib | `tools/tool-definitions/` |
| Shift capacity | `capacity/availability.json` |
| Line balancing | `capacity/load-balancer.ts` |
| Standard work | `agents/agent-definitions/` — each agent has a defined, repeatable role |

## Why this must come before the assembly line

The assembly line assumes workers are at stations when it starts. If the **increment_build** workstation has no dev-equivalent agent assigned, or `tool-linter` is unavailable, the line stalls mid-production — the worst place to discover a resource gap. The **workforce/** layer ensures:

- **Capacity is confirmed** before `factory/01_production_planning/` releases an order to the floor (work orders under **`01_00_work_orders/`**).
- **Right agent, right station** — no generalist agent doing specialist work.
- **Tools are versioned and ready** — no runtime dependency surprises on the tools path (`tools/tool-registry.json` + definitions).
- **Load is balanced** — no single agent overloaded while others idle (`load-balancer.ts`).

## The complete factory flow

```text
factory/00_product_definitions/       ← WHAT to build (product IR)
            ↓
factory/01_production_planning/         ← WHEN + HOW (plans, work orders, scheduling)
            ↓
factory/02_workforce/                   ← WHO builds it + are they ready?
            ↓
factory/03_assembly_lines/              ← BUILD
            ↓
[deployed SaaS product]                 ← CUSTOMER
```

This is a **VSM-native software factory**: each zone has a lean counterpart, and nothing should hit the floor without a complete plan and a staffed line.

## Agile delivery and systems engineering

Software-development workstations are modeled as an **Agile iteration**: backlog_plan → increment_build → integrate_verify → release_transition. That mirrors a concise **systems-engineering thread**: scope/requirements alignment → implementation → **verification** (built-right evidence, CI/tests, IV&V procedures in `factory/02_workforce/02_00_agents/agent-registry.json` → `references.qms_ivv_procedures`) → transition to deployment and operations. **Validation** (the right product) stays cross-cutting via product definition and QMS material, not a single station name.
