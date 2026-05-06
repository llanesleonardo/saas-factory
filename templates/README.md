# Product / spec templates (Phase 10)

Starter patterns for repeatable SaaS verticals.

## Shipping today

| Template | Path | Use |
|----------|------|-----|
| Vertical SaaS spec skeleton | **`vertical-saas-spec.template.md`** | Consumed by **`npm run generate-spec`** + **`agents/spec-generator-agent.md`** |
| App blueprint (stack + infra intent) | **`npm run app:configure`** → **`configs/app.blueprint.json`** | Drives **`npm run app:scaffold`** |

## Planned catalogue (grow over time)

Add subfolders or manifests as needed:

- SaaS Starter · AI SaaS · Internal Tool · CRM · Marketplace · Multi-tenant Dashboard · API Platform

Each future template should declare: architecture default, auth/billing posture, CI/testing/deploy hooks — coordinated with **`agents/tooling-agent.md`** and **`organizational_memory/ARCHITECTURE.md`**.
