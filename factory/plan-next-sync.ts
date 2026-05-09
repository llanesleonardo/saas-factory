import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if ((r.status ?? 1) !== 0) {
    process.exit(r.status ?? 1);
  }
}

function main(): void {
  const forwarded = process.argv.slice(2);
  run("npm", ["run", "task-queues:sync"]);
  run("npm", ["run", "factory:next", "--", ...forwarded]);
}

main();

