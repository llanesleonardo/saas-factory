import * as path from "node:path";

import type { SaaSAppBlueprint } from "../../../06-gates/gates/app-blueprint-config.js";
import { REPO_ROOT, writeFileEnsured } from "../../scaffold-lib.js";

// NOTE: This is a v1 minimal scaffold (Vite React TS). It is intentionally small and will be iterated.

function webPackageJson(slug: string): object {
  return {
    name: `${slug}-instance`,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
      lint: 'eslint "src/**/*.{ts,tsx}"',
      format: 'prettier --write "src/**/*.{ts,tsx,css,md}"',
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      "@eslint/js": "^9.17.0",
      "@types/react": "^18.3.12",
      "@types/react-dom": "^18.3.1",
      "@vitejs/plugin-react": "^4.3.4",
      eslint: "^9.17.0",
      prettier: "^3.4.2",
      typescript: "^5.7.2",
      "typescript-eslint": "^8.19.0",
      vite: "^5.4.11",
    },
  };
}

function webReadme(slug: string, bp: SaaSAppBlueprint): string {
  return `# ${slug}-instance

Generated from \`configs/apps/${slug}/app.stack.json\`.

Blueprint frontend: **${bp.frontend.stack}**.

## Dev

\`\`\`bash
npm install
npm run dev
\`\`\`

Ensure \`apps/${slug}/${slug}-api\` is running on port 4000 (or set \`VITE_API_TARGET\`).
`;
}

function webEslintConfig(): string {
  return `import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
`;
}

function viteConfig(): string {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
`;
}

export function baseFrontendModule(opts: {
  slug: string;
  bp: SaaSAppBlueprint;
  instDir: string;
  dryRun: boolean;
}): { id: string; version: number; apply: () => Promise<void> } {
  const { slug, bp, instDir, dryRun } = opts;
  return {
    id: "base-frontend",
    version: 1,
    apply: async () => {
      await writeFileEnsured(path.join(instDir, "package.json"), JSON.stringify(webPackageJson(slug), null, 2) + "\n", dryRun);
      await writeFileEnsured(
        path.join(instDir, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              lib: ["ES2022", "DOM", "DOM.Iterable"],
              module: "ESNext",
              moduleResolution: "Bundler",
              jsx: "react-jsx",
              strict: true,
              skipLibCheck: true,
              noEmit: true,
              resolveJsonModule: true,
            },
            include: ["src"],
          },
          null,
          2,
        ) + "\n",
        dryRun,
      );
      await writeFileEnsured(path.join(instDir, "vite.config.ts"), viteConfig(), dryRun);
      await writeFileEnsured(
        path.join(instDir, "index.html"),
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${slug}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
        dryRun,
      );
      await writeFileEnsured(path.join(instDir, "eslint.config.js"), webEslintConfig(), dryRun);
      await writeFileEnsured(path.join(instDir, ".prettierrc"), JSON.stringify({ semi: true, singleQuote: false }, null, 2) + "\n", dryRun);
      await writeFileEnsured(path.join(instDir, ".env.example"), `VITE_API_TARGET=http://localhost:4000\n`, dryRun);
      await writeFileEnsured(path.join(instDir, ".gitignore"), "dist/\nnode_modules/\n.env\n", dryRun);
      await writeFileEnsured(path.join(instDir, "README.md"), webReadme(slug, bp), dryRun);

      await writeFileEnsured(
        path.join(instDir, "src", "vite-env.d.ts"),
        `/// <reference types="vite/client" />\n`,
        dryRun,
      );
      await writeFileEnsured(
        path.join(instDir, "src", "main.tsx"),
        `import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
        dryRun,
      );
      await writeFileEnsured(
        path.join(instDir, "src", "App.tsx"),
        `import { useEffect, useState } from "react";

type Todo = { id: number; title: string; done: 0 | 1 | boolean; created_at: string };

const API = import.meta.env.VITE_API_TARGET ?? "http://localhost:4000";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");

  async function refresh() {
    const r = await fetch(\`\${API}/api/todos\`);
    setTodos(await r.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function addTodo() {
    const t = title.trim();
    if (!t) return;
    await fetch(\`\${API}/api/todos\`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: t }) });
    setTitle("");
    await refresh();
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1>${slug}</h1>
      <p style={{ opacity: 0.7 }}>Generated scaffold (v1)</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New todo" style={{ flex: 1, padding: 8 }} />
        <button onClick={() => void addTodo()}>Add</button>
      </div>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {String(t.done) === "1" ? "✅" : "⬜"} {t.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
        dryRun,
      );

      if (!dryRun) {
        // ensure folders exist (writeFileEnsured does it, but keep deterministic structure)
        void REPO_ROOT;
      }
    },
  };
}

