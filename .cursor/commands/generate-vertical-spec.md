# GENERATE FULL VERTICAL SAAS SPEC

Assemble a **single Cursor prompt file** from `configs/apps/<vertical>/<vertical>.json` + the shared template + Spec Generator rules.

## Steps

0. If **`configs/apps/<verticalId>/<verticalId>.json`** does not exist yet, create it with **`npm run mfg -- app new -- <verticalId>`** (wizard) or **`--defaults`** — see **`configs/README.md`**.

1. In the repo root terminal, run:

   `npm run mfg -- spec generate <verticalId>`

   Example: `npm run mfg -- spec generate todo`

   (`<verticalId>` must match `configs/apps/<verticalId>/<verticalId>.json`.)

2. Open `configs/apps/<verticalId>/specs/_generated/<verticalId>-SPEC-PROMPT.md`.

3. In Cursor chat, @-mention that file and ask the agent to execute it: produce the full spec and write **`configs/apps/<verticalId>/specs/<verticalId>-spec.md`** (overwrite is OK for generated drafts).

4. Optional: feed `configs/apps/<verticalId>/specs/<verticalId>-spec.md` to the PM agent to build `factory/03_assembly_lines/03-registry/registry/task-queue.json`.
