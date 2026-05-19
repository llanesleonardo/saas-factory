# `factory/factory_libs/components/` — composer internals

Pure logic library that turns an app blueprint + a folder of adapter manifests into a list of "what to write to disk". It does **no** I/O itself except for one discovery call against `packages/components/`. All actual file writes happen in the scaffold module (`factory/03_assembly_lines/04-scaffold/modules/components/mod.ts`).

## File map

| File | Role |
|---|---|
| `component-manifest-types.ts` | TypeScript types for `ComponentManifest`, `TemplateFileSpec`, `DepSpec`, `EnvSpec`, `AppliesWhen`. |
| `component-manifest.ts` | Pure validator — `validateComponentManifest(unknown) → { ok, manifest } \| { ok: false, errors }`. |
| `component-registry.ts` | `discoverComponents(repoRoot)` reads every `packages/components/*/manifest.json`. Plus pure helpers (`componentsByCapability`, `findById`, `summarize`). |
| `composer.ts` | `buildComponentPlan(blueprint, components) → ComponentPlan`. Throws `ComposerError` on ambiguous / missing selections. Pure. |
| `template-merge.ts` | The only I/O in this layer: `applyComponentPlan({...})` copies files, merges `package.json` deps, appends `.env.example` blocks idempotently. |
| `__tests__/composer.test.ts` | Unit tests for validator, composer, registry helpers, discovery (tmpdir). |
| `__tests__/manifests.test.ts` | Live check: every shipped adapter's manifest validates; every capability has a sentinel. |

## Run the tests

```bash
npm run test:components
```

17 tests at the time of this writing; runs in ~200 ms with no extra deps (uses `node --import tsx --test`).

## Adding a capability

Edit `ComponentCapability` in `component-manifest-types.ts`, then add adapters under `packages/components/<capability>-<provider>/`. No changes to `composer.ts` are needed unless your capability needs a new selection rule beyond `fields` + `requirements` + `sentinel`.

## Selection algorithm (one paragraph)

For each capability present in the registry, evaluate every candidate's `appliesWhen` against `blueprint[manifest.blueprintKey]`:

1. **Sentinel** matches when the detail is absent OR any `requirements.needsX === false` is set.
2. **Real provider** matches when every entry in `fields` (any-of for arrays) and `requirements` matches the detail.

Exactly one match per capability ⇒ select it. Zero or two+ matches ⇒ `ComposerError`. The scaffold module turns the error into a loud, non-fatal warning and aborts the components module (other modules still apply).
