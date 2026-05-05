/**
 * Runs blueprint/scaffold CLIs on the host via `docker compose … run node`,
 * or runs them directly when already inside a container (Dev Container / exec).
 *
 *   npx tsx factory/host-or-docker.ts app-blueprint-config.ts [--flags…]
 *   npx tsx factory/host-or-docker.ts app-scaffold.ts [--flags…]
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED = new Set(["app-blueprint-config.ts", "app-scaffold.ts"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function main(): void {
  const script = process.argv[2];
  const forwarded = process.argv.slice(3);

  if (!script || !ALLOWED.has(script)) {
    console.error(`Usage: npx tsx factory/host-or-docker.ts <${[...ALLOWED].join(" | ")}> [flags…]`);
    process.exitCode = 1;
    return;
  }

  const tsxTarget = path.join("factory", script);
  const inDocker = fs.existsSync("/.dockerenv");

  if (inDocker) {
    const r = spawnSync("npx", ["tsx", tsxTarget, ...forwarded], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    process.exit(r.status ?? 1);
    return;
  }

  const composeFile = path.join("docker", "compose.yaml");
  const needsTty = script === "app-blueprint-config.ts";
  const dockerArgs = [
    "compose",
    "-f",
    composeFile,
    "run",
    "--rm",
    ...(needsTty ? ["-it"] : []),
    "node",
    "npx",
    "tsx",
    tsxTarget,
    ...forwarded,
  ];

  const r = spawnSync("docker", dockerArgs, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(r.status ?? 1);
}

main();
