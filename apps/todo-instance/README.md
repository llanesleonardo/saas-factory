# todo-instance

Vite + React + TypeScript vertical scaffold.

This folder currently ships a local-only Todo app (see `specs/todo-spec.md` for the canonical spec), and will evolve into a “true SaaS” across later phases.

## Dev

```bash
npm install
npm run dev -w apps/todo-instance
```

This starts a single local server that serves both the SPA and a minimal `/api/*` surface (Phase 9 baseline).

## Build

```bash
npm run build -w apps/todo-instance
```

## API (Phase 9 baseline)

The Phase 9 server baseline provides:

- `GET /api/health`
- `POST /api/session/login` (sets an httpOnly cookie)
- `GET /api/session/me` (reads the cookie)
- `POST /api/session/logout`

## SaaS roadmap (Phase 9+)
- Canonical roadmap: `specs/todo-spec.md` (Phases 9–13)
- Phase 9 contract (auth + tenancy): `apps/todo-instance/docs/phase9-auth-tenancy-contract.md`

