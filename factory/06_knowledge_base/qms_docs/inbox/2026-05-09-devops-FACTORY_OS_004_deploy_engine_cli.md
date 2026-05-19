# Agent action record

## Document metadata
- **Date (UTC):** 2026-05-09
- **Agent role:** devops
- **Task id / issue:** FACTORY_OS_004_deploy_engine_cli
- **Spec / PR refs:** `factory/06_knowledge_base/factory_specs/factory-os-deploy-engine-spec.md`, `factory/03_assembly_lines/08-delivery/deploy.ts`, `package.json`, `factory/tool-registry.json`
- **Depends on (optional):** FACTORY_OS_003_deploy_engine_spec
- **Related inbox records (optional):** `factory/06_knowledge_base/qms_docs/inbox/2026-05-09-spec-generator-FACTORY_OS_003_deploy_engine_spec.md`

## Actions performed
- Implemented a guarded deploy orchestrator CLI (`npm run factory:deploy`) supporting:
  - `--env preview|staging|prod`
  - `--dry-run`
  - optional `--target <path>`
  - gate enforcement by default (runs factory spine checks)
  - explicit bypass with `--force --force-reason ...`
- Enforced safe promotion rules for staging/prod:
  - must be on a clean `main` working tree (refuses otherwise).
- Registered the deploy CLI as a tool-registry entry (`TOOL_FACTORY_DEPLOY`).

## Evidence
- Commands run (local):
  - `npm run factory:deploy -- --env preview --dry-run`
  - `npm run check`
  - `npm run validate-tool-registry`

## Handoff
- Quality: include `npm run factory:deploy -- --env preview --dry-run` in future deploy-engine gates when `FACTORY_OS_004` grows real deploy execution.

