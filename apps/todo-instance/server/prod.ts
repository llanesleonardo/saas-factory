import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 5174);

async function main(): Promise<void> {
  const { app } = createServerApp();

  const distDir = path.resolve(__dirname, "..", "dist");
  app.use(express.static(distDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[todo-instance] prod server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

