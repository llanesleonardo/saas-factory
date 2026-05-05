/**
 * CLI or script entry: load queue, run orchestrator.
 */
import { runOrchestrator } from "./orchestrator.js";

void runOrchestrator().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
