import { loadTaskQueue, normalizeTaskStatus, type FactoryTask } from "./task-graph.js";
import registry from "./agent-registry.json" with { type: "json" };
import path from "node:path";

function isNumericString(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function assertNoDuplicateIds(tasks: FactoryTask[]): void {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const t of tasks) {
    if (seen.has(t.id)) {
      dups.push(t.id);
    }
    seen.add(t.id);
  }
  if (dups.length > 0) {
    throw new Error(`Duplicate task ids in task-queue.json: ${[...new Set(dups)].join(", ")}`);
  }
}

function assertNoSelfDependencies(tasks: FactoryTask[]): void {
  const bad = tasks.filter((t) => (t.depends_on ?? []).includes(t.id)).map((t) => t.id);
  if (bad.length > 0) {
    throw new Error(`Tasks with self-dependency: ${bad.join(", ")}`);
  }
}

function assertNoCycles(tasks: FactoryTask[]): void {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string, stack: string[]): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const startIdx = stack.indexOf(id);
      const cycle = [...stack.slice(startIdx), id].join(" -> ");
      throw new Error(`Circular dependency detected in task-queue.json: ${cycle}`);
    }
    visiting.add(id);
    const t = byId.get(id);
    if (t) {
      for (const dep of t.depends_on ?? []) {
        dfs(dep, [...stack, id]);
      }
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const t of tasks) {
    dfs(t.id, []);
  }
}

function assertBlockedHasReason(tasks: FactoryTask[]): void {
  const bad = tasks
    .filter((t) => normalizeTaskStatus(t) === "blocked")
    .filter((t) => !isNonEmptyString(t.blocked_reason))
    .map((t) => t.id);
  if (bad.length > 0) {
    throw new Error(`Blocked tasks missing blocked_reason: ${bad.join(", ")}`);
  }
}

function assertAssignedAgentIsKnown(tasks: FactoryTask[]): void {
  const valid = new Set(Object.keys(registry.agents ?? {}));
  const bad = tasks
    .filter((t) => typeof (t as any).assigned_agent === "string" && (t as any).assigned_agent.length > 0)
    .filter((t) => !valid.has(String((t as any).assigned_agent)))
    .map((t) => ({ id: t.id, assigned_agent: String((t as any).assigned_agent) }));

  if (bad.length > 0) {
    const lines = bad.map((b) => `- ${b.id}: assigned_agent=${JSON.stringify(b.assigned_agent)}`);
    throw new Error(
      ["Invalid assigned_agent values (must be a role id from factory/agent-registry.json):", ...lines].join("\n"),
    );
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const queueArg = argv.find((a) => a.startsWith("--queue="));
  const queuePath = queueArg ? path.resolve(queueArg.slice("--queue=".length)) : undefined;

  const tasks = queuePath !== undefined ? await loadTaskQueue(queuePath) : await loadTaskQueue();

  assertNoDuplicateIds(tasks);
  // Unknown dependency ids are rejected by task-graph.ts (assertQueueIntegrity), but we also enforce:
  assertNoSelfDependencies(tasks);
  assertNoCycles(tasks);
  assertBlockedHasReason(tasks);
  assertAssignedAgentIsKnown(tasks);

  // Validate status enum (and defaulting behavior) via normalizeTaskStatus:
  tasks.forEach((t) => normalizeTaskStatus(t));

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

  console.log("OK — task queue validates (ids, deps, status, blocked_reason, assigned_agent, phase).");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

