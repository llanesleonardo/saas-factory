# todo-instance

Vite + React + TypeScript vertical scaffold.

This folder currently ships a local-only Todo app (see `specs/todo-spec.md` for the canonical spec), and will evolve into a “true SaaS” across later phases.

## Dev

```bash
npm install
npm run dev -w apps/todo-instance
```

This starts **two** local processes:

- **Frontend** (Vite): `http://localhost:5174`
- **Backend** (API): `http://localhost:5175` (frontend proxies `/api/*` to this)

## Build

```bash
npm run build -w apps/todo-instance
```

## API (Phase 9 baseline)

The Phase 9 server baseline provides:

- `GET http://localhost:5175/api/health`
- `POST http://localhost:5175/api/session/login` (sets an httpOnly cookie)
- `GET http://localhost:5175/api/session/me` (reads the cookie)
- `POST http://localhost:5175/api/session/logout`

## SaaS roadmap (Phase 9+)
- Canonical roadmap: `specs/todo-spec.md` (Phases 9–13)
- Phase 9 contract (auth + tenancy): `organizational_memory/apps/todo-instance/phase9-auth-tenancy-contract.md`

