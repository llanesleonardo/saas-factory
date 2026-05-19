# Agent action record

## Document metadata
- **Date (UTC):** 2026-05-09
- **Agent role:** tooling
- **Task id / issue:** FACTORY_OS_002_tool_registry_json_and_validator
- **Spec / PR refs:** `factory/06_knowledge_base/factory_specs/factory-os-tool-registry-spec.md`, `factory/tool-registry.json`, `factory/validate-tool-registry.ts`, `.github/workflows/factory-parallel-ci.yml`
- **Depends on (optional):** FACTORY_OS_001_tool_registry_spec
- **Related inbox records (optional):** `factory/06_knowledge_base/qms_docs/inbox/2026-05-09-spec-generator-FACTORY_OS_001_tool_registry_spec.md`

## Actions performed
- Added the initial Tool Registry file (`factory/tool-registry.json`) with stable tool ids and canonical invocations.
- Added a JSON Schema (`factory/factory_schemas/tool-registry.schema.json`) for the registry shape.
- Implemented `npm run validate-tool-registry` to validate:
  - unique `tool_id` format
  - `owner_role` matches a role id in `factory/agent-registry.json`
  - referenced npm scripts exist in root `package.json`
  - referenced workflow/doc paths exist where applicable
- Wired the validator into Factory CI (`factory-parallel-ci.yml`) on pull requests.

## Evidence
- Commands run (local):
  - `npm run validate-tool-registry`
  - `npm run check`
- CI gate: `.github/workflows/factory-parallel-ci.yml` includes `npm run validate-tool-registry`

## Handoff
- Quality: ensure CI artifacts/evidence remain stable; consider adding fixtures for tool-registry validator if we see churn.

