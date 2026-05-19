/**
 * Pipeline runner — execute the whole factory pipeline for one app in one shot.
 *
 * The customer-facing intent: the agent should focus on *the app* (what's inside
 * `apps/<slug>/<slug>-instance/` and `apps/<slug>/<slug>-api/`), not on driving the factory.
 * This script drives the factory.
 *
 * Each step is dispatched as a *real* `mfg` invocation (via
 * `npx tsx factory/factory_cli/mfg.ts …`) so:
 *   • the assembly-line telemetry log captures every step automatically,
 *   • the workstation classification stays consistent with everything else,
 *   • this script never has to duplicate any business logic.
 *
 * Examples:
 *   npm run mfg -- pipeline run -- <slug>
 *   npm run mfg -- pipeline run -- <slug> --force
 *   npm run mfg -- pipeline run -- <slug> --skip kaizen-summary --skip verified-add
 *   npm run mfg -- pipeline run -- <slug> --from scaffold
 *   npm run mfg -- pipeline plan -- <slug>           # print plan, don't run
 *
 * Ordering follows the proposed `factory-pipeline.json` shape (areas →
 * blocks → steps): 00-product-definitions → 01-production-planning
 * (sales-order → work-order → lifecycle → bdphase → build-tasks) →
 * 03-assembly-lines (01-intake → 04-scaffold → 06-gates-validation →
 * 05-sprints → 07-telemetry) → 08-traceability (`trace build` index).
 *
 * **The pipeline stops at sprint hand-off.** Once tasks are in the queue and
 * the sprint folder is initialized, the pipeline runs a final `sprint board`
 * (the `sprint-handoff` step) and exits. From there everything is manual and
 * human-driven:
 *
 *   npm run mfg -- sprint board <orderId> <slug>        # what to work on next
 *   npm run mfg -- sprint task prompt <taskId>          # agent handoff .md
 *   npm run mfg -- line done <taskId>                   # mark task complete
 *   # then re-run sprint board, repeat until all tasks done
 *   npm run mfg -- gates review <orderId> <slug>        # when ready
 *   npm run mfg -- deploy preview -- --dry-run          # opt-in
 *   npm run mfg -- kaizen new/summary, metrics collect, app verified add
 *
 * The old auto-downstream steps (gates review, deploy preview, kaizen,
 * metrics, verified-add) are now OFF by default but available behind
 * `--with-*` flags for legacy automation. `bdphase` synthesizes a 6-phase
 * SaaS default when neither `phase-queue.json` nor `PHASES.md` is present,
 * and `build-tasks` immediately turns each phase into lane-tagged tasks
 * merged into the canonical `task-queue.json`. Use `--no-auto-tasks` if you
 * want the old behavior (phases only, manual task breakdown via
 * `app bdtask -- <orderId> <phaseId>`).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MFG_SCRIPT = "factory/factory_cli/mfg.ts";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

type Outcome = "pass" | "fail" | "skipped" | "not-run";

interface Step {
  /** Stable id; used by --skip / --only / --from / --to. */
  id: string;
  /** Pipeline area id (matches `factory-pipeline.json`). */
  area: string;
  /** Block id (only set for steps inside 03-assembly-lines). */
  block?: string;
  /** Human label. */
  label: string;
  /** Args passed to `mfg` (this script spawns `npx tsx mfg.ts <mfgArgs>`). */
  mfgArgs: string[];
  /** Continue past failure (treat as soft step) when true. */
  optional?: boolean;
}

/** How `pipeline plan` (and `--dry-run`) prints the planned steps. */
type PlanFormat = "bullets" | "compact" | "table";

interface Opts {
  slug: string;
  orderId: string;
  force: boolean;
  reason: string;
  sprintTitle: string;
  sprintGoal: string;
  skip: Set<string>;
  only?: string;
  from?: string;
  to?: string;
  continueOnFailure: boolean;
  dryRun: boolean;
  plan: boolean;
  json: boolean;
  /** Print format for the plan output (default: bullets — current behavior). */
  planFormat: PlanFormat;
  /** Opt-in: run `gates review` after sprint init (default off — humans run this when ready). */
  withGatesReview: boolean;
  /** Opt-in: run `deploy preview --dry-run` (default off). */
  withDeploy: boolean;
  /** Opt-in: run `kaizen new` + `kaizen summary` (default off). */
  withKaizen: boolean;
  /** Opt-in: run `metrics collect` (default off). */
  withMetrics: boolean;
  /** Opt-in: attempt `app verified add` (default off). */
  withVerified: boolean;
  /** When false: skip `build-tasks` (leave task-queue.json alone; users still get phases). */
  withAutoTasks: boolean;
}

function todayUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultOrderId(slug: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${slug}-so-${y}${m}${day}`;
}

function buildSteps(o: Opts): Step[] {
  const { slug, orderId, force, reason, sprintTitle, sprintGoal } = o;
  const day = todayUtcDay();

  const steps: Step[] = [
    {
      id: "brief",
      area: "00-product-definitions",
      label: "Vertical brief",
      mfgArgs: ["app", "new", "--", slug, "--defaults", ...(force ? ["--force"] : [])],
    },
    {
      id: "stack",
      area: "00-product-definitions",
      label: "System IR (stack)",
      mfgArgs: ["app", "stack", "--", slug, "--defaults"],
    },
    {
      id: "quote",
      area: "00-product-definitions",
      label: "Quote",
      mfgArgs: ["app", "quote", "--", slug],
      optional: true,
    },
    {
      id: "sales-order",
      area: "01-production-planning",
      label: "Sales order",
      mfgArgs: ["so", "--", slug, "--yes"],
    },
    {
      id: "work-order",
      area: "01-production-planning",
      label: "Work order",
      mfgArgs: ["wo", "--", orderId, "--yes"],
    },
    {
      id: "lifecycle",
      area: "01-production-planning",
      label: "Schedule (lifecycle → scheduled)",
      mfgArgs: ["order", "lifecycle", orderId, "set", "scheduled", "--reason", reason],
    },
    {
      id: "bdphase",
      area: "01-production-planning",
      label: "BD phases bootstrap (default 6-phase template if no phase-queue)",
      mfgArgs: ["app", "bdphase", "--", orderId],
      optional: true,
    },
    {
      id: "build-tasks",
      area: "01-production-planning",
      label: "Break every phase into tasks + auto-merge into task-queue.json",
      mfgArgs: ["app", "build-tasks", "--", orderId],
      optional: true,
    },
    {
      id: "intake-validate",
      area: "03-assembly-lines",
      block: "01-intake",
      label: "Intake validate",
      mfgArgs: ["order", "validate", orderId],
    },
    {
      id: "scaffold",
      area: "03-assembly-lines",
      block: "04-scaffold",
      label: "Scaffold workspaces",
      mfgArgs: ["app", "scaffold", "--", slug],
    },
    {
      id: "validate-apps",
      area: "03-assembly-lines",
      block: "06-gates-validation",
      label: "Validate apps",
      mfgArgs: ["validate", "apps"],
    },
    {
      id: "validate-factory",
      area: "03-assembly-lines",
      block: "06-gates-validation",
      label: "Validate factory",
      mfgArgs: ["validate", "factory"],
    },
    {
      id: "sprint-init",
      area: "03-assembly-lines",
      block: "05-sprints",
      label: "Sprint init",
      mfgArgs: ["sprint", "init", orderId, slug, "--title", sprintTitle, "--goal", sprintGoal],
    },
    {
      id: "telemetry-rollup",
      area: "03-assembly-lines",
      block: "07-telemetry",
      label: "Telemetry roll-up",
      mfgArgs: ["telemetry", "assembly-line"],
    },
    {
      id: "sprint-handoff",
      area: "03-assembly-lines",
      block: "05-sprints",
      label: "Sprint hand-off (board + next steps)",
      // Print the board for this sprint, which also auto-syncs the
      // workstation rows from the task queue. From here, the human picks the
      // next task and runs `sprint task prompt <taskId>` to hand it to an
      // agent in the app's Cursor window.
      mfgArgs: ["sprint", "board", orderId, slug],
      optional: true,
    },
    {
      id: "trace-build",
      area: "08-traceability",
      label: "Build order traceability index (derived)",
      // Stamps factory/08_traceability/orders/<orderId>.json with phases →
      // tasks → sprints → prompts → telemetry, so anyone can answer "what is
      // the chain for this order?" with a single read.
      mfgArgs: ["trace", "build", orderId],
      optional: true,
    },
  ];

  if (o.withGatesReview) {
    steps.push({
      id: "gates-review",
      area: "03-assembly-lines",
      block: "06-gates",
      label: "Delivery review (opt-in)",
      mfgArgs: ["gates", "review", orderId, slug],
      optional: true,
    });
  }

  if (o.withDeploy) {
    steps.push({
      id: "deploy-preview",
      area: "03-assembly-lines",
      block: "08-delivery",
      label: "Deploy preview (dry-run)",
      mfgArgs: ["deploy", "preview", "--", "--dry-run"],
    });
  }
  if (o.withKaizen) {
    steps.push({
      id: "kaizen-new",
      area: "04-kaizen",
      label: "Kaizen note",
      mfgArgs: ["kaizen", "new", "--slug", slug, "--title", `Pipeline run for ${slug}`],
      optional: true,
    });
    steps.push({
      id: "kaizen-summary",
      area: "04-kaizen",
      label: "Kaizen summary",
      mfgArgs: ["kaizen", "summary", "--day", day, "--top", "5"],
      optional: true,
    });
  }
  if (o.withMetrics) {
    steps.push({
      id: "metrics-collect",
      area: "05-metrics",
      label: "Metrics collect",
      mfgArgs: ["metrics", "collect", "--day", day, "--from-probes-only", "--yes"],
      optional: true,
    });
  }
  if (o.withVerified) {
    steps.push({
      id: "verified-add",
      area: "07-verified-product",
      label: "Promote to verified (attempt)",
      mfgArgs: ["app", "verified", "--", "add", slug],
      // `app verified add` legitimately fails when SaaS alignment isn't clean.
      // Treat it as optional so the pipeline doesn't abort on a *correct* gate rejection.
      optional: true,
    });
  }

  return steps;
}

function parseCli(argv: string[]): Opts {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const skip = new Set<string>();
  const rest: string[] = [];
  let slug: string | undefined;
  let orderId: string | undefined;
  let reason: string | undefined;
  let sprintTitle: string | undefined;
  let sprintGoal: string | undefined;
  let only: string | undefined;
  let from: string | undefined;
  let to: string | undefined;
  let force = false;
  let continueOnFailure = false;
  let dryRun = false;
  let plan = false;
  let json = false;
  // Default OFF — these were previously auto-run after sprint init but are
  // now human-driven (run them manually when you're ready). Use `--with-*`
  // to opt back into the old auto behavior.
  let planFormat: PlanFormat = "bullets";
  let withGatesReview = false;
  let withDeploy = false;
  let withKaizen = false;
  let withMetrics = false;
  let withVerified = false;
  let withAutoTasks = true;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") continue;
    if (a === "--plan") { plan = true; continue; }
    if (a === "--force") { force = true; continue; }
    if (a === "--continue-on-failure") { continueOnFailure = true; continue; }
    if (a === "--dry-run") { dryRun = true; continue; }
    if (a === "--json") { json = true; continue; }
    if (a === "--format" && argv[i + 1]) {
      const f = argv[++i]!.trim();
      if (f !== "bullets" && f !== "compact" && f !== "table") {
        console.error(`pipeline: --format must be one of bullets | compact | table (got "${f}").`);
        process.exit(1);
      }
      planFormat = f;
      continue;
    }
    if (a.startsWith("--format=")) {
      const f = a.slice("--format=".length).trim();
      if (f !== "bullets" && f !== "compact" && f !== "table") {
        console.error(`pipeline: --format must be one of bullets | compact | table (got "${f}").`);
        process.exit(1);
      }
      planFormat = f;
      continue;
    }
    if (a === "--no-gates-review") { withGatesReview = false; continue; }
    if (a === "--no-deploy") { withDeploy = false; continue; }
    if (a === "--no-kaizen") { withKaizen = false; continue; }
    if (a === "--no-metrics") { withMetrics = false; continue; }
    if (a === "--no-verified") { withVerified = false; continue; }
    if (a === "--no-auto-tasks") { withAutoTasks = false; continue; }
    if (a === "--with-gates-review") { withGatesReview = true; continue; }
    if (a === "--with-deploy") { withDeploy = true; continue; }
    if (a === "--with-kaizen") { withKaizen = true; continue; }
    if (a === "--with-metrics") { withMetrics = true; continue; }
    if (a === "--with-verified") { withVerified = true; continue; }
    if (a === "--with-auto-tasks") { withAutoTasks = true; continue; }
    if (a === "--full-auto") {
      // Legacy: re-enable every post-sprint step in one go.
      withGatesReview = true;
      withDeploy = true;
      withKaizen = true;
      withMetrics = true;
      withVerified = true;
      continue;
    }
    if (a === "--skip") { skip.add(argv[++i] ?? ""); continue; }
    if (a === "--only") { only = argv[++i]; continue; }
    if (a === "--from") { from = argv[++i]; continue; }
    if (a === "--to") { to = argv[++i]; continue; }
    if (a === "--order-id") { orderId = argv[++i]; continue; }
    if (a === "--reason") { reason = argv[++i]; continue; }
    if (a === "--sprint-title") { sprintTitle = argv[++i]; continue; }
    if (a === "--sprint-goal") { sprintGoal = argv[++i]; continue; }
    if (a.startsWith("--")) {
      console.error(`pipeline run: unknown flag "${a}". Try --help.`);
      process.exit(1);
    }
    rest.push(a);
  }

  slug = rest[0]?.trim();
  if (!slug) {
    console.error("pipeline run: missing <slug>.\n");
    printUsage();
    process.exit(1);
  }
  if (!SLUG_RE.test(slug)) {
    console.error(`pipeline run: invalid slug "${slug}" (expected ${SLUG_RE.source}).`);
    process.exit(1);
  }

  return {
    slug,
    orderId: orderId?.trim() || defaultOrderId(slug),
    force,
    reason: reason ?? `pipeline run for ${slug}`,
    sprintTitle: sprintTitle ?? `${slug} MVP`,
    sprintGoal: sprintGoal ?? `Stand up frontend + backend with API for ${slug}`,
    skip,
    only,
    from,
    to,
    continueOnFailure,
    dryRun,
    plan,
    json,
    planFormat,
    withGatesReview,
    withDeploy,
    withKaizen,
    withMetrics,
    withVerified,
    withAutoTasks,
  };
}

function printUsage(): void {
  console.log(`Pipeline runner — execute the factory pipeline end-to-end for one app.

Usage:
  npm run mfg -- pipeline run  -- <slug> [options]
  npm run mfg -- pipeline plan -- <slug> [options]

Options:
  --order-id <id>          Override auto-generated order id (default: <slug>-so-YYYYMMDD)
  --force                  Pass --force to \`app new\` (rewrite an existing brief from defaults)
  --reason <text>          Lifecycle reason (default: "pipeline run for <slug>")
  --sprint-title <text>    Sprint title (default: "<slug> MVP")
  --sprint-goal  <text>    Sprint goal (default: hello-world-style goal)
  --skip <stepId>          Skip a step by id (repeatable)
  --only <stepId>          Run only one step by id
  --from <stepId>          Start from this step (inclusive)
  --to <stepId>            Stop after this step (inclusive)
  --continue-on-failure    Don't abort the run on a failed step
  --dry-run                Print the plan; don't execute
  --plan                   Alias for --dry-run
  --format <fmt>           Plan print format: bullets (default) | compact | table
  --json                   Print the run summary as JSON. With --plan / --dry-run,
                           prints the plan itself as JSON instead.
  --with-gates-review      Opt-in: run \`gates review\` after sprint init
  --with-deploy            Opt-in: run \`deploy preview --dry-run\`
  --with-kaizen            Opt-in: run \`kaizen new\` + \`kaizen summary\`
  --with-metrics           Opt-in: run \`metrics collect\`
  --with-verified          Opt-in: attempt \`app verified add\`
  --full-auto              Re-enable all five opt-ins above in one shot (legacy)
  --no-auto-tasks          Skip \`build-tasks\` (still writes order-phases.json,
                           but leaves task-queue.json untouched so a PM can do
                           per-phase bdtask review manually).

Default flow (humans drive the sprint):
  brief → stack → quote → sales-order → work-order → lifecycle →
  bdphase → build-tasks → intake-validate → scaffold →
  validate-apps → validate-factory → sprint-init → telemetry-rollup →
  sprint-handoff (prints the board) → trace-build (derived index)

After trace-build, run manually as you go:
  npm run mfg -- sprint task prompt <taskId>     # writes prompt .md
  npm run mfg -- line done <taskId>              # mark complete
  npm run mfg -- sprint board <orderId> <slug>   # refresh + see what's next
  npm run mfg -- trace order <orderId>           # full chain (phases → tasks → sprints → prompts → telemetry)

Opt-in step ids (only present when their --with-* flag is set):
  gates-review, deploy-preview, kaizen-new, kaizen-summary,
  metrics-collect, verified-add

Examples:
  npm run mfg -- pipeline run  -- hello-world-3
  npm run mfg -- pipeline run  -- my-app --force --with-gates-review
  npm run mfg -- pipeline run  -- my-app --full-auto          # legacy hands-off
  npm run mfg -- pipeline plan -- my-app --from scaffold
  npm run mfg -- pipeline plan -- my-app --format table
  npm run mfg -- pipeline plan -- my-app --format compact
  npm run mfg -- pipeline plan -- my-app --json | jq .plan[].id
  npm run mfg -- pipeline run  -- my-app --only validate-factory
`);
}

function applyRange(steps: Step[], o: Opts): Step[] {
  if (o.only) {
    const hit = steps.find((s) => s.id === o.only);
    if (!hit) {
      console.error(`--only "${o.only}" is not a known step id.`);
      process.exit(1);
    }
    return [hit];
  }
  let startIdx = 0;
  let endIdx = steps.length - 1;
  if (o.from) {
    const i = steps.findIndex((s) => s.id === o.from);
    if (i < 0) {
      console.error(`--from "${o.from}" is not a known step id.`);
      process.exit(1);
    }
    startIdx = i;
  }
  if (o.to) {
    const i = steps.findIndex((s) => s.id === o.to);
    if (i < 0) {
      console.error(`--to "${o.to}" is not a known step id.`);
      process.exit(1);
    }
    endIdx = i;
  }
  return steps.slice(startIdx, endIdx + 1);
}

function locationLabel(s: Step): string {
  return s.block ? `${s.area}/${s.block}` : s.area;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan renderers
//
// These print the planned sequence of steps without executing anything. They
// are used by `pipeline plan` and by `pipeline run … --dry-run`. The shape of
// the planned list (`Step[]`) is identical across formats; only the rendering
// differs.
// ─────────────────────────────────────────────────────────────────────────────

/** Render the default "bullet + command underneath" layout (legacy). */
function renderBulletsPlan(planned: Step[], opts: Opts): void {
  console.log("Plan (no execution):");
  for (const s of planned) {
    const skipped = opts.skip.has(s.id) ? "  (skipped)" : "";
    const opt = s.optional ? "  (optional)" : "";
    console.log(
      `  · [${locationLabel(s).padEnd(33)}] ${s.id.padEnd(22)}  ${s.label}${opt}${skipped}`,
    );
    console.log(`    mfg ${s.mfgArgs.join(" ")}`);
  }
  console.log();
}

/** Render a compact one-line-per-step view (no command underneath). */
function renderCompactPlan(planned: Step[], opts: Opts): void {
  console.log("Plan (no execution, compact):");
  const widthIdx = String(planned.length).length;
  const widthLoc = Math.max(8, ...planned.map((s) => locationLabel(s).length));
  const widthId = Math.max(8, ...planned.map((s) => s.id.length));
  planned.forEach((s, i) => {
    const idx = String(i + 1).padStart(widthIdx);
    const loc = locationLabel(s).padEnd(widthLoc);
    const id = s.id.padEnd(widthId);
    const tags: string[] = [];
    if (s.optional) tags.push("optional");
    if (opts.skip.has(s.id)) tags.push("skipped");
    const tail = tags.length ? `  (${tags.join(", ")})` : "";
    console.log(`  ${idx}. [${loc}] ${id}  ${s.label}${tail}`);
  });
  console.log();
}

/**
 * Render the plan as a boxed table.
 *
 * Columns: #, location, step id, label, optional?, command. The command column
 * is sized to the remaining terminal width; if it overflows, it is wrapped
 * across multiple lines inside its cell (no truncation).
 */
function renderTablePlan(planned: Step[], opts: Opts): void {
  const rows = planned.map((s, i) => ({
    idx: String(i + 1),
    loc: locationLabel(s),
    id: s.id,
    label: s.label,
    flag: [s.optional ? "optional" : "", opts.skip.has(s.id) ? "skipped" : ""]
      .filter(Boolean)
      .join(", "),
    cmd: `mfg ${s.mfgArgs.join(" ")}`,
  }));

  const headers = {
    idx: "#",
    loc: "location",
    id: "step id",
    label: "label",
    flag: "flags",
    cmd: "command",
  };

  const termWidth = Math.max(80, process.stdout.columns ?? 120);
  const padW = (k: keyof typeof headers, min = 4) =>
    Math.max(min, headers[k].length, ...rows.map((r) => r[k].length));

  const wIdx = padW("idx");
  const wLoc = padW("loc");
  const wId = padW("id");
  const wLabel = padW("label");
  const wFlag = Math.max(headers.flag.length, ...rows.map((r) => r.flag.length));
  // Reserve everything else for the command column. 7 vertical bars + spaces
  // (one between each column boundary) take up `7 * 3 = 21` columns of chrome.
  const fixedWidth = wIdx + wLoc + wId + wLabel + wFlag + 7 * 3;
  const wCmd = Math.max(20, termWidth - fixedWidth);

  const top = `┌${"─".repeat(wIdx + 2)}┬${"─".repeat(wLoc + 2)}┬${"─".repeat(
    wId + 2,
  )}┬${"─".repeat(wLabel + 2)}┬${"─".repeat(wFlag + 2)}┬${"─".repeat(wCmd + 2)}┐`;
  const mid = `├${"─".repeat(wIdx + 2)}┼${"─".repeat(wLoc + 2)}┼${"─".repeat(
    wId + 2,
  )}┼${"─".repeat(wLabel + 2)}┼${"─".repeat(wFlag + 2)}┼${"─".repeat(wCmd + 2)}┤`;
  const bot = `└${"─".repeat(wIdx + 2)}┴${"─".repeat(wLoc + 2)}┴${"─".repeat(
    wId + 2,
  )}┴${"─".repeat(wLabel + 2)}┴${"─".repeat(wFlag + 2)}┴${"─".repeat(wCmd + 2)}┘`;

  const renderRow = (
    idx: string,
    loc: string,
    id: string,
    label: string,
    flag: string,
    cmd: string,
  ): string => {
    const cmdLines = wrapToWidth(cmd, wCmd);
    const lines: string[] = [];
    const padCell = (s: string, w: number) => s.padEnd(w);
    for (let li = 0; li < cmdLines.length; li++) {
      lines.push(
        `│ ${padCell(li === 0 ? idx : "", wIdx)} │ ${padCell(
          li === 0 ? loc : "",
          wLoc,
        )} │ ${padCell(li === 0 ? id : "", wId)} │ ${padCell(
          li === 0 ? label : "",
          wLabel,
        )} │ ${padCell(li === 0 ? flag : "", wFlag)} │ ${padCell(cmdLines[li], wCmd)} │`,
      );
    }
    return lines.join("\n");
  };

  console.log("Plan (no execution, table):");
  console.log(top);
  console.log(
    renderRow(headers.idx, headers.loc, headers.id, headers.label, headers.flag, headers.cmd),
  );
  console.log(mid);
  for (const r of rows) {
    console.log(renderRow(r.idx, r.loc, r.id, r.label, r.flag, r.cmd));
  }
  console.log(bot);
  console.log();
}

/** Word-wrap helper: never breaks a token mid-word unless the token itself exceeds width. */
function wrapToWidth(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const out: string[] = [];
  let line = "";
  for (const tok of text.split(/(\s+)/)) {
    if (!tok) continue;
    if ((line + tok).length <= width) {
      line += tok;
      continue;
    }
    if (line.trim().length) out.push(line);
    if (tok.length > width) {
      // Hard-break only when an individual token is longer than the column.
      for (let i = 0; i < tok.length; i += width) {
        const chunk = tok.slice(i, i + width);
        if (chunk.length === width) out.push(chunk);
        else line = chunk;
      }
    } else {
      line = tok.replace(/^\s+/, "");
    }
  }
  if (line.trim().length) out.push(line);
  return out;
}

/** Emit the plan as JSON (one object per step + a small header). */
function printPlanJson(planned: Step[], opts: Opts): void {
  const out = {
    slug: opts.slug,
    orderId: opts.orderId,
    plan: planned.map((s, i) => ({
      index: i + 1,
      id: s.id,
      area: s.area,
      block: s.block,
      label: s.label,
      optional: !!s.optional,
      skipped: opts.skip.has(s.id),
      mfgArgs: s.mfgArgs,
    })),
    totals: {
      steps: planned.length,
      optional: planned.filter((s) => s.optional).length,
      skipped: planned.filter((s) => opts.skip.has(s.id)).length,
    },
  };
  console.log(JSON.stringify(out, null, 2));
}

function spawnMfg(args: string[]): { code: number; durationMs: number } {
  const t0 = Date.now();
  const r = spawnSync("npx", ["tsx", MFG_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  return { code: r.status ?? 1, durationMs: Date.now() - t0 };
}

interface StepResult {
  step: Step;
  outcome: Outcome;
  durationMs: number;
  exitCode?: number;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const opts = parseCli(argv);
  if (!opts.withAutoTasks) opts.skip.add("build-tasks");
  const allSteps = buildSteps(opts);
  const planned = applyRange(allSteps, opts);

  console.log(
    `\nPipeline run — app="${opts.slug}" orderId="${opts.orderId}" steps=${planned.length}/${allSteps.length}`,
  );
  console.log(
    "  flags:" +
      ` force=${opts.force}` +
      ` continueOnFailure=${opts.continueOnFailure}` +
      ` autoTasks=${opts.withAutoTasks}` +
      ` gatesReview=${opts.withGatesReview}` +
      ` deploy=${opts.withDeploy}` +
      ` kaizen=${opts.withKaizen}` +
      ` metrics=${opts.withMetrics}` +
      ` verified=${opts.withVerified}` +
      (opts.from ? ` from=${opts.from}` : "") +
      (opts.to ? ` to=${opts.to}` : "") +
      (opts.only ? ` only=${opts.only}` : "") +
      (opts.skip.size ? ` skip=${[...opts.skip].join(",")}` : ""),
  );
  console.log();

  if (opts.dryRun || opts.plan) {
    if (opts.json) {
      printPlanJson(planned, opts);
    } else if (opts.planFormat === "compact") {
      renderCompactPlan(planned, opts);
    } else if (opts.planFormat === "table") {
      renderTablePlan(planned, opts);
    } else {
      renderBulletsPlan(planned, opts);
    }
    return 0;
  }

  const results: StepResult[] = [];
  let aborted = false;

  for (const s of planned) {
    if (opts.skip.has(s.id)) {
      console.log(`▷ [${locationLabel(s).padEnd(33)}] ${s.id} — skipped (--skip)`);
      results.push({ step: s, outcome: "skipped", durationMs: 0 });
      continue;
    }
    if (aborted) {
      results.push({ step: s, outcome: "not-run", durationMs: 0 });
      continue;
    }
    console.log(
      `\n▶ [${locationLabel(s).padEnd(33)}] ${s.id} — ${s.label}\n  mfg ${s.mfgArgs.join(" ")}`,
    );
    const { code, durationMs } = spawnMfg(s.mfgArgs);
    const outcome: Outcome = code === 0 ? "pass" : "fail";
    results.push({ step: s, outcome, durationMs, exitCode: code });
    if (code === 0) {
      console.log(`  ✓ pass  (${durationMs} ms)`);
    } else if (s.optional) {
      console.log(`  ⚠ fail  (${durationMs} ms, exit ${code}) — optional, continuing`);
    } else if (opts.continueOnFailure) {
      console.log(`  ✗ fail  (${durationMs} ms, exit ${code}) — --continue-on-failure, continuing`);
    } else {
      console.log(`  ✗ fail  (${durationMs} ms, exit ${code}) — aborting pipeline`);
      aborted = true;
    }
  }

  printSummary(results, opts);

  const hardFailed = results.some(
    (r) => r.outcome === "fail" && !r.step.optional,
  );
  return hardFailed && !opts.continueOnFailure ? 1 : 0;
}

function printSummary(results: StepResult[], opts: Opts): void {
  if (opts.json) {
    const out = {
      slug: opts.slug,
      orderId: opts.orderId,
      results: results.map((r) => ({
        id: r.step.id,
        area: r.step.area,
        block: r.step.block,
        label: r.step.label,
        outcome: r.outcome,
        durationMs: r.durationMs,
        exitCode: r.exitCode,
        optional: !!r.step.optional,
        mfgArgs: r.step.mfgArgs,
      })),
      totals: {
        pass: results.filter((r) => r.outcome === "pass").length,
        fail: results.filter((r) => r.outcome === "fail").length,
        skipped: results.filter((r) => r.outcome === "skipped").length,
        notRun: results.filter((r) => r.outcome === "not-run").length,
        durationMs: results.reduce((acc, r) => acc + r.durationMs, 0),
      },
    };
    console.log("\n" + JSON.stringify(out, null, 2));
    return;
  }
  console.log("\n=== Pipeline run summary ===");
  const widthId = Math.max(8, ...results.map((r) => r.step.id.length));
  const widthLoc = Math.max(8, ...results.map((r) => locationLabel(r.step).length));
  console.log(
    `  ${"id".padEnd(widthId)}  ${"location".padEnd(widthLoc)}  outcome  duration`,
  );
  console.log(
    `  ${"-".repeat(widthId)}  ${"-".repeat(widthLoc)}  -------  --------`,
  );
  for (const r of results) {
    console.log(
      `  ${r.step.id.padEnd(widthId)}  ${locationLabel(r.step).padEnd(widthLoc)}  ${r.outcome.padEnd(7)}  ${r.durationMs ? String(r.durationMs) + " ms" : "—"}`,
    );
  }
  const pass = results.filter((r) => r.outcome === "pass").length;
  const fail = results.filter((r) => r.outcome === "fail").length;
  const skipped = results.filter((r) => r.outcome === "skipped").length;
  const notRun = results.filter((r) => r.outcome === "not-run").length;
  const total = results.reduce((acc, r) => acc + r.durationMs, 0);
  console.log(
    `\n  totals: pass=${pass}  fail=${fail}  skipped=${skipped}  not-run=${notRun}  duration=${total} ms`,
  );
  console.log(
    `\nTelemetry: factory/telemetry/assembly-line/assembly-line-${todayUtcDay()}.jsonl`,
  );
  console.log(
    `View roll-up: npm run mfg -- telemetry assembly-line\n`,
  );
}

const isMain =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isMain) {
  void main().then((code) => process.exit(code));
}

export { buildSteps, parseCli };
export type { Opts, Step, StepResult };
