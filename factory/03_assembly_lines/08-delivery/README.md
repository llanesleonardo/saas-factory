# Station: Delivery (where the app runs — preview → staging → prod)

**Purpose:** Decide **where** the built app is exercised: quick **visual** feedback, deeper **staging** validation, or **production** when the system is ready. Many teams **stop at staging** until sign-off; prod is optional until then.

## Canonical code

| File | Role |
|------|------|
| **`deploy.ts`** | Guarded deploy orchestrator: gates, telemetry, stub execute hook — run via **`mfg deploy …`** or **`mfg line deploy …`**. |

## Commands (`mfg`)

| Tier | Command | Intent |
|------|---------|--------|
| **Preview** (visual / smoke) | `npm run mfg -- deploy preview [-- …]` | Fast UI and happy-path checks — local `apps/*` dev servers, Vite preview, ephemeral PR env, or a **dev** cloud slot (extend in this folder or CI). |
| **Staging** (thorough) | `npm run mfg -- deploy staging [-- …]` | Integration, migrations, UAT, perf-ish checks — shared **staging** environment. **Clean `main` + clean working tree** required. |
| **Production** | `npm run mfg -- deploy prod [-- …]` | Live traffic when functionality and acceptance are in place. Same **main + clean tree** rules as staging. |

**Equivalent (legacy):** `npm run mfg -- line deploy -- --env preview|staging|prod […]`

**Flags (all tiers):** `--target <app-path>`, `--dry-run`, `--force --force-reason "<min 10 chars>"`. See **`npm run mfg -- deploy preview --help`** (runs `08-delivery/deploy.ts`).

**Implementation status:** **`deploy.ts`** runs **gates** then records telemetry via **`factory/factory_internal_ops/telemetry.ts`**; **actual cloud deploy** is still a stub — extend here or via **`.github/workflows/azure-deploy-core-saas.yml`**, `azd`, Terraform.

## Related

- **CLI entry:** `factory/factory_cli/mfg.ts` → `deploy` / `line deploy`
- **Release & transition** workstation: `factory/02_workforce/02_02_workstations/workstation_definitions/release-transition-workstation.md`
- **Gates delivery checklist:** `npm run mfg -- gates review <orderId> <productId>`
