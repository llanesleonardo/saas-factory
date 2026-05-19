/**
 * Queue/Jobs tree (cross-cutting capability layer).
 *
 * Outputs requirements that backend/infra can consume.
 */
import { checkbox, select } from "@inquirer/prompts";

export type JobSystemType = "none" | "in-memory-queue" | "redis-queue" | "managed-queue" | "workflow-engine";

export type JobPattern = "cron-only" | "background-jobs" | "event-driven-jobs" | "retry-heavy-workflows";

export type JobReliability = "best-effort" | "at-least-once" | "exactly-once-advanced";

export type JobsRequirements = {
  needsJobQueue: boolean;
  needsWorkerSystem: boolean;
  needsRetrySystem: boolean;
  needsEventBus: boolean;
};

export type JobsDetail = {
  systemType: JobSystemType;
  patterns: JobPattern[];
  reliability: JobReliability;
  requirements: JobsRequirements;
};

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

function deriveJobsRequirements(d: Omit<JobsDetail, "requirements">): JobsRequirements {
  const needsJobQueue = d.systemType !== "none";
  const needsWorkerSystem = d.systemType !== "none";
  const needsRetrySystem = d.patterns.includes("retry-heavy-workflows") || d.reliability !== "best-effort";
  const needsEventBus = d.patterns.includes("event-driven-jobs") || d.systemType === "workflow-engine";
  return { needsJobQueue, needsWorkerSystem, needsRetrySystem, needsEventBus };
}

export async function promptJobsTree(opts: { depth: "easy" | "advanced"; required?: boolean }): Promise<{ jobsDetail?: JobsDetail }> {
  const systemType = await pick<JobSystemType>("Jobs · 1 Job system type", [
    { value: "none", label: "None" },
    { value: "in-memory-queue", label: "In-memory queue" },
    { value: "redis-queue", label: "Redis queue" },
    { value: "managed-queue", label: "Managed queue (SQS/Cloud Tasks/etc.)" },
    { value: "workflow-engine", label: "Workflow engine (Temporal)" },
  ]);

  if (systemType === "none" && !opts.required) return {};

  const patterns =
    opts.depth === "easy"
      ? (["background-jobs"] as JobPattern[])
      : ((await checkbox({
          message: "Jobs · 2 Job patterns",
          choices: [
            { value: "cron-only", name: "Cron only", checked: false },
            { value: "background-jobs", name: "Background jobs", checked: true },
            { value: "event-driven-jobs", name: "Event-driven jobs", checked: false },
            { value: "retry-heavy-workflows", name: "Retry-heavy workflows", checked: false },
          ],
        })) as JobPattern[]);

  const reliability =
    opts.depth === "easy"
      ? ("at-least-once" as const)
      : await pick<JobReliability>("Jobs · 3 Reliability", [
          { value: "best-effort", label: "Best effort" },
          { value: "at-least-once", label: "At least once" },
          { value: "exactly-once-advanced", label: "Exactly once (advanced)" },
        ]);

  const base = { systemType, patterns, reliability };
  const requirements = deriveJobsRequirements(base);
  return { jobsDetail: { ...base, requirements } };
}

export function isValidJobsDetail(x: unknown): x is JobsDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.systemType !== "string") return false;
  if (!Array.isArray(o.patterns)) return false;
  if (typeof o.reliability !== "string") return false;
  if (o.requirements === null || typeof o.requirements !== "object" || Array.isArray(o.requirements)) return false;
  return true;
}
