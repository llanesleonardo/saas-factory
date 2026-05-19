/**
 * Interactive edits to the vertical brief and stack file with a named negotiator
 * (audit trail in configs/apps/<slug>/negotiation-log.jsonl).
 *
 * Intended for the whole lifecycle — first discovery through pre-production — not
 * only bootstrap: run whenever sales/CS/solutions capture new requirements or
 * agreed stack changes; then regenerate spec and/or rescaffold as documented in
 * configs/README.md ("Ongoing discovery").
 *
 *   npm run mfg -- app negotiate -- <appSlug> --negotiator "Ada Lovelace"
 *   npm run mfg -- app negotiate -- <appSlug> -n "Ada Lovelace"
 *
 * Requires an interactive terminal (TTY).
 */
import { confirm, input, select } from "@inquirer/prompts";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { isValidBlueprint } from "./app-blueprint-config.js";
import { appStackPath, configsAppsRoot, verticalBriefPath } from "../../../factory_libs/paths/app-config-paths.js";
import { validateVerticalConfigObject, verticalBriefDeclaredKeys } from "../validation/validate-vertical-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const SLUG = /^[a-z][a-z0-9-]*$/;

const ADD_SENTINEL = "__ADD__";

type Target = "brief" | "stack";

type LogEntry = {
  negotiator: string;
  timestamp: string;
  appSlug: string;
  target: Target;
  file: string;
  action: "set" | "add";
  path: string;
  previous: unknown;
  next: unknown;
};

function printHelp(): void {
  console.log(`Usage:
  npm run mfg -- app negotiate -- <appSlug> --negotiator "<name>"
  npm run mfg -- app negotiate -- <appSlug> -n "<name>"

Edits ${path.join("configs", "apps", "<app>", "<app>.json")} or app.stack.json.
Appends JSON lines to negotiation-log.jsonl under the same folder.`);
}

function parseArgs(argv: string[]): { appSlug?: string; negotiator?: string; help: boolean } {
  const pos: string[] = [];
  let negotiator: string | undefined;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--help" || a === "-h") {
      help = true;
      continue;
    }
    if (a === "--negotiator" || a === "-n") {
      negotiator = argv[++i]?.trim();
      continue;
    }
    if (a.startsWith("-")) continue;
    pos.push(a);
  }
  return { appSlug: pos[0], negotiator, help };
}

function parseUserValue(raw: string): unknown {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return Number.parseFloat(t);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

function getByPath(root: Record<string, unknown>, dotPath: string): unknown {
  const parts = dotPath.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setByPath(root: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split(".").filter(Boolean);
  if (parts.length === 0) throw new Error("Path must not be empty");
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const next = cur[p];
    if (next === undefined || next === null || typeof next !== "object" || Array.isArray(next)) {
      cur[p] = {};
    }
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value as unknown;
}

function flattenLeafPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const k of keys) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = o[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenLeafPaths(v, p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function formatPreview(v: unknown, max = 52): string {
  let s: string;
  if (v === undefined) s = "(unset)";
  else s = JSON.stringify(v);
  if (s.length > max) return `${s.slice(0, max - 1)}…`;
  return s;
}

function negotiationLogPath(appSlug: string): string {
  return path.join(configsAppsRoot(REPO_ROOT), appSlug, "negotiation-log.jsonl");
}

async function appendLog(entry: LogEntry): Promise<void> {
  const line = `${JSON.stringify(entry)}\n`;
  await fs.appendFile(negotiationLogPath(entry.appSlug), line, "utf8");
}

async function writeJsonPretty(absPath: string, data: unknown): Promise<void> {
  await fs.writeFile(absPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function negotiateBrief(
  appSlug: string,
  negotiator: string,
  absPath: string,
  relLabel: string,
): Promise<void> {
  const rawText = await fs.readFile(absPath, "utf8");
  const data = JSON.parse(rawText) as Record<string, unknown>;
  const declared = verticalBriefDeclaredKeys();
  const existingTop = new Set(Object.keys(data));
  const missing = declared.filter((k: string) => !existingTop.has(k));

  const choice = await select<string>({
    message: `Which field in ${relLabel}?`,
    choices: [
      { name: "Add new parameter (allowed field not yet set)", value: ADD_SENTINEL },
      ...declared
        .filter((k: string) => existingTop.has(k))
        .sort()
        .map((k: string) => ({
          name: `${k}  —  ${formatPreview(data[k])}`,
          value: k,
        })),
    ],
  });

  if (choice === ADD_SENTINEL) {
    if (missing.length === 0) {
      console.log("Every allowed field is already present. Use “update” on an existing line or remove a key in your editor.");
      return;
    }
    const key = await select<string>({
      message: "Add which field?",
      choices: missing.map((k: string) => ({ name: k, value: k })),
    });
    const prev = data[key];
    const valRaw = await input({
      message: `Value for "${key}" (JSON for arrays; plain text for strings)`,
    });
    const next = parseUserValue(valRaw);
    data[key] = next as unknown;
    validateVerticalConfigObject(data, relLabel);
    if (key === "vertical" && typeof next === "string" && next !== appSlug) {
      throw new Error(`"vertical" must stay "${appSlug}" to match the app folder (got "${next}").`);
    }
    await writeJsonPretty(absPath, data);
    await appendLog({
      negotiator,
      timestamp: new Date().toISOString(),
      appSlug,
      target: "brief",
      file: relLabel,
      action: "add",
      path: key,
      previous: prev,
      next,
    });
    console.log(`Updated ${relLabel} — logged to negotiation-log.jsonl`);
    return;
  }

  const key = choice;
  const prev = data[key];
  const valRaw = await input({
    message: `New value for "${key}" (current: ${formatPreview(prev, 80)})`,
    default:
      prev === undefined
        ? ""
        : typeof prev === "string"
          ? prev
          : JSON.stringify(prev),
  });
  const next = parseUserValue(valRaw);
  if (key === "vertical" && typeof next === "string" && next !== appSlug) {
    throw new Error(`"vertical" must stay "${appSlug}" to match the app folder (got "${next}").`);
  }
  data[key] = next as unknown;
  validateVerticalConfigObject(data, relLabel);
  await writeJsonPretty(absPath, data);
  await appendLog({
    negotiator,
    timestamp: new Date().toISOString(),
    appSlug,
    target: "brief",
    file: relLabel,
    action: "set",
    path: key,
    previous: prev,
    next,
  });
  console.log(`Updated ${relLabel} — logged to negotiation-log.jsonl`);
}

async function negotiateStack(
  appSlug: string,
  negotiator: string,
  absPath: string,
  relLabel: string,
): Promise<void> {
  const rawText = await fs.readFile(absPath, "utf8");
  const data = JSON.parse(rawText) as Record<string, unknown>;
  const paths = flattenLeafPaths(data).sort();

  const choice = await select<string>({
    message: `Which path in ${relLabel}?`,
    choices: [
      { name: "Add new parameter (dot path, e.g. tooling.testing)", value: ADD_SENTINEL },
      ...paths.map((p) => ({
        name: `${p}  —  ${formatPreview(getByPath(data, p))}`,
        value: p,
      })),
    ],
  });

  if (choice === ADD_SENTINEL) {
    const dotPath = await input({
      message: "Dot path to set (creates intermediate objects if needed)",
      validate: (s) => (s.trim().length > 0 ? true : "Enter a non-empty path"),
    });
    const valRaw = await input({
      message: "Value (JSON for objects/arrays/numbers/booleans)",
    });
    const next = parseUserValue(valRaw);
    const prev = getByPath(data, dotPath.trim());
    setByPath(data, dotPath.trim(), next);
    if (!isValidBlueprint(data)) {
      throw new Error(
        "That change does not produce a valid app.stack.json (schemaVersion 2 + known enums). Revert in git or fix the value.",
      );
    }
    if (typeof data.generatedAt === "string") {
      data.generatedAt = new Date().toISOString();
    }
    await writeJsonPretty(absPath, data);
    await appendLog({
      negotiator,
      timestamp: new Date().toISOString(),
      appSlug,
      target: "stack",
      file: relLabel,
      action: "add",
      path: dotPath.trim(),
      previous: prev,
      next,
    });
    console.log(`Updated ${relLabel} — logged to negotiation-log.jsonl`);
    return;
  }

  const dotPath = choice;
  const prev = getByPath(data, dotPath);
  const valRaw = await input({
    message: `New value for "${dotPath}" (current: ${formatPreview(prev, 80)})`,
    default:
      prev === undefined
        ? ""
        : typeof prev === "string"
          ? prev
          : JSON.stringify(prev),
  });
  const next = parseUserValue(valRaw);
  setByPath(data, dotPath, next);
  if (typeof data.generatedAt === "string") {
    data.generatedAt = new Date().toISOString();
  }
  if (!isValidBlueprint(data)) {
    throw new Error(
      "That change does not produce a valid app.stack.json. Re-open the file or fix the value to match enums in app-blueprint-config.ts.",
    );
  }
  await writeJsonPretty(absPath, data);
  await appendLog({
    negotiator,
    timestamp: new Date().toISOString(),
    appSlug,
    target: "stack",
    file: relLabel,
    action: "set",
    path: dotPath,
    previous: prev,
    next,
  });
  console.log(`Updated ${relLabel} — logged to negotiation-log.jsonl`);
}

async function main(): Promise<void> {
  const { appSlug, negotiator, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    return;
  }
  if (!appSlug || !SLUG.test(appSlug)) {
    console.error("Provide a valid app slug: [a-z][a-z0-9-]*");
    printHelp();
    process.exitCode = 1;
    return;
  }
  if (!negotiator || negotiator.length === 0) {
    console.error('Missing --negotiator (or -n) "Name of person proposing the change".');
    printHelp();
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY) {
    console.error("app negotiate requires an interactive terminal (TTY). Run npm run mfg -- app negotiate -- … from a shell.");
    process.exitCode = 1;
    return;
  }

  const briefAbs = verticalBriefPath(REPO_ROOT, appSlug);
  const stackAbs = appStackPath(REPO_ROOT, appSlug);
  const briefRel = path.relative(REPO_ROOT, briefAbs);
  const stackRel = path.relative(REPO_ROOT, stackAbs);

  try {
    await fs.access(briefAbs);
    await fs.access(stackAbs);
  } catch {
    console.error(
      `Missing ${briefRel} or ${stackRel}. Create the vertical brief with npm run mfg -- app new -- <slug>. Add app.stack.json (e.g. npm run mfg -- app stack -- <slug>) before negotiating.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Negotiator: ${negotiator}\nApp: ${appSlug}\nLog: ${path.relative(REPO_ROOT, negotiationLogPath(appSlug))}`);

  let again = true;
  while (again) {
    const target = await select<Target>({
      message: "Which document?",
      choices: [
        { name: `Business brief (${briefRel})`, value: "brief" },
        { name: `Stack (${stackRel})`, value: "stack" },
      ],
    });
    if (target === "brief") {
      await negotiateBrief(appSlug, negotiator, briefAbs, briefRel);
    } else {
      await negotiateStack(appSlug, negotiator, stackAbs, stackRel);
    }
    again = await confirm({ message: "Make another change?", default: false });
  }
}

void main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
