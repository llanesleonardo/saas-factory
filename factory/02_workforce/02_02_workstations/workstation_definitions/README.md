# Workstation definitions

One file per software-development workstation on the factory line. Source fields are mirrored from **`../workstation-map.json`** (`stations.<id>`).

Use with **`../workstation-assignment.ts`** (`describeStation`) and agent/tool assignments under **`../../02_00_agents/agent-assignment.ts`** and **`../../02_01_tools/tool-assignment.ts`**.

| File | Station id (`workstation-map.json`) |
|------|-------------------------------------|
| `backlog-plan-workstation.md` | `backlog_plan` |
| `increment-build-workstation.md` | `increment_build` |
| `integrate-verify-workstation.md` | `integrate_verify` |
| `release-transition-workstation.md` | `release_transition` |
