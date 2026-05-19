import * as path from "node:path";

import type { SaaSAppBlueprint } from "../../../06-gates/gates/app-blueprint-config.js";
import { writeFileEnsured } from "../../scaffold-lib.js";

function apiPackageJson(slug: string, runtime: string): object {
  const deps: Record<string, string> = { dotenv: "^16.4.5" };
  const devDeps: Record<string, string> = {
    "@types/node": "^22.10.2",
    eslint: "^9.17.0",
    prettier: "^3.4.2",
    tsx: "^4.19.2",
    typescript: "^5.7.2",
    "typescript-eslint": "^8.19.0",
    jest: "^29.7.0",
    "ts-jest": "^29.2.5",
  };

  if (runtime === "nodejs-express") {
    deps.express = "^4.21.2";
    deps.cors = "^2.8.5";
    devDeps["@types/express"] = "^5.0.0";
    devDeps["@types/cors"] = "^2.8.17";
  } else if (runtime === "nodejs-fastify") {
    deps.fastify = "^5.2.1";
    deps["@fastify/cors"] = "^10.0.1";
  } else {
    deps.hono = "^4.6.14";
    deps["@hono/node-server"] = "^1.13.7";
  }

  return {
    name: `${slug}-api`,
    version: "0.1.0",
    private: true,
    // ESM is required: the Fastify/Hono entry files below use top-level await
    // (`await app.register(...)`, `await app.listen(...)`). Without
    // `type: "module"`, tsx falls back to CJS and esbuild refuses the file.
    type: "module",
    description: `API for ${slug} (generated from app.stack.json)`,
    scripts: {
      dev: "tsx watch src/index.ts",
      start: "tsx src/index.ts",
      test: "jest --passWithNoTests",
      lint: 'eslint "src/**/*.ts"',
      format: 'prettier --write "src/**/*.ts"',
    },
    dependencies: deps,
    devDependencies: devDeps,
  };
}

function apiTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
      },
      include: ["src/**/*"],
    },
    null,
    2,
  );
}

function apiEntry(runtime: string, slug: string): string {
  if (runtime === "nodejs-fastify") {
    return `import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";

dotenv.config();
const PORT = Number(process.env.PORT ?? 4000);

const app = Fastify({ logger: true });
await app.register(cors, { origin: ["http://localhost:5173", "http://127.0.0.1:5173"] });

app.get("/api/health", async () => ({ ok: true, app: "${slug}" }));

await app.listen({ port: PORT, host: "0.0.0.0" });
console.log("${slug}-api (Fastify) http://localhost:" + PORT);
`;
  }
  if (runtime === "nodejs-hono") {
    return `import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

dotenv.config();
const PORT = Number(process.env.PORT ?? 4000);

const app = new Hono();
app.use("*", cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.get("/api/health", (c) => c.json({ ok: true, app: "${slug}" }));

serve({ fetch: app.fetch, port: PORT });
console.log("${slug}-api (Hono) http://localhost:" + PORT);
`;
  }
  return `import dotenv from "dotenv";
import cors from "cors";
import express from "express";

dotenv.config();
const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.get("/api/health", (_req, res) => res.json({ ok: true, app: "${slug}" }));

app.listen(PORT, () => console.log("${slug}-api (Express) http://localhost:" + PORT));
`;
}

function jestConfig(): string {
  return `/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\\\.ts$": [
      "ts-jest",
      {
        tsconfig: { module: "commonjs", moduleResolution: "node", esModuleInterop: true },
      },
    ],
  },
};
`;
}

function eslintConfig(): string {
  return `const tseslint = require("typescript-eslint");
module.exports = tseslint.config(
  { ignores: ["dist/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
`;
}

export function baseApiModule(opts: {
  slug: string;
  bp: SaaSAppBlueprint;
  apiDir: string;
  dryRun: boolean;
}): { id: string; version: number; apply: () => Promise<void> } {
  const { slug, bp, apiDir, dryRun } = opts;
  return {
    id: "base-api",
    version: 1,
    apply: async () => {
      await writeFileEnsured(path.join(apiDir, "package.json"), JSON.stringify(apiPackageJson(slug, bp.backend.runtime), null, 2) + "\n", dryRun);
      await writeFileEnsured(path.join(apiDir, "tsconfig.json"), apiTsConfig() + "\n", dryRun);
      await writeFileEnsured(path.join(apiDir, "jest.config.cjs"), jestConfig(), dryRun);
      await writeFileEnsured(path.join(apiDir, "eslint.config.cjs"), eslintConfig(), dryRun);
      await writeFileEnsured(path.join(apiDir, ".prettierrc"), JSON.stringify({ semi: true, singleQuote: false }, null, 2) + "\n", dryRun);
      await writeFileEnsured(path.join(apiDir, ".env.example"), "PORT=4000\n", dryRun);
      await writeFileEnsured(path.join(apiDir, ".gitignore"), "node_modules/\n.env\n", dryRun);
      await writeFileEnsured(path.join(apiDir, "README.md"), `# ${slug}-api\n\nGenerated scaffold (v1)\n`, dryRun);
      await writeFileEnsured(path.join(apiDir, "src", "index.ts"), apiEntry(bp.backend.runtime, slug), dryRun);
      await writeFileEnsured(
        path.join(apiDir, "src", "__tests__", "smoke.test.ts"),
        `test("smoke", () => {\n  expect(1 + 1).toBe(2);\n});\n`,
        dryRun,
      );
    },
  };
}

