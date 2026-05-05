/* Generated — todoapp-api (Express + SQLite) */
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import Database from "better-sqlite3";

dotenv.config();

import { createClient } from "redis";
let redisOk = false;
const redis = createClient({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" });
redis.on("error", () => {
  redisOk = false;
});

const PORT = Number(process.env.PORT ?? 4000);
const DB_PATH = process.env.DATABASE_PATH ?? path.join(__dirname, "..", "data", "todos.db");

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));


void (async () => {
  try {
    await redis.connect();
    redisOk = true;
    console.log("Redis connected");
  } catch (e) {
    console.warn("Redis unavailable — sessions/cache features degraded", e);
  }
})();


const db = new Database(DB_PATH);
db.exec(`
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    redis: (redisOk ? "up" : "down"),
    db: "sqlite",
    blueprintIntegration: "standalone",
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
  console.log(`todoapp-api listening on http://localhost:${PORT}`);
});
