import { createBackendApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 5175);

async function main(): Promise<void> {
  const { app } = createBackendApp();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[todo-instance] backend listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[todo-instance] API health: http://localhost:${PORT}/api/health`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

