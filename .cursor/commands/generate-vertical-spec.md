# GENERATE FULL VERTICAL SAAS SPEC

Assemble a **single Cursor prompt file** from `configs/<vertical>.json` + the shared template + Spec Generator rules.

## Steps

1. In the repo root terminal, run:

   `npm run generate-spec -- <verticalId>`

   Example: `npm run generate-spec -- dentist`

   (`<verticalId>` must match `configs/<verticalId>.json`.)

2. Open `specs/_generated/<verticalId>-SPEC-PROMPT.md`.

3. In Cursor chat, @-mention that file and ask the agent to execute it: produce the full spec and write **`specs/<verticalId>-spec.md`** (overwrite is OK for generated drafts).

4. Optional: feed `specs/<verticalId>-spec.md` to the PM agent to build `factory/task-queue.json`.
