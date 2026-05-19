/**
 * Manufacturing CLI — one entrypoint for factory scripts.
 *
 *   npm run mfg -- help
 *   npm run mfg -- app bn -- myslug
 *   npm run mfg -- app verified
 *   npm run mfg -- app quote -- myslug
 *   npm run mfg -- so -- myslug
 *   npm run mfg -- wo -- <orderId>
 *   npm run mfg -- order schedule <orderId> --start 2026-06-01
 *   npm run mfg -- order lifecycle <orderId> set scheduled
 *   npm run mfg -- app bdphase -- <orderId> | app bdtask -- <orderId> <phaseId> | app build-tasks -- <orderId>
 *   npm run mfg -- order phases <orderId> init|breakdown …
 *   npm run mfg -- app stack -- myslug
 *   npm run mfg -- validate apps
 *   npm run mfg -- line queue | line next -- --json | line done
 *   npm run mfg -- sprint init <orderId> <productId> [--title …]
 *   npm run mfg -- sprint board <orderId> <productId> | sprint task prompt <taskId>
 *   npm run mfg -- trace build <orderId> | trace order <orderId>
 *   npm run mfg -- gates review <orderId> <productId> [--run]
 *   npm run mfg -- deploy preview | staging | prod [-- …]
 *   npm run mfg -- telemetry report | assembly-line [--day YYYY-MM-DD]
 *   npm run mfg -- kaizen new | summary [--day YYYY-MM-DD] [--json]
 *   npm run mfg -- metrics collect [--day YYYY-MM-DD] [--probe-cli] [--from-probes-only]
 *   npm run mfg -- pipeline run -- <slug> [--force] [--no-{deploy,kaizen,metrics,verified}]
 *   npm run mfg -- pipeline plan -- <slug>
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendAssemblyLineEventSync,
  inferWorkstationFromScriptPath,
  newAssemblyLineCorrelationId,
} from "../03_assembly_lines/07-telemetry/assembly-line-log.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const V = "factory/03_assembly_lines/06-gates/validation";
const G = "factory/03_assembly_lines/06-gates/gates";
const S = "factory/03_assembly_lines/04-scaffold";
const R = "factory/01_production_planning/01_03_task-registry";
const C = "factory/factory_cli";
const D = "factory/03_assembly_lines/08-delivery";
const P = "factory/01_production_planning/01_00_work_orders";
const SPR = "factory/03_assembly_lines/05-sprints";
const TR = "factory/08_traceability";

function runTsx(relFromRepoRoot: string, args: string[] = []): number {
  const workstation = inferWorkstationFromScriptPath(relFromRepoRoot);
  const correlationId = newAssemblyLineCorrelationId();
  const mfgArgvTail = process.argv.slice(2, 14);
  const ts = new Date().toISOString();
  appendAssemblyLineEventSync(REPO_ROOT, {
    schema_version: 1,
    event_kind: "cli_dispatch_start",
    timestamp_utc: ts,
    workstation,
    source: "mfg_dispatch",
    correlation_id: correlationId,
    script: relFromRepoRoot,
    script_args: args.length ? args : undefined,
    command: `npx tsx ${relFromRepoRoot}${args.length ? " " + args.join(" ") : ""}`,
    mfg_argv_tail: mfgArgvTail,
  });
  const t0 = Date.now();
  const r = spawnSync("npx", ["tsx", relFromRepoRoot, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  const code = r.status ?? 1;
  appendAssemblyLineEventSync(REPO_ROOT, {
    schema_version: 1,
    event_kind: "cli_dispatch_end",
    timestamp_utc: new Date().toISOString(),
    workstation,
    source: "mfg_dispatch",
    correlation_id: correlationId,
    script: relFromRepoRoot,
    script_args: args.length ? args : undefined,
    command: `npx tsx ${relFromRepoRoot}${args.length ? " " + args.join(" ") : ""}`,
    duration_ms: Date.now() - t0,
    exit_code: code,
    outcome: code === 0 ? "pass" : "fail",
    mfg_argv_tail: mfgArgvTail,
    ...(code !== 0
      ? { error: { message: `tsx exited with code ${code}`, name: "CliExitError" } }
      : {}),
  });
  return code;
}

/** Strip ignored legacy `--local` (app gates always run local `tsx`, never Docker). */
function stripIgnoredLocal(argv: string[]): string[] {
  return argv.filter((a) => a !== "--local");
}

/** Supports both `mfg so todo` and `mfg so -- todo` (same pattern as `spec <slug>`). */
function forwardOneShotArgs(a1: string | undefined, tail: string[]): string[] {
  if (a1 === "--") return stripIgnoredLocal(tail);
  return stripIgnoredLocal([...(a1 ? [a1] : []), ...tail]);
}

/** Same bundle as `.github/workflows/factory-parallel-ci.yml` validators job (minus root `check` / `validate apps`). */
const FACTORY_VALIDATORS: { name: string; script: string }[] = [
  { name: "task-queue", script: `${V}/validate-task-queue.ts` },
  { name: "agent-registry", script: `${V}/validate-agent-registry.ts` },
  { name: "workflow-machine", script: `${V}/validate-workflow-machine.ts` },
  { name: "tool-registry", script: `${V}/validate-tool-registry.ts` },
  { name: "task-queue-fixtures", script: `${V}/validate-task-queue-fixtures.ts` },
  { name: "agent-output-fixtures", script: `${V}/validate-agent-output-fixtures.ts` },
  { name: "qms-inbox", script: `${V}/validate-qms-inbox.ts` },
  { name: "qms-inbox-fixtures", script: `${V}/validate-qms-inbox-fixtures.ts` },
  { name: "self-heal-fixtures", script: `${V}/validate-self-heal-fixtures.ts` },
];

function printHelp(): void {
  console.log(`SaaS Factory — manufacturing CLI

Usage:
  npm run mfg -- <domain> <action> [options...]
  npm run mfg -- help

Apps (one-shot checks)
  validate apps                   brief validate + stack validate --all

App (TTY wizards; local tsx only — no Docker)
  app new [-- …]                New app — vertical brief → configs/apps/<slug>/<slug>.json
  app bn [-- …]                 Business needs bundle → configs/apps/<slug>/business-needs.json
  app saas [-- …]              SaaS baseline + alignment (brief + stack + business-needs)
  app quote [-- …]            Quote bundle (configs + SaaS check + verified vs first-manufacture)
  app verified [-- …]          Verified manufacturing registry (list | add | remove)
  app stack [-- …]             Stack wizard → configs/apps/<slug>/app.stack.json
  app negotiate [-- …]           Brief ↔ stack negotiation
  app scaffold [-- …]           Scaffold from app.stack.json
  app bdphase [-- …]           Bootstrap order phases → 01_02_phase_registry/<orderId>/order-phases.json
                               (falls back to a built-in 6-phase SaaS template when no phase-queue/PHASES.md exists)
  app bdtask [-- …]            Proposed tasks for ONE epic → 01_03_task-registry/<orderId>/phase-breakdown-*.json
                               (kept as the human-review path; does not auto-merge into task-queue.json)
  app build-tasks [-- …]       Break ALL phases into tasks + auto-merge into task-queue.json (pipeline default)
                               flags: --no-merge | --dry-run | --json
  app purge [-- …]             Remove ALL factory artifacts for one or more slugs (cleanup partner of pipeline run)

Stack
  stack validate [...]            Validate app.stack.json (pass slug or -- --all)

Spec
  spec <slug>                     Shorthand for spec generate
  spec generate <slug>            Spec prompt from vertical brief

Orders
  so [-- …]                       Sales order from quote + client scope → 01_00_work_orders/<id>/
  wo [-- …]                       Confirm sales order → work-order.json
  order validate <orderId>        Validate manifest + write contracts/… + 03-registry/orders/…/workforce-registry.json
  order contracts <orderId>       (Re)write contract + workforce-registry slices (after validate rules)
  order lifecycle <orderId> set <status>   Factory lifecycle + order-events.jsonl audit
  order phases <orderId> init|show|set-status|annotate|breakdown …   Epic roadmap → proposed tasks
  order schedule <orderId> …      Write order-schedule-calendar.json (--start; --end optional; --clear-end)

Sprints (workstation pass-through per order + product)
  sprint init <orderId> <productId> [--number N] [--title "…"] [--goal "…"]
  sprint list <orderId> <productId>
  sprint show <orderId> <productId> <sprintNumber>
  sprint board <orderId> <productId> [--sprint N] [--no-write] [--json]
                                  Tasks-for-this-sprint grouped by phase + workstation;
                                  auto-syncs workstation rows from task-queue.json.
  sprint task prompt <taskId> [--sprint N] [--no-write]
                                  Build the agent handoff prompt for one task; writes
                                  sprint-NNN/prompts/<taskId>.md + prints to stdout.
  sprint workstation <orderId> <productId> <n> <workstationId> <status> [--notes "…"]
                                  Manual flip (edge cases; normally 'sprint board' syncs from the queue).
  sprint summary <orderId> <productId> <sprintNumber>   # refresh summary text from workstation rows

Traceability (derived order-level index; never hand-edited)
  trace build <orderId> [--product <id>] [--json]
  trace build --all                       Rebuild every order's index file at factory/08_traceability/orders/
  trace order <orderId> [--rebuild] [--json] [--events N]
                                          Print the chain: phases → tasks → sprints → prompts → telemetry

Gates (delivery — tasks, tests, contract vs sprint, app code)
  gates review <orderId> <productId> [--sprint N] [--run]   # checklist; --run runs stack validate for product

Pipeline (whole-app factory runner — agents focus on the app, this drives the factory)
  pipeline run -- <slug> [options]   Run the whole pipeline end-to-end for one app
                                     (sales → planning → assembly line → kaizen → metrics → verified).
                                     Options: --force, --no-{deploy,kaizen,metrics,verified},
                                              --skip <id>, --only <id>, --from <id>, --to <id>,
                                              --reason / --sprint-title / --sprint-goal / --order-id,
                                              --continue-on-failure, --dry-run, --json
  pipeline plan -- <slug> [options]  Print the plan; don't execute (alias for run --plan)
  pipeline order                     validate apps + example shop order (example-order-001)

Deploy (preview → staging → prod)
  deploy preview [-- …]          Visual / smoke tier (local or dev slot; see 08-delivery/deploy.ts --help)
  deploy staging [-- …]        Thorough test tier; clean main required; can stop here
  deploy prod [-- …]             Production tier; clean main + gates (same flags as line deploy)

Telemetry (developers — evidence under factory/telemetry/, gitignored)
  telemetry [--help]              Show subcommands
  telemetry report [--day YYYY-MM-DD] [--app <filter>]   Counts from run-history JSONL
  telemetry assembly-line [--day YYYY-MM-DD]            Counts from assembly-line JSONL (all stations + errors)
  Examples: npm run mfg -- telemetry report | npm run mfg -- telemetry assembly-line

Kaizen (continuous improvement — factory/04_kaizen/)
  kaizen new [--slug <id>] [--title "…"] [--force]   Backlog item from template
  kaizen summary [--day YYYY-MM-DD] [--top N] [--json]  Digest assembly-line + run-history JSONL

Metrics (factory pulse — factory/05_metrics/)
  metrics collect [--day YYYY-MM-DD] [--probe-cli] [--from-probes-only|--yes]  Interactive snapshot → snapshots/factory-metrics-<day>/metrics.json

Line (task board & ops)
  line orchestrate […]            Human runbook (task-queue.json)
  line run […]                    Run single task helper
  line queue […]                  Remaining work (not status=done); dependency order; --json, --queue=
  line next […]                   Next task for the line to pull (planner: deps + priority + WIP cap)
  line done […]                   Tasks already finished (status=done); --json, --queue=
  line status […]
  line deploy [-- …]             Same as deploy <tier> via --env preview|staging|prod
  line time […]
  line telemetry […]             report | assembly-line (run + line logs)
  line kaizen […]                 same as: kaizen new | summary (pass-through)
  line metrics collect […]        same as: metrics collect (pass-through)
  line self-heal […]

Deep validation (registry / fixtures — CI)
  validate factory              Run all factory validators below
  validate all                  validate apps + validate factory
  validate <name>               One of: ${FACTORY_VALIDATORS.map((x) => x.name).join(", ")}

Repo root: ${REPO_ROOT}
`);
}

function validateApps(): number {
  let code = runTsx(`${V}/validate-vertical-config.ts`);
  if (code !== 0) return code;
  code = runTsx(`${V}/validate-app-stack.ts`, ["--all"]);
  return code;
}

function validateFactoryBatch(): number {
  for (const { name, script } of FACTORY_VALIDATORS) {
    const code = runTsx(script);
    if (code !== 0) {
      console.error(`mfg validate factory: failed at ${name}`);
      return code;
    }
  }
  return 0;
}

function validateOne(name: string): number {
  const hit = FACTORY_VALIDATORS.find((x) => x.name === name);
  if (!hit) {
    console.error(`Unknown validator "${name}". Try: mfg validate factory`);
    return 1;
  }
  return runTsx(hit.script);
}

function main(): number {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    return 0;
  }

  const [a0, a1, ...tail] = argv;

  if (a0 === "so") {
    return runTsx(`${P}/sales-order-create.ts`, forwardOneShotArgs(a1, tail));
  }

  if (a0 === "wo") {
    return runTsx(`${P}/work-order-open.ts`, forwardOneShotArgs(a1, tail));
  }

  if (a0 === "stack") {
    if (a1 === "validate") return runTsx(`${V}/validate-app-stack.ts`, tail);
    console.error('mfg stack: use "validate"');
    return 1;
  }

  if (a0 === "validate") {
    if (a1 === "apps") return validateApps();
    if (a1 === "factory") return validateFactoryBatch();
    if (a1 === "all") {
      let c = validateApps();
      if (c !== 0) return c;
      return validateFactoryBatch();
    }
    if (a1) return validateOne(a1);
    console.error('mfg validate: use "apps", "factory", "all", or a validator name');
    return 1;
  }

  if (a0 === "app") {
    if (
      a1 === "new" ||
      a1 === "bn" ||
      a1 === "saas" ||
      a1 === "quote" ||
      a1 === "verified" ||
      a1 === "stack" ||
      a1 === "negotiate" ||
      a1 === "scaffold" ||
      a1 === "bdphase" ||
      a1 === "bdtask" ||
      a1 === "build-tasks" ||
      a1 === "purge"
    ) {
      const fwd = stripIgnoredLocal(tail);
      if (a1 === "new") return runTsx(`${G}/new-vertical-config.ts`, fwd);
      if (a1 === "bn") return runTsx(`${G}/app-business-needs.ts`, fwd);
      if (a1 === "saas") return runTsx(`${G}/app-saas-align.ts`, fwd);
      if (a1 === "quote") return runTsx(`${G}/app-quote.ts`, fwd);
      if (a1 === "verified") return runTsx(`${G}/app-verified.ts`, fwd);
      if (a1 === "stack") return runTsx(`${G}/app-blueprint-config.ts`, fwd);
      if (a1 === "scaffold") return runTsx(`${S}/app-scaffold.ts`, fwd);
      if (a1 === "bdphase") return runTsx(`${G}/app-bdphase.ts`, fwd);
      if (a1 === "bdtask") return runTsx(`${G}/app-bdtask.ts`, fwd);
      if (a1 === "build-tasks") return runTsx(`${G}/app-build-tasks.ts`, fwd);
      if (a1 === "purge") return runTsx(`${C}/app-purge.ts`, fwd);
      return runTsx(`${G}/app-negotiate.ts`, fwd);
    }
    console.error(
      'mfg app: use "new", "bn", "saas", "quote", "verified", "stack", "negotiate", "scaffold", "bdphase", "bdtask", "build-tasks", or "purge"',
    );
    return 1;
  }

  if (a0 === "spec") {
    if (!a1) {
      console.error('mfg spec: pass <slug> or use "generate <slug>"');
      return 1;
    }
    if (a1 === "generate") {
      if (!tail[0]) {
        console.error('mfg spec generate: pass <slug>, e.g. npm run mfg -- spec generate todo');
        return 1;
      }
      return runTsx(`${G}/generate-spec.ts`, tail);
    }
    return runTsx(`${G}/generate-spec.ts`, [a1, ...tail]);
  }

  if (a0 === "order") {
    if (a1 === "validate") {
      const orderId = tail[0];
      if (!orderId) {
        console.error('mfg order validate: pass <order-id>, e.g. npm run mfg -- order validate example-order-001');
        return 1;
      }
      return runTsx(`${P}/order-validate.ts`, tail);
    }
    if (a1 === "contracts") {
      const orderId = tail[0];
      if (!orderId) {
        console.error('mfg order contracts: pass <order-id>, e.g. npm run mfg -- order contracts example-order-001');
        return 1;
      }
      return runTsx(`${P}/order-contracts.ts`, tail);
    }
    if (a1 === "lifecycle") {
      return runTsx(`${P}/order-lifecycle.ts`, stripIgnoredLocal(tail));
    }
    if (a1 === "phases") {
      return runTsx(`${P}/order-phases.ts`, stripIgnoredLocal(tail));
    }
    if (a1 === "schedule") {
      if (!tail.length) {
        console.error(
          'mfg order schedule: pass <order-id> and --start <date>, e.g. npm run mfg -- order schedule example-order-001 --start 2026-06-01',
        );
        return 1;
      }
      return runTsx(`${P}/order-schedule.ts`, stripIgnoredLocal(tail));
    }
    console.error(
      'mfg order: use "validate", "contracts", "lifecycle …", "phases …", or "schedule <order-id> --start <ISO> [--end <ISO>] ..."',
    );
    return 1;
  }

  if (a0 === "sprint") {
    if (a1 === "board") {
      return runTsx(`${SPR}/sprint-board.ts`, stripIgnoredLocal(tail));
    }
    if (a1 === "task") {
      const a2 = tail[0];
      const rest = tail.slice(1);
      if (a2 === "prompt") {
        return runTsx(`${SPR}/sprint-prompt.ts`, stripIgnoredLocal(rest));
      }
      console.error('mfg sprint task: use "prompt <taskId>" (next/done are not implemented yet — use `sprint board` and `line done`).');
      return 1;
    }
    return runTsx(`${SPR}/sprint-record.ts`, stripIgnoredLocal([a1, ...tail]));
  }

  if (a0 === "trace") {
    if (a1 === "build") {
      return runTsx(`${TR}/trace-build.ts`, stripIgnoredLocal(tail));
    }
    if (a1 === "order") {
      return runTsx(`${TR}/trace-order.ts`, stripIgnoredLocal(tail));
    }
    console.error(
      'mfg trace: use "build <orderId> [--all] [--product <id>] [--json]" or "order <orderId> [--rebuild] [--json] [--events N]".',
    );
    return 1;
  }

  if (a0 === "gates") {
    if (a1 === "review") return runTsx(`${G}/delivery-review.ts`, stripIgnoredLocal(tail));
    console.error('mfg gates: use "review <orderId> <productId> [--sprint N] [--run]"');
    return 1;
  }

  if (a0 === "deploy") {
    if (a1 === "preview" || a1 === "staging" || a1 === "prod") {
      return runTsx(`${D}/deploy.ts`, ["--env", a1, ...stripIgnoredLocal(tail)]);
    }
    console.error('mfg deploy: use "preview", "staging", or "prod"');
    console.error("  npm run mfg -- deploy preview   # visual / smoke tier");
    console.error("  npm run mfg -- deploy staging  # thorough test tier (clean main)");
    console.error("  npm run mfg -- deploy prod     # production tier (clean main)");
    console.error('  Same flags as: npm run mfg -- line deploy -- --env <tier> […]');
    return 1;
  }

  if (a0 === "pipeline") {
    if (a1 === "order") {
      let c = validateApps();
      if (c !== 0) return c;
      return runTsx(`${P}/order-validate.ts`, ["example-order-001"]);
    }
    if (a1 === "run" || a1 === "plan") {
      const fwd = stripIgnoredLocal(tail);
      // `pipeline plan` is sugar for `pipeline run … --plan`.
      const extra = a1 === "plan" && !fwd.includes("--plan") ? ["--plan"] : [];
      return runTsx(`${C}/pipeline-run.ts`, [...fwd, ...extra]);
    }
    console.error('mfg pipeline: use "run", "plan", or "order"');
    return 1;
  }

  if (a0 === "telemetry") {
    const fwd = forwardOneShotArgs(a1, tail);
    return runTsx(`${C}/telemetry-cli.ts`, fwd);
  }

  if (a0 === "kaizen") {
    const fwd = forwardOneShotArgs(a1, tail);
    return runTsx("factory/04_kaizen/kaizen-cli.ts", fwd);
  }

  if (a0 === "metrics") {
    if (a1 === "collect") return runTsx("factory/05_metrics/collect-metrics.ts", ["collect", ...stripIgnoredLocal(tail)]);
    console.error('mfg metrics: use "collect" (see npm run mfg -- metrics collect --help)');
    return 1;
  }

  if (a0 === "line") {
    const table: Record<string, string> = {
      orchestrate: `${R}/orchestrator.ts`,
      run: `${R}/run-task.ts`,
      queue: `${C}/line-queue.ts`,
      next: `${C}/line-next.ts`,
      done: `${C}/line-done.ts`,
      status: `${C}/status.ts`,
      deploy: `${D}/deploy.ts`,
      kaizen: `factory/04_kaizen/kaizen-cli.ts`,
      metrics: `factory/05_metrics/collect-metrics.ts`,
      time: `${C}/time-tracker.ts`,
      telemetry: `${C}/telemetry-cli.ts`,
      "self-heal": `${C}/self-heal.ts`,
    };
    const script = table[a1 ?? ""];
    if (!script) {
      console.error(`mfg line: unknown action "${a1 ?? ""}". See mfg help`);
      return 1;
    }
    return runTsx(script, tail);
  }

  console.error(`Unknown command "${a0}". Run: npm run mfg -- help`);
  return 1;
}

process.exit(main());
