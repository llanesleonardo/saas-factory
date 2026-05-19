# Station: Registry (line roster — immediately after contracts)

**Position:** **`03-registry/`** sits **after `02-contracts/`** so once Product IR / System IR / specs exist under `configs/apps/<app>/`, the factory **registers everyone and everything allowed to run on the assembly line**: which **agents** may act, which **tools** exist, **workflow** transitions, **task** and **phase** queues, and **verified** manufacturing apps.

**Canonical data:** **`registry/`** here — task queue, phase queue, tools, workflow machine, verified apps. Agent roster: **`factory/02_workforce/02_00_agents/agent-registry.json`** (mirror: **`registry/agent-registry.json`**).

**Per-order workforce slices:** **`orders/<orderId>/<productId>/workforce-registry.json`** — for each app on a shop order, a generated snapshot that points at the global registries above and embeds the **workstation roster** (agents + tools per station) from **`factory/02_workforce/02_02_workstations/workstation-map.json`**, plus a pointer to that order’s **`contract.json`**. Created by **`mfg order validate`** / **`mfg order contracts`** (same moment as **`01_00_work_orders/<orderId>/contracts/<productId>/contract.json`**).

| Artifact | Role on the line |
|----------|-------------------|
| `agent-registry.json` | Agent roles & routing |
| `tool-registry.json` | Callable tools / capabilities |
| `workflow-state-machine.json` | Allowed workflow transitions |
| `task-queue.json` | Atomic work inventory |
| `phase-queue.json` | Phase / epic roadmap before tasks |
| `verified-apps.json` | Apps cleared for repeat manufacturing |

This station answers: **who may participate, what tools exist, and what state the line may be in** — immediately before **`06-gates/`** (gates + validation). Stack IR **authoring** uses prompt trees under **`factory/00_product_definitions/app_stack/`** (no separate **`04-blueprint/`** mirror under **`03_assembly_lines/`**).

**Mirror path:** `factory/03_assembly_lines/03-registry/registry/*.json`
