# Database decision tree (manual stack wizard) — separate subsystem

This documents the database/data-layer decision tree implemented (initially) in `factory/blueprint-database-tree.ts`.

Design goals:
- DB is a **first-class subsystem** (not a backend extension).
- It must support “no DB yet” without leaking implicit defaults.
- It should produce:
  - **rich capture** (`databaseDetail`)
  - **coarse knobs** (`database`, `redis`) for current scaffolding compatibility

Legend:
- `◆` decision (single-select)
- `▣` multi-select (checkboxes)
- `→` implies / derives
- `⛔` option not offered (incompatible)
- `(*)` auto-picked (no prompt shown)

---

## Tree (v1)

◆ **1 · Persistence mode**  
`Stateless (no persistence)` | `Ephemeral memory only` | `Lightweight (sessions/cache)` | `Full (business data)`

◆ **2 · Data role (what is this used for?)**  
`Session/auth data` | `User/business data` | `Analytics/logging` | `Realtime events` | `Cache-only system`

◆ **3 · Data model type** (only if Full)  
`Relational` | `Document` | `Key-value` | `Event systems`

◆ **3.1 · Event system type** (only if “Event systems”)  
`Event sourcing` | `Stream processing` | `Analytics storage`

◆ **4 · Primary engine** (depends on model)  
- Relational → `Postgres` | `SQLite` | `MySQL`
- Document → `MongoDB` | `Firestore`
- Key-value → `Redis` | `Upstash Redis`
- Event systems → `EventStoreDB` (event sourcing) | `Kafka` (streams) | `ClickHouse` (analytics)

🔒 **Hard gating (dependency rules)**  
These nodes are only enabled when they make sense:

- If **Persistence mode = Stateless/Ephemeral**, DB engines/ORM/migrations/scaling/reliability are **not asked**.
- If primary engine is **key-value only** (Redis primary), ORM/migrations are typically **not asked** (driver-native).

◆ **5 · Data access strategy**  
`Raw SQL` | `Query builder` | `ORM` | `Framework/driver-native`

◆ **5.1 · ORM tool** (only if strategy = ORM)  
`Prisma` | `Drizzle` | `TypeORM` | `SQLAlchemy` | `None`

◆ **6 · Migration strategy** (only if persistence is active and not driver-native)  
`None` | `Auto` | `Manual` | `Hybrid`

◆ **7 · Access pattern**  
`Direct` | `Repository` | `Service layer` | `CQRS`

◆ **8 · Consistency model**  
`Eventually consistent` | `Strong consistency` | `Mixed`

◆ **9 · Scaling intent**  
`Not considered` | `Future-proof only` | `Production-ready` | `High-scale system`

◆ **9.1 · Scaling model** (only if scaling intent ≠ Not considered)  
`Single instance` | `Managed cloud` | `Read replicas (future)` | `Sharded (advanced)`

◆ **10 · Cache layer (separate from primary DB)**  
`None` | `In-memory` | `Redis` | `Edge cache`

◆ **10.1 · Redis usage role** (only if Redis is selected anywhere)  
`Primary DB` | `Cache layer` | `Session store` | `Message broker`

◆ **11 · Reliability level** (only if persistence is active)  
`Best effort` | `Standard` | `High availability` | `Financial-grade`

---

## Output integration (current blueprint)

The DB tree writes:

- **`databaseDetail`** (rich capture) — new optional block in `app.stack.json`
- **`database`** (existing coarse enum used by scaffold today)
- **`redis`** (existing coarse enum used by scaffold today)
- **`dataMode`** — keeps “no DB / mock-only / local-dev / production-future” explicit

This keeps the “no DB yet” philosophy intact while allowing future generators to use the richer `databaseDetail`.

