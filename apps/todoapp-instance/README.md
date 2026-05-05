# todoapp-instance

Vite + React + TypeScript shell generated from `app.blueprint.json`.

## Dev

```bash
npm install
npm run dev
```

Ensure `apps/todoapp-api` is running on port 4000 (or set `VITE_API_TARGET`).

## Docker helpers

Infra is generated at repo root: `docker/compose.generated.yaml` (see `docker/compose.yaml`, profile `infra`). Containers blueprint: **docker-compose-dev**.

Blueprint: **standalone** integration — see `organizational_memory/ARCHITECTURE.md`.
