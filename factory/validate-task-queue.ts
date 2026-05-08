import { loadTaskQueue, type FactoryTask } from "./task-graph.js";

function isNumericString(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

async function main(): Promise<void> {
  const tasks = await loadTaskQueue();

  const invalidPhase = (tasks as FactoryTask[])
    .filter((t) => typeof t.phase === "string" && t.phase.length > 0)
    .filter((t) => !isNumericString(t.phase!))
    .map((t) => ({ id: t.id, phase: t.phase }));

  if (invalidPhase.length > 0) {
    const lines = invalidPhase.map((t) => `- ${t.id}: phase=${JSON.stringify(t.phase)}`);
    throw new Error(
      [
        "Invalid task phase values (must be numeric strings like \"3\", \"4\", \"5\"):",
        ...lines,
      ].join("\n"),
    );
  }

  console.log("OK — task-queue phase values are numeric strings.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

