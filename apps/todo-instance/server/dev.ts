import { createServer as createViteServer } from "vite";
import { createServerApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 5174);

async function main(): Promise<void> {
  const { app } = createServerApp();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[todo-instance] dev server listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[todo-instance] API health:        http://localhost:${PORT}/api/health`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

