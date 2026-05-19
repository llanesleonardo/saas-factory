# Backend decision tree (manual stack wizard) — **no DB layer**

This is a **backend-only** decision tree for the SaaS Factory blueprint system.

- It intentionally **excludes** database/object-storage/Redis selections.
- It also avoids frontend concerns (routing in the browser, UI libraries, CSS, etc.).

Legend:
- `◆` decision (single-select)
- `▣` multi-select (checkboxes)
- `→` implies / derives
- `⛔` option not offered (incompatible)
- `(*)` auto-picked (no prompt shown)

---

## Tree (vertical)

◆ **0 · Backend role (purpose / intent layer)**  
`API-only service` | `Full backend (API + jobs)` | `BFF (Backend-for-Frontend)` | `Edge API` | `Internal service`

Why it matters:
- It constrains defaults and later questions (e.g. **WebRTC** doesn’t make sense for many internal services).
- It becomes the “preset anchor” for future auto-generation.

◆ **1 · Runtime (execution environment)**  
`Node.js` | `Bun` | `Deno` | `Python` | `Go` | `Rust`

◆ **2 · Framework (after runtime selection)**  
├─ Node.js → Express | Fastify | NestJS | Hono | tRPC server  
├─ Bun → Elysia | Hono  
├─ Deno → Fresh routes | Oak | Hono  
├─ Python → FastAPI | Flask | Django (API mode)  
├─ Go → Chi | Gin | Fiber  
└─ Rust → Axum | Actix Web | Rocket

Notes:
- This separation prevents “conceptually invalid” combinations (e.g. NestJS + “minimal middleware” mental model).
  You still can choose unusual combos, but the tree can warn or constrain appropriately.

◆ **2.1 · Architecture mode (structure preset anchor)**  
`Simple API server` | `Enterprise layered architecture` | `Event-driven system` | `Microservice-ready structure`

How it guides downstream decisions (defaults / recommendations):
- **Folder structure**
  - Simple API → `routes/`, `middleware/`, `lib/`
  - Enterprise layered → `presentation/`, `application/`, `domain/`, `infrastructure/`
  - Event-driven → `events/`, `handlers/`, `processors/`, `contracts/` (and `outbox/` later when DB exists)
  - Microservice-ready → `services/<name>/…`, shared `contracts/`, shared `platform/`
- **Middleware architecture**
  - Simple API → minimal or standard pipeline
  - Layered → standard pipeline + central error middleware
  - Event-driven → minimal HTTP middleware; event handlers are first-class
  - Microservice-ready → standardized middleware + tracing conventions
- **Testing**
  - Simple API → unit + minimal integration
  - Layered → unit + integration + contract tests recommended
  - Event-driven → handler tests + contract tests around message boundaries
  - Microservice-ready → contract tests become “default-on”
- **Logging / observability**
  - Simple API → logs only can be acceptable
  - Layered → logs + metrics recommended
  - Event-driven / microservice-ready → tracing (OpenTelemetry) strongly recommended

◆ **3 · API architecture style (contract)**  
`REST` | `GraphQL` | `tRPC` | `JSON-RPC-ish` | `Hybrid (REST + realtime)`

Rules:
- `tRPC` → **Node or Bun only** AND **TypeScript-only** (enforce, not just mention)
- `GraphQL` → any runtime (tooling differs)
- `Hybrid` → unlocks realtime questions as “required”

◆ **3.1 · API structure style (how you think about endpoints)**  
`Resource-based (REST)` | `Contract-based (GraphQL)` | `Type-safe RPC (tRPC)` | `Event-driven API` | `Mixed`

Rule of thumb:
- REST → tends to push you toward resource-based structure and versioning.
- GraphQL → requires schema discipline and resolver patterns.
- tRPC → pushes toward shared types/contracts and monorepo-friendly structure.

◆ **3.2 · GraphQL schema layer (only if API style = GraphQL or Mixed)**  
`SDL-first` | `Code-first` | `Federated (future)` | `N/A`

◆ **4 · Server type (topology intent)**  
`Monolith API server` | `Modular monolith` | `Microservices (logical only)` | `Serverless functions` | `Edge functions`

→ Effects (structure intent only):
- **Microservices** → service boundary folders + shared contracts
- **Serverless** → function-per-route / handler-per-endpoint patterns
- **Edge** → runtime constraints (bundling, cold starts, APIs)

◆ **5 · Request handling pattern (internal shape)**  
`Controllers (MVC-ish)` | `Route handlers (flat)` | `Functional pipeline` | `Middleware-heavy` | `Event-driven handlers`

Compatibility guidance:
- NestJS → controllers idiomatic
- Express → controllers or route handlers
- Fastify → plugins + handlers
- Hono → handlers/pipeline-style

◆ **6 · Middleware architecture (explicit)**  
`Minimal` | `Standard pipeline` | `Heavy middleware stack` | `Plugin-based (Fastify)` | `Decorator-based (NestJS)`

Compatibility guidance:
- Fastify → plugin-based is idiomatic
- NestJS → decorator-based is idiomatic

◆ **7 · Validation layer (backend input)**  
`None` | `Zod` | `Joi` | `Yup` | `Valibot` | `class-validator (NestJS)` | `Framework-native (e.g. Pydantic/FastAPI)`

Rules:
- If **frontend uses Zod**, strongly prefer **Zod** here to share schemas (TypeScript reuse).
- `class-validator` → realistically **NestJS/TS class DTO** workflows.

◆ **8 · State lifecycle model (backend-side, still without DB)**  
`Stateless only` | `In-memory state allowed` | `Session-based memory` | `Event-driven state`

Why it matters:
- Constrains auth/session assumptions, caching posture, and realtime/job choices.

◆ **9 · Identity model (who exists in the system)**  
`Anonymous` | `Single-user` | `Multi-user` | `Multi-tenant`

Why it matters:
- Drives auth complexity, rate limiting, and API design expectations.

◆ **10 · Authentication strategy (no persistence dependency yet)**  
`None` | `JWT (custom)` | `OAuth only (external)` | `Session-based (memory)` | `Auth middleware placeholder` | `Auth.js (Node only)`

Notes:
- This is **logic only**; sessions are assumed **in-memory** until a DB/session store is chosen later.
- `Auth.js` is a Node ecosystem fit; treat other runtimes as “placeholder only”.

◆ **11 · Realtime scope (intent)**  
`None` | `Basic notifications only` | `Full bidirectional realtime` | `Streaming only (SSE)` | `Peer-to-peer only (WebRTC)`

◆ **11.1 · Realtime transport (only if scope ≠ None)**  
`WebSockets` | `Socket.IO` | `SSE` | `WebRTC signaling`

Rule:
- If API style was **Hybrid**, picking `None` should be disallowed.

◆ **12 · Job execution model (lifecycle intent)**  
`Synchronous only` | `Fire-and-forget` | `Worker pool` | `Cron-based tasks` | `Persistent queue (future DB)`

◆ **12.1 · Background processing / async mechanism (no DB dependency)**  
`None` | `In-memory queue` | `Worker threads` | `BullMQ (Node; Redis later)` | `Future-ready Redis queue (inactive)`

Rule:
- When “no DB yet”, Redis-backed queues should be labeled **future-ready** (record intent, do not require Redis now).

◆ **13 · API versioning strategy (first-class)**  
`None` | `URL versioning (/v1)` | `Header versioning` | `Schema versioning`

▣ **14 · API communication enhancements**  
`CORS` | `Rate limiting` | `Request logging` | `Request tracing` | `Compression`

▣ **15 · Security posture (backend core)**  
`Headers hardening (Helmet / equivalents)` | `CORS policy` | `Rate limiting` | `Input sanitization` | `API key middleware` | `None (dev-only)`

◆ **16 · Observability (bigger than logging)**  
`None` | `Logs only` | `Logs + metrics` | `Full tracing (OpenTelemetry)`

◆ **17 · Logging strategy**  
`Console only` | `Structured JSON logs` | `Pino` | `Winston` | `External hook (future)`

◆ **18 · Error handling strategy**  
`Simple try/catch` | `Central error middleware` | `Typed error system` | `Result/Either pattern`

◆ **19 · Deployment target (runtime-aware)**  
`Local only` | `VPS (Docker-ready)` | `Containerized (Docker)` | `Serverless functions` | `Edge runtime`

▣ **20 · Test types (backend)**  
`Unit` | `Integration` | `Contract tests` | `E2E API tests` | `Minimal` | `None`

→ Later mapping to runner/tooling:
- Node/Bun → Vitest/Jest
- Python → pytest
- Go → go test
- Rust → cargo test

▣ **21 · Backend DX tooling**  
`dotenv` | `watch mode` | `tsx/ts-node (Node)` | `Biome` | `ESLint (Node)` | `Prettier`

---

## Outputs (what the backend tree should produce)

The backend tree should output **two** layers, similar to the frontend model:

### 1) Coarse key — `backend.stack`

Examples:
- `node-express-ts`
- `node-fastify-ts`
- `node-nest-ts`
- `bun-elysia-ts`
- `deno-oak`
- `python-fastapi`
- `go-chi`
- `rust-axum`

This key is what scaffolders can switch on first.

### 2) Rich capture — `backendDetail`

Example shape (illustrative):

```json
{
  "runtime": "node",
  "framework": "fastify",
  "apiStyle": "rest",
  "apiStructure": "resource-based",
  "graphqlSchemaLayer": "n/a",
  "serverType": "modular-monolith",
  "requestPattern": "route-handlers",
  "middlewareArchitecture": "plugin-based",
  "validation": "zod",
  "stateModel": "stateless-only",
  "identityModel": "multi-tenant",
  "auth": "jwt",
  "realtimeScope": "basic-notifications-only",
  "realtimeTransport": "sse",
  "jobExecutionModel": "fire-and-forget",
  "jobsMechanism": "in-memory-queue",
  "apiVersioning": "url-v1",
  "observability": "otel-tracing",
  "logging": "pino",
  "errorHandling": "central-middleware",
  "tests": ["unit", "integration", "contract"],
  "deploymentTarget": "containerized-docker"
}
```

---

## Separation principle (non-negotiable)

- **Frontend** = interaction layer (UI/runtime in the browser + frontend build system)  
- **Backend** = execution logic (API/runtime + security + logging + error model)  
- **DB/storage** = persistence/infrastructure (handled in a separate tree)

Do not let backend prompts drift into frontend concerns, and do not let DB/persistence leak into backend decisions.

