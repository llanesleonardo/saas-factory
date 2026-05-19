import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type WorkflowMachine = {
  machine_version: number;
  states: Array<{ id: string; task_queue_status?: string }>;
  transitions: Array<{ from: string; to: string; agents_allowed?: string[] }>;
  task_queue_mapping: Record<string, string[]>;
};

type TaskQueueStatus = "backlog" | "ready" | "in_progress" | "blocked" | "done";

const TASK_STATUSES: readonly TaskQueueStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "done",
] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const machinePath = path.join(
    repoRoot,
    "factory",
    "03_assembly_lines",
    "03-registry",
    "registry",
    "workflow-state-machine.json",
  );
  const raw = await readFile(machinePath, "utf8");
  const machine = JSON.parse(raw) as WorkflowMachine;

  assert(typeof machine.machine_version === "number", "machine_version must be a number");
  assert(Array.isArray(machine.states) && machine.states.length > 0, "states must be a non-empty array");
  assert(
    machine.task_queue_mapping !== null && typeof machine.task_queue_mapping === "object",
    "task_queue_mapping must be an object",
  );

  const stateIds = new Set(machine.states.map((s) => s.id));
  assert(stateIds.size === machine.states.length, "states contain duplicate ids");

  const mappedStatuses = Object.keys(machine.task_queue_mapping);
  for (const st of TASK_STATUSES) {
    assert(mappedStatuses.includes(st), `task_queue_mapping missing status "${st}"`);
  }
  for (const st of mappedStatuses) {
    assert(
      (TASK_STATUSES as readonly string[]).includes(st),
      `task_queue_mapping includes unknown status "${st}"`,
    );
  }

  for (const [status, states] of Object.entries(machine.task_queue_mapping)) {
    assert(Array.isArray(states) && states.length > 0, `task_queue_mapping.${status} must be non-empty array`);
    for (const sid of states) {
      assert(typeof sid === "string" && sid.length > 0, `task_queue_mapping.${status} contains invalid state id`);
      assert(stateIds.has(sid), `task_queue_mapping.${status} references unknown state "${sid}"`);
    }
  }

  // Validate transitions reference existing states
  assert(
    Array.isArray(machine.transitions) && machine.transitions.length > 0,
    "transitions must be a non-empty array",
  );
  for (const tr of machine.transitions) {
    assert(stateIds.has(tr.from), `transition.from references unknown state "${tr.from}"`);
    assert(stateIds.has(tr.to), `transition.to references unknown state "${tr.to}"`);
  }

  console.log("OK — workflow-state-machine.json is internally consistent.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

