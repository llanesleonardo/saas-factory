import path from "node:path";
import { pathToFileURL } from "node:url";

import { isTaskDone, loadTaskQueue, orderTasks } from "./task-graph.js";

export type { FactoryTask, TaskStatus } from "./task-graph.js";
export {
  loadTaskQueue,
  orderTasks,
  computeParallelBatches,
  isTaskDone,
  normalizeTaskStatus,
  assertQueueIntegrity,
} from "./task-graph.js";

/**
 * Cursor-native factory: Dev / Quality / Fix / Git agents run in **chat + terminal**, not as
 * in-process AI. This prints the runbook for each task so you can execute steps
 * in Cursor (or later wire @cursor/sdk / CI here).
 */
export async function runOrchestrator(): Promise<void> {
  const tasks = orderTasks(await loadTaskQueue()).filter((t) => !isTaskDone(t));

  if (tasks.length === 0) {
    console.log("No tasks in factory/task-queue.json. Paste PM JSON output there first.");
    return;
  }

  for (const task of tasks) {
    console.log("\n---");
    console.log(`Task ${task.id}: ${task.title}`);
    if (task.depends_on?.length) {
      console.log(`Depends on: ${task.depends_on.join(", ")}`);
    }
    console.log("1. Dev Agent (@agents/dev-agent.md): branch feature/" + task.id + ", implement only this task.");
    console.log(
      "2. Quality Agent (@agents/quality-agent.md): align local/CI harness when needed; npm run build && npm test (add scripts when apps exist); output pass/fail JSON.",
    );
    console.log(
      "3. On fail — if env/harness/fixtures: Quality Agent again (harness focus); else Fix Agent (@agents/fix-agent.md); then Quality Agent again.",
    );
    console.log("4. Git Agent (@agents/git-agent.md): commit, push, open PR with task id in title/body.");
  }

  console.log("\n---\nDone printing plan. Orchestrator does not invoke Cursor agents automatically.");
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void runOrchestrator().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
