import {
  type FactoryTask,
  assertQueueIntegrity,
  isTaskDone,
  normalizeTaskStatus,
} from "./task-graph.js";

export type PlanNextKind = "suggest" | "wip_full" | "empty" | "all_done";

export type PlanNextResult =
  | {
      kind: "suggest";
      task: FactoryTask;
      wip: { current: number; cap: number };
    }
  | {
      kind: "wip_full";
      inProgress: FactoryTask[];
      wip: { current: number; cap: number };
    }
  | { kind: "empty"; message: string }
  | { kind: "all_done"; message: string };

function isStartable(task: FactoryTask, byId: Map<string, FactoryTask>): boolean {
  const st = normalizeTaskStatus(task);
  if (st === "done" || st === "blocked" || st === "in_progress") {
    return false;
  }
  for (const depId of task.depends_on ?? []) {
    const dep = byId.get(depId);
    if (!dep) {
      return false;
    }
    if (!isTaskDone(dep)) {
      return false;
    }
  }
  return true;
}

/**
 * Picks at most one task to pull next: dependency-ready, not blocked/done/in_progress,
 * respecting a WIP cap on concurrent `in_progress` tasks.
 */
export function planNext(tasks: FactoryTask[], wipCap: number): PlanNextResult {
  assertQueueIntegrity(tasks);
  for (const t of tasks) {
    normalizeTaskStatus(t);
  }

  if (tasks.length === 0) {
    return { kind: "empty", message: "No tasks in factory/task-queue.json." };
  }

  if (tasks.every((t) => isTaskDone(t))) {
    return { kind: "all_done", message: "Every task is marked done." };
  }

  const inProgress = tasks.filter((t) => normalizeTaskStatus(t) === "in_progress");
  if (inProgress.length >= wipCap) {
    return {
      kind: "wip_full",
      inProgress,
      wip: { current: inProgress.length, cap: wipCap },
    };
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const startable = tasks
    .filter((t) => isStartable(t, byId))
    .sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pb !== pa) {
        return pb - pa;
      }
      return a.id.localeCompare(b.id);
    });

  if (startable.length === 0) {
    return {
      kind: "empty",
      message:
        "No startable task (all remaining work is blocked, in progress, or waiting on incomplete dependencies).",
    };
  }

  return {
    kind: "suggest",
    task: startable[0]!,
    wip: { current: inProgress.length, cap: wipCap },
  };
}

export function devAgentPromptLine(task: FactoryTask): string {
  return (
    `For this message only, follow the role in @agents/dev-agent.md. ` +
    `Implement only task id \`${task.id}\`. Branch \`feature/${task.id}\`.`
  );
}

type AgentRoleId =
  | "pm"
  | "architect"
  | "dev"
  | "quality"
  | "fix"
  | "git"
  | "devops"
  | "docs"
  | "security"
  | "finops"
  | "support"
  | "tooling"
  | "spike"
  | "spec-generator"
  | "builder";

function agentFileForRole(role: AgentRoleId): string {
  if (role === "spec-generator") return "spec-generator-agent.md";
  return `${role}-agent.md`;
}

function roleAwarePrimaryAgent(task: FactoryTask): AgentRoleId {
  const r = (task as any).assigned_agent;
  if (typeof r === "string" && r.length > 0) {
    // assigned_agent is validated by validate-task-queue against the registry keys
    return r as AgentRoleId;
  }
  return "dev";
}

export function nextAgentPromptLine(task: FactoryTask): string {
  const role = roleAwarePrimaryAgent(task);
  const agentFile = agentFileForRole(role);

  // Keep branch guidance for roles that typically change the repo.
  const includeBranch =
    role === "dev" ||
    role === "tooling" ||
    role === "fix" ||
    role === "devops" ||
    role === "docs" ||
    role === "builder";

  const branchSuffix = includeBranch ? ` Branch \`feature/${task.id}\`.` : "";

  return (
    `For this message only, follow the role in @agents/${agentFile}. ` +
    `Implement only task id \`${task.id}\`.` +
    branchSuffix
  );
}

export function qualityAgentPromptLine(task: FactoryTask): string {
  return (
    `For this message only, follow the role in @agents/quality-agent.md. ` +
    `For task \`${task.id}\`: align local/CI test harness (fixtures, env, mocks, seeds) as needed; then run build/tests and output pass/fail JSON per the agent.`
  );
}

export function planNextToJson(result: PlanNextResult): Record<string, unknown> {
  if (result.kind === "suggest") {
    const primaryRole = roleAwarePrimaryAgent(result.task);
    const includeQuality = primaryRole === "dev" || primaryRole === "tooling" || primaryRole === "fix" || primaryRole === "devops";
    return {
      kind: result.kind,
      task: result.task,
      wip: result.wip,
      nextAgentRole: primaryRole,
      nextAgentInvocation: nextAgentPromptLine(result.task),
      // Back-compat fields for existing consumers (and common product flow).
      devAgentInvocation: devAgentPromptLine(result.task),
      qualityAgentInvocation: includeQuality ? qualityAgentPromptLine(result.task) : undefined,
    };
  }
  if (result.kind === "wip_full") {
    return {
      kind: result.kind,
      wip: result.wip,
      inProgress: result.inProgress.map((t) => ({ id: t.id, title: t.title, owner: t.owner })),
      message: `WIP limit reached (${result.wip.current}/${result.wip.cap}). Finish or clear in_progress tasks before pulling new work.`,
    };
  }
  return { kind: result.kind, message: result.message };
}
