# Docker-first development

Use these images so **Node, Go, .NET, Python** SDKs live in Docker only. Your repo is bind-mounted at **`/workspace`**.

## Blueprint → Compose (`configs/app.blueprint.json`)

1. **`npm run app:configure`** (runs in the **`node`** container by default) writes or updates the blueprint.
2. **`npm run app:scaffold`** regenerates app folders **and** overwrites **`docker/compose.generated.yaml`**. It also inserts **`REDIS_URL`** / **`DATABASE_URL`** under **`node.environment`** in **`docker/compose.yaml`** when your blueprint uses Docker Compose **and** Redis / Postgres.
3. Infra services use Compose **`profiles: [infra]`** — start with:

```bash
docker compose -f docker/compose.yaml --profile infra up -d
```

If **`tooling.containers`** is **`none`**, the generator emits **`services: {}`** only (no Redis/Postgres services).

On the **host**, **`npm run app:configure`** / **`app:scaffold`** invoke Docker via **`factory/host-or-docker.ts`**. Already **inside** a Dev Container (or `docker compose exec`), the same scripts run **`tsx`** locally. Without Docker installed, use **`app:configure:local`** / **`app:scaffold:local`**.

## Prerequisites

- [Docker Desktop](https://docs.docker.com/desktop/) (or Docker Engine + Compose v2) on Windows, macOS, or Linux.

## Node — factory CLI and scaffolded apps

Build once (image layers are cached):

```bash
docker compose -f docker/compose.yaml build node
```

Run a one-off command (ephemeral container):

```bash
docker compose -f docker/compose.yaml run --rm node npm run check
docker compose -f docker/compose.yaml run --rm node npx tsx factory/app-scaffold.ts --skip-install
docker compose -f docker/compose.yaml run --rm node npm install
```

**Interactive shell** (same mounts as above):

```bash
docker compose -f docker/compose.yaml run --rm node bash
```

**Dev servers** with ports published to your machine (`--service-ports`):

```bash
docker compose -f docker/compose.yaml run --rm --service-ports node bash
# then inside:
# npm install
# On the host (second terminal), start Redis when needed:
# docker compose -f docker/compose.yaml --profile infra up -d
# npm run dev -w todoapp-api
# npm run dev -w todoapp-instance
```

Or keep a long-lived container:

```bash
docker compose -f docker/compose.yaml up -d node
docker compose -f docker/compose.yaml exec node bash
```

### Native modules and `node_modules`

If you previously ran `npm install` on Windows, Linux binaries inside the container may not match. Prefer **`rm -rf node_modules apps/*/node_modules`** on the host once, then run **`npm install` only inside the Node container** so deps are built for Linux.

## Redis / Postgres (blueprint infra)

After **`npm run app:scaffold`**, infra matches the blueprint (e.g. Redis on **6379**). Start or stop:

```bash
docker compose -f docker/compose.yaml --profile infra up -d
docker compose -f docker/compose.yaml --profile infra down
```

## Go, .NET, Python — language toolchains only

Images download **when you first use** the `toolchains` profile:

```bash
docker compose -f docker/compose.yaml --profile toolchains run --rm go go version
docker compose -f docker/compose.yaml --profile toolchains run --rm go bash

docker compose -f docker/compose.yaml --profile toolchains run --rm dotnet dotnet --info
docker compose -f docker/compose.yaml --profile toolchains run --rm dotnet bash

docker compose -f docker/compose.yaml --profile toolchains run --rm python python -V
docker compose -f docker/compose.yaml --profile toolchains run --rm python bash
```

Use these for future scaffolds (Go API, C# API, Python workers) without installing SDKs on the host. Add new services to **`compose.yaml`** the same way when you adopt another stack.

## Cursor / VS Code Dev Container

See **`.devcontainer/devcontainer.json`** — reopen the repo in the Node container for editing with ports **4000**, **5173** forwarded.
