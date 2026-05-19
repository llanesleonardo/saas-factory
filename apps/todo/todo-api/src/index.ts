import dotenv from "dotenv";
import cors from "cors";
import express from "express";

dotenv.config();
const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.get("/api/health", (_req, res) => res.json({ ok: true, app: "todo" }));

app.listen(PORT, () => console.log("todo-api (Express) http://localhost:" + PORT));
