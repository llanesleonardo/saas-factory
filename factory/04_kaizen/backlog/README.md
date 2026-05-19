# Kaizen backlog (optional scratch)

Use this folder for **improvements that are not yet** a `task-queue.json` task: rough notes, meeting outcomes, or copies of **`../templates/improvement-item.template.md`**.

## Naming

`YYYY-MM-DD-<slug>.md` — e.g. `2026-05-12-validate-factory-tool-registry-drift.md`

## Promotion

When the item is ready for execution tracking:

1. Add (or update) a task in **`factory/03_assembly_lines/03-registry/registry/task-queue.json`** with a clear **`id`** and **`title`**.
2. Move the markdown into QMS inbox or attach its path in the task **`materials`** / PR description.
3. Delete or archive the scratch file here so the backlog stays honest.

Nothing in this folder is validated by CI unless you later wire a check (on purpose: low ceremony).
