/**
 * Database-first decision tree (separate subsystem).
 *
 * Goal: capture DB intent without leaking backend assumptions.
 * Output includes a rich `databaseDetail` plus coarse derived knobs for current blueprint fields:
 * - blueprint.database (PrimaryDatabase)
 * - blueprint.redis (RedisPolicy)
 */
import { select } from "@inquirer/prompts";

// Must stay aligned with app-blueprint-config.ts unions.
export type BlueprintPrimaryDatabase =
  | "sqlite-file"
  | "postgres"
  | "mysql-mariadb"
  | "mongodb"
  | "turso-libsql"
  | "planetscale-mysql"
  | "neon-postgres"
  | "none";

export type BlueprintRedisPolicy = "none" | "cache-sessions" | "cache-sessions-queues";

export type DataMode = "none" | "mock-only" | "local-dev-db" | "production-db-future";

export type PersistenceMode = "stateless" | "ephemeral-memory" | "lightweight" | "full";

export type DataRole = "session-auth" | "user-business" | "analytics-logging" | "realtime-events" | "cache-only";

export type DataModelType = "relational" | "document" | "key-value" | "event-system";

export type EventSystemType = "event-sourcing" | "stream-processing" | "analytics-storage";

export type DbEngine =
  | "none"
  | "postgres"
  | "sqlite"
  | "mysql"
  | "mongodb"
  | "firestore"
  | "redis"
  | "upstash-redis"
  | "eventstoredb"
  | "kafka"
  | "clickhouse";

export type DataAccessStrategy = "raw-sql" | "orm" | "query-builder" | "framework-native";

export type OrmTool = "prisma" | "drizzle" | "typeorm" | "sqlalchemy" | "none";

export type MigrationStrategy = "none" | "auto" | "manual" | "hybrid";

export type AccessPattern = "direct" | "repository" | "service-layer" | "cqrs";

export type ScalingIntent = "not-considered" | "future-proof-only" | "production-ready" | "high-scale-system";

export type ScalingModel = "single-instance" | "managed-cloud" | "read-replicas-future" | "sharded-advanced";

export type CacheLayer = "none" | "in-memory" | "redis" | "edge-cache";

export type RedisRole = "none" | "primary-db" | "cache-layer" | "session-store" | "message-broker";

export type ReliabilityLevel = "best-effort" | "standard" | "high-availability" | "financial-grade";

export type ConsistencyModel = "eventual" | "strong" | "mixed";

export type DatabaseDetail = {
  persistenceMode: PersistenceMode;
  /** Multi-role: business data + sessions/auth + caching can coexist. */
  dataRoles: DataRole[];
  model: DataModelType;
  eventSystemType?: EventSystemType;
  engine: DbEngine;
  /** Only meaningful for file-based engines (SQLite/libSQL). */
  fileStorageTopology?: "local-disk" | "nas-mounted";
  accessStrategy: DataAccessStrategy;
  ormTool?: OrmTool;
  migrations?: MigrationStrategy;
  accessPattern: AccessPattern;
  consistency: ConsistencyModel;
  scalingIntent: ScalingIntent;
  scalingModel?: ScalingModel;
  cacheLayer: CacheLayer;
  redisRole: RedisRole;
  reliability?: ReliabilityLevel;
};

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

export async function promptDatabaseTree(opts: { depth: "easy" | "advanced" }): Promise<{
  dataMode: DataMode;
  databaseDetail: DatabaseDetail;
  primaryDatabase: BlueprintPrimaryDatabase;
  redis: BlueprintRedisPolicy;
}> {
  const persistenceMode = await pick<PersistenceMode>("DB · 1 Persistence mode", [
    { value: "stateless", label: "Stateless (no persistence)" },
    { value: "ephemeral-memory", label: "Ephemeral state (runtime memory only)" },
    { value: "lightweight", label: "Lightweight persistence (sessions/cache)" },
    { value: "full", label: "Full persistence (business data)" },
  ]);

  if (persistenceMode === "stateless") {
    return {
      dataMode: "none",
      databaseDetail: {
        persistenceMode,
        dataRoles: ["user-business"],
        model: "relational",
        engine: "none",
        accessStrategy: "raw-sql",
        accessPattern: "direct",
        consistency: "strong",
        scalingIntent: "not-considered",
        cacheLayer: "none",
        redisRole: "none",
      },
      primaryDatabase: "none",
      redis: "none",
    };
  }

  if (persistenceMode === "ephemeral-memory") {
    return {
      dataMode: "mock-only",
      databaseDetail: {
        persistenceMode,
        dataRoles: ["session-auth"],
        model: "key-value",
        engine: "none",
        accessStrategy: "framework-native",
        accessPattern: "direct",
        consistency: "strong",
        scalingIntent: "not-considered",
        cacheLayer: "in-memory",
        redisRole: "none",
      },
      primaryDatabase: "none",
      redis: "none",
    };
  }

  const primaryRole = await pick<DataRole>("DB · 2 Primary data role (main purpose)", [
    { value: "session-auth", label: "Session / auth data" },
    { value: "user-business", label: "User / business data" },
    { value: "analytics-logging", label: "Analytics / logging" },
    { value: "realtime-events", label: "Realtime events" },
    { value: "cache-only", label: "Cache-only system" },
  ]);

  if (persistenceMode === "lightweight") {
    const cacheLayer = await pick<CacheLayer>("DB · 3 Cache/session layer (lightweight persistence)", [
      { value: "none", label: "None" },
      { value: "in-memory", label: "In-memory cache (dev / single instance)" },
      { value: "redis", label: "Redis cache / sessions" },
      { value: "edge-cache", label: "Edge cache (CDN-style) — sketch" },
    ]);
    const redisRole: RedisRole =
      cacheLayer === "redis"
        ? await pick<RedisRole>("DB · 3.1 Redis usage (role)", [
            { value: "session-store", label: "Session store" },
            { value: "cache-layer", label: "Cache layer" },
            { value: "message-broker", label: "Message broker (future queues)" },
            { value: "primary-db", label: "Primary database (unusual; key-value primary)" },
          ])
        : "none";
    return {
      dataMode: cacheLayer === "none" ? "mock-only" : "local-dev-db",
      databaseDetail: {
        persistenceMode,
        dataRoles: [primaryRole],
        model: "key-value",
        engine: cacheLayer === "redis" ? "redis" : "none",
        accessStrategy: "framework-native",
        accessPattern: "direct",
        consistency: "strong",
        scalingIntent: "future-proof-only",
        scalingModel: "single-instance",
        cacheLayer,
        redisRole,
        reliability: "standard",
      },
      primaryDatabase: "none",
      redis: cacheLayer === "redis" ? "cache-sessions" : "none",
    };
  }

  // Full database
  const model = await pick<DataModelType>("DB · 3 Data model type", [
    { value: "relational", label: "Relational (structured SaaS / business apps) — recommended" },
    { value: "document", label: "Document (flexible JSON-like data)" },
    { value: "key-value", label: "Key-value (cache-first systems; unusual as primary DB)" },
    { value: "event-system", label: "Event systems (event sourcing / streams / analytics)" },
  ]);

  let eventSystemType: EventSystemType | undefined;
  if (model === "event-system") {
    eventSystemType = await pick<EventSystemType>("DB · 2.1 Event system type", [
      { value: "event-sourcing", label: "Event sourcing (append-only event store)" },
      { value: "stream-processing", label: "Stream processing (transport/backbone)" },
      { value: "analytics-storage", label: "Analytics storage (OLAP / logs)" },
    ]);
  }

  const engineChoices: { value: DbEngine; label: string }[] =
    model === "relational"
      ? [
          { value: "sqlite", label: "Embedded: SQLite" },
          { value: "postgres", label: "Managed: PostgreSQL (recommended default)" },
          { value: "mysql", label: "Legacy/compat: MySQL / MariaDB" },
        ]
      : model === "document"
        ? [
            { value: "mongodb", label: "MongoDB" },
            { value: "firestore", label: "Firestore" },
          ]
        : model === "key-value"
          ? [
              { value: "redis", label: "Cache-first: Redis" },
              { value: "upstash-redis", label: "Serverless: Upstash Redis" },
            ]
          : eventSystemType === "event-sourcing"
            ? [{ value: "eventstoredb", label: "EventStoreDB" }]
            : eventSystemType === "stream-processing"
              ? [{ value: "kafka", label: "Kafka (stream backbone)" }]
              : [{ value: "clickhouse", label: "ClickHouse (analytics storage)" }];

  const engine = await pick<DbEngine>("DB · 3 Primary engine", engineChoices);

  const fileStorageTopology: DatabaseDetail["fileStorageTopology"] =
    engine === "sqlite"
      ? await pick("DB · 3.1 SQLite file location", [
          { value: "local-disk" as const, label: "Local disk" },
          { value: "nas-mounted" as const, label: "NAS mounted volume (NFS/SMB)" },
        ])
      : undefined;

  const accessStrategy =
    engine === "redis" || engine === "upstash-redis"
      ? ("framework-native" as const)
      : opts.depth === "easy"
        ? ("orm" as const)
        : await pick<DataAccessStrategy>("DB · 4 Data access strategy", [
            { value: "raw-sql", label: "Raw SQL" },
            { value: "query-builder", label: "Query builder" },
            { value: "orm", label: "ORM" },
            { value: "framework-native", label: "Framework-native / driver-native" },
          ]);

  let ormTool: OrmTool | undefined;
  if (accessStrategy === "orm") {
    const defaultOrm: OrmTool =
      engine === "postgres" || engine === "mysql" || engine === "sqlite" ? "prisma" : engine === "mongodb" ? "prisma" : "none";
    ormTool =
      opts.depth === "easy"
        ? defaultOrm
        : await pick<OrmTool>("DB · 4.1 ORM implementation tool", [
            { value: "prisma", label: "Prisma (Node/TS default)" },
            { value: "drizzle", label: "Drizzle ORM" },
            { value: "typeorm", label: "TypeORM (NestJS legacy-friendly)" },
            { value: "sqlalchemy", label: "SQLAlchemy (Python)" },
            { value: "none", label: "None (raw queries)" },
          ]);
  }

  const migrations =
    accessStrategy === "orm" || accessStrategy === "raw-sql" || accessStrategy === "query-builder"
      ? opts.depth === "easy"
        ? "auto"
        : await pick<MigrationStrategy>("DB · 5 Migration strategy", [
            { value: "none", label: "None (dev only / static schema)" },
            { value: "auto", label: "Auto migrations (Prisma/Drizzle-style)" },
            { value: "manual", label: "Manual migrations" },
            { value: "hybrid", label: "Hybrid (auto + manual control)" },
          ])
      : undefined;

  const accessPattern =
    opts.depth === "easy"
      ? "service-layer"
      : await pick<AccessPattern>("DB · 6 Data access pattern", [
          { value: "direct", label: "Direct DB access (simple apps)" },
          { value: "repository", label: "Repository pattern" },
          { value: "service-layer", label: "Service layer abstraction" },
          { value: "cqrs", label: "CQRS (advanced)" },
        ]);

  const consistency =
    opts.depth === "easy"
      ? "strong"
      : await pick<ConsistencyModel>("DB · 7 Consistency model", [
          { value: "eventual", label: "Eventually consistent" },
          { value: "strong", label: "Strong consistency" },
          { value: "mixed", label: "Mixed" },
        ]);

  const scalingIntent =
    opts.depth === "easy"
      ? "production-ready"
      : await pick<ScalingIntent>("DB · 8 Scaling intent (what are you aiming for?)", [
          { value: "not-considered", label: "Not considered" },
          { value: "future-proof-only", label: "Future-proof only" },
          { value: "production-ready", label: "Production-ready" },
          { value: "high-scale-system", label: "High-scale system" },
        ]);

  const scalingChoices: { value: ScalingModel; label: string }[] = [
    { value: "single-instance", label: "Single instance" },
    { value: "managed-cloud", label: "Managed cloud DB" },
    { value: "read-replicas-future", label: "Read replicas (future)" },
    { value: "sharded-advanced", label: "Sharded (advanced)" },
  ];
  const scalingModel: ScalingModel | undefined =
    scalingIntent === "not-considered"
      ? undefined
      : await pick<ScalingModel>(
          "DB · 8.1 Scaling model",
          scalingIntent === "high-scale-system" ? scalingChoices.filter((c) => c.value !== "single-instance") : scalingChoices,
        );

  const cacheLayer =
    opts.depth === "easy"
      ? "redis"
      : await pick<CacheLayer>("DB · 9 Cache layer (separate from primary DB)", [
          { value: "none", label: "None" },
          { value: "in-memory", label: "In-memory cache" },
          { value: "redis", label: "Redis cache layer" },
          { value: "edge-cache", label: "Edge cache (CDN-style)" },
        ]);

  const reliability =
    opts.depth === "easy"
      ? "standard"
      : await pick<ReliabilityLevel>("DB · 10 Reliability level", [
          { value: "best-effort", label: "Best effort (dev apps)" },
          { value: "standard", label: "Standard durability" },
          { value: "high-availability", label: "High availability" },
          { value: "financial-grade", label: "Financial-grade consistency" },
        ]);

  const redisRole: RedisRole =
    engine === "redis" || engine === "upstash-redis" ? "primary-db" : cacheLayer === "redis" ? "cache-layer" : "none";

  const dataRoles: DataRole[] = (() => {
    const roles = new Set<DataRole>();
    roles.add(primaryRole);
    if (engine === "postgres" || engine === "mysql" || engine === "sqlite" || engine === "mongodb" || engine === "firestore") {
      roles.add("user-business");
    }
    if (redisRole === "cache-layer") roles.add("cache-only");
    if (redisRole === "primary-db") roles.add("cache-only");
    return [...roles];
  })();

  const databaseDetail: DatabaseDetail = {
    persistenceMode,
    dataRoles,
    model,
    eventSystemType,
    engine,
    fileStorageTopology,
    accessStrategy,
    ormTool,
    migrations,
    accessPattern,
    consistency,
    scalingIntent,
    scalingModel,
    cacheLayer,
    redisRole,
    reliability,
  };

  const primaryDatabase: BlueprintPrimaryDatabase =
    engine === "postgres"
      ? "postgres"
      : engine === "sqlite"
        ? "sqlite-file"
        : engine === "mysql"
          ? "mysql-mariadb"
          : engine === "mongodb"
            ? "mongodb"
            : "none";

  const redisPolicy: BlueprintRedisPolicy = cacheLayer === "redis" ? "cache-sessions" : "none";

  const dataMode: DataMode = opts.depth === "easy" ? "production-db-future" : "local-dev-db";

  return { dataMode, databaseDetail, primaryDatabase, redis: redisPolicy };
}
