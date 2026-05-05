# todoapp-api

Generated from `configs/app.blueprint.json` (nodejs-express, sqlite-file).

## Dev

```bash
cp .env.example .env
npm install
npm run dev
```

Todos API: `GET/POST /api/todos`, `PATCH/DELETE /api/todos/:id`, `GET /api/health`.

Frontend dev server proxies `/api` → see `apps/todoapp-instance/vite.config.ts`.
