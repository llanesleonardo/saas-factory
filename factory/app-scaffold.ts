/**
 * Reads configs/app.blueprint.json (or --from) and scaffolds apps/<slug>-instance (Vite React)
 * plus apps/<slug>-api (Express / Fastify / Hono + SQLite todos).
 *
 *   npm run app:scaffold   (via factory/host-or-docker.ts — Compose on host, tsx in-container)
 *   npm run app:scaffold -- --from configs/app.blueprint.json --force
 *   npm run app:scaffold -- --dry-run
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { SaaSAppBlueprint } from "./app-blueprint-config.js";
import { loadBlueprintFromPath } from "./app-blueprint-config.js";
import {
  COMPOSE_GENERATED,
  COMPOSE_MAIN,
  patchComposeNodeEnvironment,
  writeComposeGenerated,
} from "./docker-compose-from-blueprint.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_BLUEPRINT = path.join(REPO_ROOT, "configs", "app.blueprint.json");

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeFileEnsured(filePath: string, content: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would write ${path.relative(REPO_ROOT, filePath)}`);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function rmrf(target: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would remove ${path.relative(REPO_ROOT, target)}`);
    return;
  }
  await fs.rm(target, { recursive: true, force: true });
}

function assertScaffoldSupported(bp: SaaSAppBlueprint): void {
  if (bp.frontend.stack !== "vite-react-ts") {
    throw new Error(
      `Scaffold v1 supports frontend "vite-react-ts" only (got "${bp.frontend.stack}"). Edit blueprint or extend factory/app-scaffold.ts.`,
    );
  }
  const be = bp.backend.runtime;
  if (be !== "nodejs-express" && be !== "nodejs-fastify" && be !== "nodejs-hono") {
    throw new Error(
      `Scaffold v1 supports backend nodejs-express | nodejs-fastify | nodejs-hono (got "${be}"). Next/Python/Go scaffolds not generated yet.`,
    );
  }
}

function workspacePathForPkg(relDir: string): string {
  return relDir.split(path.sep).join("/");
}

async function mergeRootWorkspaces(relDirs: string[], dryRun: boolean): Promise<void> {
  const pkgPath = path.join(REPO_ROOT, "package.json");
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { workspaces?: string[] };
  const normalized = [...relDirs.map(workspacePathForPkg), ...(pkg.workspaces ?? []).map(workspacePathForPkg)];
  const next = new Set<string>(normalized);
  pkg.workspaces = [...next].sort();
  if (dryRun) {
    console.log("[dry-run] would update package.json workspaces:", pkg.workspaces);
    return;
  }
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

function apiPackageJson(slug: string, bp: SaaSAppBlueprint): object {
  const deps: Record<string, string> = {
    "better-sqlite3": "^11.7.0",
    dotenv: "^16.4.5",
  };
  const devDeps: Record<string, string> = {
    "@types/node": "^22.10.2",
    eslint: "^9.17.0",
    jest: "^29.7.0",
    prettier: "^3.4.2",
    "ts-jest": "^29.2.5",
    tsx: "^4.19.2",
    typescript: "^5.7.2",
    "typescript-eslint": "^8.19.0",
  };

  if (bp.backend.runtime === "nodejs-express") {
    deps.express = "^4.21.2";
    deps.cors = "^2.8.5";
    devDeps["@types/express"] = "^5.0.0";
    devDeps["@types/cors"] = "^2.8.17";
  } else if (bp.backend.runtime === "nodejs-fastify") {
    deps.fastify = "^5.2.1";
    deps["@fastify/cors"] = "^10.0.1";
  } else if (bp.backend.runtime === "nodejs-hono") {
    deps.hono = "^4.6.14";
    deps["@hono/node-server"] = "^1.13.7";
  }

  if (bp.redis !== "none") {
    deps.redis = "^4.7.0";
  }

  let devScript = "tsx watch src/index.ts";
  let buildScript = "tsc";
  let startScript = "node dist/index.js";

  return {
    name: `${slug}-api`,
    version: "0.1.0",
    private: true,
    description: `API for ${slug} (generated from app.blueprint.json)`,
    scripts: {
      dev: devScript,
      build: buildScript,
      start: startScript,
      test: 'jest --passWithNoTests --detectOpenHandles',
      lint: 'eslint "src/**/*.ts"',
      format: 'prettier --write "src/**/*.ts"',
    },
    dependencies: deps,
    devDependencies: devDeps,
  };
}

function apiTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "CommonJS",
        outDir: "dist",
        rootDir: "src",
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      include: ["src/**/*"],
    },
    null,
    2,
  );
}

function expressEntry(bp: SaaSAppBlueprint, slug: string): string {
  const redisBlock =
    bp.redis === "none"
      ? `let redisOk = false;
`
      : `import { createClient } from "redis";
let redisOk = false;
const redis = createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" });
redis.on("error", () => {
  redisOk = false;
});
`;

  const redisConnect =
    bp.redis === "none"
      ? ``
      : `
void (async () => {
  try {
    await redis.connect();
    redisOk = true;
    console.log("Redis connected");
  } catch (e) {
    console.warn("Redis unavailable — sessions/cache features degraded", e);
  }
})();
`;

  const uploads =
    bp.objectStorage === "local-filesystem"
      ? `app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));\n`
      : "";

  const redisHealthJs =
    bp.redis === "none" ? `"skipped"` : `(redisOk ? "up" : "down")`;

  return `/* Generated — ${slug}-api (Express + SQLite) */
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import Database from "better-sqlite3";

dotenv.config();

${redisBlock}
const PORT = Number(process.env.PORT ?? 4000);
const DB_PATH = process.env.DATABASE_PATH ?? path.join(__dirname, "..", "data", "todos.db");

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
${uploads}
${redisConnect}

const db = new Database(DB_PATH);
db.exec(\`
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
\`);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    redis: ${redisHealthJs},
    db: "sqlite",
    blueprintIntegration: "${bp.integrationMode}",
  });
});

app.get("/api/todos", (_req, res) => {
  const rows = db.prepare("SELECT id, title, done, created_at FROM todos ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/todos", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const info = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
  const row = db.prepare("SELECT id, title, done, created_at FROM todos WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.patch("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const done = req.body?.done;
  if (typeof done !== "boolean") return res.status(400).json({ error: "done boolean required" });
  db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(done ? 1 : 0, id);
  const row = db.prepare("SELECT id, title, done, created_at FROM todos WHERE id = ?").get(id);
  res.json(row ?? { error: "not found" });
});

app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(\`${slug}-api listening on http://localhost:\${PORT}\`);
});
`;
}

function fastifyEntry(bp: SaaSAppBlueprint, slug: string): string {
  return `/* Generated — ${slug}-api (Fastify + SQLite) */
import path from "node:path";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import Database from "better-sqlite3";

dotenv.config();

async function main(): Promise<void> {
  const PORT = Number(process.env.PORT ?? 4000);
  const DB_PATH = process.env.DATABASE_PATH ?? path.join(__dirname, "..", "data", "todos.db");

  const db = new Database(DB_PATH);
  db.exec(\`
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
\`);

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: ["http://localhost:5173", "http://127.0.0.1:5173"] });

  app.get("/api/health", async () => ({
    ok: true,
    redis: "${bp.redis === "none" ? "skipped" : "configure REDIS_URL"}",
    db: "sqlite",
  }));

  app.get("/api/todos", async () => {
    return db.prepare("SELECT id, title, done, created_at FROM todos ORDER BY id DESC").all();
  });

  app.post<{ Body: { title?: string } }>("/api/todos", async (req, reply) => {
    const title = String(req.body?.title ?? "").trim();
    if (!title) return reply.code(400).send({ error: "title required" });
    const info = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
    const row = db.prepare("SELECT id, title, done, created_at FROM todos WHERE id = ?").get(info.lastInsertRowid);
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string }; Body: { done?: boolean } }>("/api/todos/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (typeof req.body?.done !== "boolean") return reply.code(400).send({ error: "done boolean required" });
    db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(req.body.done ? 1 : 0, id);
    const row = db.prepare("SELECT id, title, done, created_at FROM todos WHERE id = ?").get(id);
    return row ?? reply.code(404).send({ error: "not found" });
  });

  app.delete<{ Params: { id: string } }>("/api/todos/:id", async (req, reply) => {
    db.prepare("DELETE FROM todos WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(\`${slug}-api (Fastify) http://localhost:\${PORT}\`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;
}

function honoEntry(bp: SaaSAppBlueprint, slug: string): string {
  return `/* Generated — ${slug}-api (Hono + SQLite) */
import path from "node:path";
import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import Database from "better-sqlite3";

dotenv.config();

function main(): void {
  const PORT = Number(process.env.PORT ?? 4000);
  const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "todos.db");

  const db = new Database(DB_PATH);
  db.exec(\`
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
\`);

  const app = new Hono();
  app.use("*", cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      redis: "${bp.redis === "none" ? "skipped" : "configure REDIS_URL"}",
      db: "sqlite",
      blueprintIntegration: "${bp.integrationMode}",
    }),
  );

  app.get("/api/todos", (c) => {
    const rows = db.prepare("SELECT id, title, done, created_at FROM todos ORDER BY id DESC").all();
    return c.json(rows);
  });

  app.post("/api/todos", async (c) => {
    const body = await c.req.json<{ title?: string }>().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    if (!title) return c.json({ error: "title required" }, 400);
    const info = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
    const row = db.prepare("SELECT id, title, done, created_at FROM todos WHERE id = ?").get(info.lastInsertRowid);
    return c.json(row, 201);
  });

  app.patch("/api/todos/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<{ done?: boolean }>().catch(() => ({}));
    if (typeof body.done !== "boolean") return c.json({ error: "done boolean required" }, 400);
    db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(body.done ? 1 : 0, id);
    const row = db.prepare("SELECT id, title, done, created_at FROM todos WHERE id = ?").get(id);
    return row ? c.json(row) : c.json({ error: "not found" }, 404);
  });

  app.delete("/api/todos/:id", (c) => {
    db.prepare("DELETE FROM todos WHERE id = ?").run(Number(c.req.param("id")));
    return c.body(null, 204);
  });

  serve({ fetch: app.fetch, port: PORT });
  console.log(\`${slug}-api (Hono) http://localhost:\${PORT}\`);
}

main();
`;
}

function apiEntrySource(bp: SaaSAppBlueprint, slug: string): string {
  if (bp.backend.runtime === "nodejs-express") return expressEntry(bp, slug);
  if (bp.backend.runtime === "nodejs-fastify") return fastifyEntry(bp, slug);
  return honoEntry(bp, slug);
}

/** Fastify/Hono templates use top-level await — compile as ES module in dev via tsx; emit requires dual package — keep tsx for prod quickstart or use bundle step. */
function apiPackageJsonAdjustForFastifyHono(pkg: Record<string, unknown>, runtime: string): void {
  if (runtime === "nodejs-fastify" || runtime === "nodejs-hono") {
    const scripts = pkg.scripts as Record<string, string>;
    scripts.start = "tsx src/index.ts";
    scripts.build = "echo \"Use tsx start for dev; add bundler for prod\"";
  }
}

async function scaffoldApi(slug: string, bp: SaaSAppBlueprint, apiDir: string, dryRun: boolean): Promise<void> {
  const pkg = apiPackageJson(slug, bp) as Record<string, unknown>;
  apiPackageJsonAdjustForFastifyHono(pkg, bp.backend.runtime);

  await writeFileEnsured(path.join(apiDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n", dryRun);
  await writeFileEnsured(path.join(apiDir, "tsconfig.json"), apiTsConfig(), dryRun);
  await writeFileEnsured(path.join(apiDir, "jest.config.cjs"), jestConfig(), dryRun);
  await writeFileEnsured(path.join(apiDir, "eslint.config.cjs"), eslintConfig(), dryRun);
  await writeFileEnsured(path.join(apiDir, ".prettierrc"), JSON.stringify({ semi: true, singleQuote: false }, null, 2) + "\n", dryRun);
  await writeFileEnsured(path.join(apiDir, ".env.example"), apiEnvExample(bp), dryRun);
  await writeFileEnsured(path.join(apiDir, "README.md"), apiReadme(slug, bp), dryRun);
  await writeFileEnsured(path.join(apiDir, ".gitignore"), "dist/\nnode_modules/\ndata/*.db\nuploads/*\n!.gitkeep\n.env\n", dryRun);
  await writeFileEnsured(path.join(apiDir, "data", ".gitkeep"), "", dryRun);
  if (bp.objectStorage === "local-filesystem") {
    await writeFileEnsured(path.join(apiDir, "uploads", ".gitkeep"), "", dryRun);
  }
  await writeFileEnsured(path.join(apiDir, "src", "index.ts"), apiEntrySource(bp, slug), dryRun);
  await writeFileEnsured(
    path.join(apiDir, "src", "__tests__", "smoke.test.ts"),
    `test("smoke", () => {
  expect(1 + 1).toBe(2);
});
`,
    dryRun,
  );

  if (bp.observability !== "none") {
    await writeFileEnsured(
      path.join(apiDir, "src", "telemetry-placeholder.ts"),
      `/** Blueprint observability: "${bp.observability}" — wire OpenTelemetry / exporters here. */\nexport function initTelemetry(): void {\n  console.info("[telemetry] hook placeholder");\n}\n`,
      dryRun,
    );
  }
}

function jestConfig(): string {
  return `/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\\\.ts$": [
      "ts-jest",
      {
        tsconfig: { module: "commonjs", moduleResolution: "node", esModuleInterop: true },
      },
    ],
  },
};
`;
}

function eslintConfig(): string {
  return `const tseslint = require("typescript-eslint");
module.exports = tseslint.config(
  { ignores: ["dist/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
`;
}

function apiEnvExample(bp: SaaSAppBlueprint): string {
  const lines = ["PORT=4000", "DATABASE_PATH=./data/todos.db"];
  if (bp.redis !== "none") lines.push("REDIS_URL=redis://127.0.0.1:6379");
  if (bp.database === "postgres") lines.push("DATABASE_URL=postgres://app:app@localhost:5432/app");
  lines.push("# integrationMode=" + bp.integrationMode);
  return lines.join("\n") + "\n";
}

function apiReadme(slug: string, bp: SaaSAppBlueprint): string {
  return `# ${slug}-api

Generated from \`configs/app.blueprint.json\` (${bp.backend.runtime}, ${bp.database}).

## Dev

\`\`\`bash
cp .env.example .env
npm install
npm run dev
\`\`\`

Todos API: \`GET/POST /api/todos\`, \`PATCH/DELETE /api/todos/:id\`, \`GET /api/health\`.

Frontend dev server proxies \`/api\` → see \`apps/${slug}-instance/vite.config.ts\`.
`;
}

async function scaffoldFrontend(slug: string, bp: SaaSAppBlueprint, instDir: string, dryRun: boolean): Promise<void> {
  const pkg = {
    name: `${slug}-instance`,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc -b && vite build",
      preview: "vite preview",
      lint: 'eslint "src/**/*.{ts,tsx}"',
      format: 'prettier --write "src/**/*.{ts,tsx}"',
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1",
      "@vitejs/plugin-react": "^4.3.4",
      eslint: "^9.17.0",
      prettier: "^3.4.2",
      typescript: "~5.7.2",
      "typescript-eslint": "^8.19.0",
      vite: "^6.0.3",
    },
  };

  await writeFileEnsured(path.join(instDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n", dryRun);
  await writeFileEnsured(path.join(instDir, "tsconfig.json"), frontendTsConfig(), dryRun);
  await writeFileEnsured(path.join(instDir, "tsconfig.node.json"), frontendTsNodeConfig(), dryRun);
  await writeFileEnsured(path.join(instDir, "vite.config.ts"), viteConfigTs(slug), dryRun);
  await writeFileEnsured(path.join(instDir, "index.html"), frontendIndexHtml(slug), dryRun);
  await writeFileEnsured(path.join(instDir, "eslint.config.js"), frontendEslint(), dryRun);
  await writeFileEnsured(path.join(instDir, ".prettierrc"), JSON.stringify({ semi: true, singleQuote: false }, null, 2) + "\n", dryRun);
  await writeFileEnsured(path.join(instDir, ".env.example"), "VITE_API_TARGET=http://localhost:4000\n", dryRun);
  await writeFileEnsured(path.join(instDir, ".gitignore"), "dist\nnode_modules\n.env\n", dryRun);
  await writeFileEnsured(path.join(instDir, "README.md"), frontendReadme(slug, bp), dryRun);
  await writeFileEnsured(path.join(instDir, "src", "main.tsx"), frontendMainTsx(), dryRun);
  await writeFileEnsured(path.join(instDir, "src", "App.tsx"), frontendAppTsx(), dryRun);
  await writeFileEnsured(path.join(instDir, "src", "vite-env.d.ts"), '/// <reference types="vite/client" />\n', dryRun);
}

function frontendTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "Bundler",
        isolatedModules: true,
        jsx: "react-js",
        strict: true,
        noEmit: true,
      },
      include: ["src"],
    },
    null,
    2,
  );
}

function frontendTsNodeConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
      },
      include: ["vite.config.ts"],
    },
    null,
    2,
  );
}

function viteConfigTs(slug: string): string {
  return `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
`;
}

function frontendIndexHtml(slug: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${slug}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function frontendEslint(): string {
  return `import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  ...tseslint.configs.recommended,
);
`;
}

function frontendMainTsx(): string {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function frontendAppTsx(): string {
  return `import { useEffect, useState } from "react";

type Todo = { id: number; title: string; done: number; created_at: string };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const r = await fetch("/api/todos");
    if (!r.ok) return setErr(await r.text());
    setTodos(await r.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!r.ok) return setErr(await r.text());
    setTitle("");
    await load();
  }

  async function toggle(t: Todo) {
    await fetch(\`/api/todos/\${t.id}\`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    });
    await load();
  }

  async function remove(id: number) {
    await fetch(\`/api/todos/\${id}\`, { method: "DELETE" });
    await load();
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Todos</h1>
      <p style={{ color: "#666" }}>
        API proxied from Vite — run <code>npm run dev</code> in sibling <code>*-api</code>.
      </p>
      {err && <pre style={{ color: "crimson" }}>{err}</pre>}
      <form onSubmit={add}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task"
          style={{ width: "70%", padding: "0.5rem" }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>
          Add
        </button>
      </form>
      <ul style={{ marginTop: "1.5rem", lineHeight: 1.8 }}>
        {todos.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={!!t.done} onChange={() => void toggle(t)} /> {t.title}
            </label>
            <button type="button" onClick={() => void remove(t.id)} style={{ marginLeft: 12 }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;
}

function frontendReadme(slug: string, bp: SaaSAppBlueprint): string {
  return `# ${slug}-instance

Vite + React + TypeScript shell generated from \`app.blueprint.json\`.

## Dev

\`\`\`bash
npm install
npm run dev
\`\`\`

Ensure \`apps/${slug}-api\` is running on port 4000 (or set \`VITE_API_TARGET\`).

## Docker helpers

Infra is generated at repo root: \`docker/compose.generated.yaml\` (see \`docker/compose.yaml\`, profile \`infra\`). Containers blueprint: **${bp.tooling.containers}**.

Blueprint: **${bp.integrationMode}** integration — see \`organizational_memory/ARCHITECTURE.md\`.
`;
}

async function scaffoldCompose(instDir: string, _bp: SaaSAppBlueprint, dryRun: boolean): Promise<void> {
  const note =
    `# Docker infra is generated at repo root: docker/compose.generated.yaml\n` +
    `# (from configs/app.blueprint.json when you run npm run app:scaffold)\n` +
    `# From repo root:\n` +
    `#   docker compose -f docker/compose.yaml --profile infra up -d\n` +
    `services: {}\n`;
  await writeFileEnsured(path.join(instDir, "docker-compose.yml"), note, dryRun);
}

async function scaffoldDockerFromBlueprint(slug: string, bp: SaaSAppBlueprint, dryRun: boolean): Promise<void> {
  await writeComposeGenerated(COMPOSE_GENERATED, bp, slug, dryRun);
  await patchComposeNodeEnvironment(COMPOSE_MAIN, bp, dryRun);
}

async function scaffoldGithubWorkflow(slug: string, bp: SaaSAppBlueprint, dryRun: boolean): Promise<void> {
  if (bp.cicd !== "github-actions") return;
  const wfDir = path.join(REPO_ROOT, ".github", "workflows");
  const safe = slug.replace(/[^a-z0-9-]/g, "-") || "app";
  const name = `app-${safe}-ci.yml`;
  const wsApi = `${slug}-api`;
  const wsWeb = `${slug}-instance`;
  const body = `name: App ${slug} CI

on:
  push:
    paths:
      - "apps/${slug}-instance/**"
      - "apps/${slug}-api/**"
      - "package-lock.json"
  pull_request:
    paths:
      - "apps/${slug}-instance/**"
      - "apps/${slug}-api/**"
      - "package-lock.json"

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - name: API test
        run: npm run test -w ${wsApi}
      - name: Web build
        run: npm run build -w ${wsWeb}
`;

  const wfPath = path.join(wfDir, name);
  await writeFileEnsured(wfPath, body, dryRun);
}

function parseArgs(argv: string[]): {
  from: string;
  dryRun: boolean;
  force: boolean;
  skipInstall: boolean;
  help: boolean;
} {
  let from = DEFAULT_BLUEPRINT;
  let dryRun = false;
  let force = false;
  let skipInstall = false;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--force") force = true;
    else if (a === "--skip-install") skipInstall = true;
    else if (a === "--from") {
      const p = argv[++i];
      if (!p) throw new Error("--from needs path");
      from = path.resolve(REPO_ROOT, p);
    }
  }
  return { from, dryRun, force, skipInstall, help };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let opts: ReturnType<typeof parseArgs>;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }
  if (opts.help) {
    console.log(`app:scaffold — generate apps/<slug>-instance + apps/<slug>-api from blueprint JSON.

  npm run app:scaffold
  npm run app:scaffold -- --from configs/app.blueprint.json
  npm run app:scaffold -- --force --dry-run
  npm run app:scaffold -- --skip-install

Flags:
  --from <path>   Blueprint JSON (default: configs/app.blueprint.json)
  --force         Replace existing app folders
  --dry-run       Print actions only
  --skip-install  Do not run npm install at repo root after merge
`);
    return;
  }

  const bp = await loadBlueprintFromPath(opts.from);
  assertScaffoldSupported(bp);

  const slug = bp.appSlug;
  const instRel = path.join("apps", `${slug}-instance`);
  const apiRel = path.join("apps", `${slug}-api`);
  const instDir = path.join(REPO_ROOT, instRel);
  const apiDir = path.join(REPO_ROOT, apiRel);

  const existsInst = await pathExists(instDir);
  const existsApi = await pathExists(apiDir);
  if ((existsInst || existsApi) && !opts.force && !opts.dryRun) {
    console.error(`Refusing to overwrite ${instRel} / ${apiRel}. Pass --force or remove folders.`);
    process.exitCode = 1;
    return;
  }

  if (opts.force && !opts.dryRun) {
    if (existsInst) await rmrf(instDir, false);
    if (existsApi) await rmrf(apiDir, false);
  }

  if (bp.database !== "sqlite-file") {
    console.warn(
      `[scaffold] Primary DB in blueprint is "${bp.database}" — API still uses SQLite file for todos dev. Migrate DB in follow-up tasks.`,
    );
  }

  await scaffoldFrontend(slug, bp, instDir, opts.dryRun);
  await scaffoldApi(slug, bp, apiDir, opts.dryRun);
  await scaffoldCompose(instDir, bp, opts.dryRun);
  await scaffoldDockerFromBlueprint(slug, bp, opts.dryRun);
  await scaffoldGithubWorkflow(slug, bp, opts.dryRun);
  await mergeRootWorkspaces([instRel, apiRel], opts.dryRun);

  if (!opts.dryRun && !opts.skipInstall) {
    console.log("\nRunning npm install at repo root (workspaces)…");
    try {
      execSync("npm install", { cwd: REPO_ROOT, stdio: "inherit" });
    } catch {
      console.warn("npm install failed — run manually from repo root.");
    }
  }

  console.log(`
Done.
  • Frontend: ${instRel}
  • API:      ${apiRel}
  • Docker:   docker/compose.generated.yaml + node env in docker/compose.yaml (blueprint)
Run API:   cd apps/${slug}-api && npm run dev
Run Web:   cd apps/${slug}-instance && npm run dev
Infra:     docker compose -f docker/compose.yaml --profile infra up -d
`);
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
