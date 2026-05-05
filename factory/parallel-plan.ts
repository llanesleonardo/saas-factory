import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  type FactoryTask,
  computeParallelBatches,
  isTaskDone,
  loadTaskQueue,
} from "./task-graph.js";

export type ParallelPlanJson = {
  waves: { id: string; title: string }[][];
  waveCount: number;
  maxParallelism: number;
};

export async function buildParallelPlan(
  tasks?: FactoryTask[],
): Promise<ParallelPlanJson> {
  const list = tasks ?? (await loadTaskQueue());
  const waves = computeParallelBatches(list).map((batch: FactoryTask[]) =>
    batch.map((t: FactoryTask) => ({ id: t.id, title: t.title })),
  );
  const maxParallelism = waves.reduce(
    (m: number, w: { id: string; title: string }[]) => Math.max(m, w.length),
    0,
  );
  return { waves, waveCount: waves.length, maxParallelism };
}

async function main(): Promise<void> {
  const tasks = await loadTaskQueue();
  const plan = await buildParallelPlan(tasks);
  const asJson = process.argv.includes("--json");

  if (asJson) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (plan.waves.length === 0) {
    if (tasks.length === 0) {
      console.log("No tasks — factory/task-queue.json is empty.");
    } else if (tasks.every((t) => isTaskDone(t))) {
      console.log("All tasks are marked done — nothing left to wave-plan.");
    } else {
      console.log("No waves produced (unexpected). Check task-queue.json.");
    }
    return;
  }

  console.log(`Waves: ${plan.waveCount} (max parallel tasks in one wave: ${plan.maxParallelism})\n`);
  plan.waves.forEach((wave, i) => {
    const ids = wave.map((t) => t.id).join(", ");
    console.log(`Wave ${i}: ${ids}`);
    for (const t of wave) {
      console.log(`  - ${t.id}: ${t.title}`);
    }
    console.log("");
  });
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
