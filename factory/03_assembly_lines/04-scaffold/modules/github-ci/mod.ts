import * as path from "node:path";

import type { SaaSAppBlueprint } from "../../../06-gates/gates/app-blueprint-config.js";
import { REPO_ROOT, writeFileEnsured } from "../../scaffold-lib.js";

export function githubCiModule(opts: {
  slug: string;
  bp: SaaSAppBlueprint;
  dryRun: boolean;
}): { id: string; version: number; apply: () => Promise<void> } {
  const { slug, bp, dryRun } = opts;
  return {
    id: "github-ci",
    version: 2,
    apply: async () => {
      if (bp.cicd !== "github-actions") return;
      const wfDir = path.join(REPO_ROOT, ".github", "workflows");
      const safe = slug.replace(/[^a-z0-9-]/g, "-") || "app";
      const name = `app-${safe}-ci.yml`;
      const wsApi = `${slug}-api`;
      const wsWeb = `${slug}-instance`;
      const body = `name: App ${slug} CI

on:
  push:
    paths:
      - "apps/${slug}/**"
      - "package-lock.json"
  pull_request:
    paths:
      - "apps/${slug}/**"
      - "package-lock.json"

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - name: API lint
        run: npm run lint -w ${wsApi}
      - name: API test
        run: npm run test -w ${wsApi}
      - name: Web lint
        run: npm run lint -w ${wsWeb}
      - name: Web build
        run: npm run build -w ${wsWeb}
`;
      const wfPath = path.join(wfDir, name);
      await writeFileEnsured(wfPath, body, dryRun);
    },
  };
}

