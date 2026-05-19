# Kaizen item — <short title>

**Date (UTC):** YYYY-MM-DD  
**Owner:** <name or role>  
**Status:** proposed | experiment | done | dropped  

## Problem / waste

- **Symptom:** <what people see — failed command, slow step, confusion>
- **Waste type (TIMWOOD):** <T|I|M|W|O|O|D|Skills — see `factory/06_knowledge_base/process/LEAN-MANUFACTURING.md` §7>

## Signal (evidence)

- **Command or path:** e.g. `npm run mfg -- validate factory` → stderr excerpt; or `factory/telemetry/assembly-line/assembly-line-YYYY-MM-DD.jsonl` line
- **Snippet / pointer:** <paste or “see line correlation_id=…”>

## Hypothesis

If we **<change>**, then **<measurable outcome>** within **<timebox>**.

## Experiment (one change)

- **Repo change:** <files / PR link when opened>
- **Out of scope (explicit):** <what we are not doing in this cycle>

## Verification

- [ ] `npm run check`
- [ ] `npm run mfg -- validate factory` (if factory metadata touched)
- [ ] <app CI or manual smoke if product code touched>

## Follow-up

- **Task id (if promoted to board):** <TODO_… or n/a>
- **QMS / docs link:** <inbox filename or published doc id>
