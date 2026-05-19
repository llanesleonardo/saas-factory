# Validation scripts (`06-gates/validation/`)

Factory `validate-*` TypeScript entrypoints used by **`npm run mfg -- validate factory`** and **`validate apps`**.

- These scripts are CLI-style entrypoints and may be imported by **`../gates/`** (e.g. `validateVerticalConfigObject` from `app-blueprint-config.ts`).
- Golden / negative files live in **`../fixtures/`**.

See **`../README.md`** for the full gates + validation station layout.
