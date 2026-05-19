/**
 * Frontend-first decision tree for app-blueprint-config (manual mode).
 * Produces a coarse `FrontendStack` (scaffold / enums) plus optional `frontendDetail` for richer intent.
 */
import { checkbox, confirm, input, select } from "@inquirer/prompts";

/** Must stay aligned with `ApiStyle` / `TestStack` / `FrontendStack` in app-blueprint-config.ts */
type BlueprintApiStyle = "rest-json" | "trpc" | "graphql" | "grpc-oriented";
type BlueprintTestStack = "vitest" | "jest" | "pytest" | "go-test" | "rust-cargo-test" | "minimal";
type BlueprintPackageManager = "npm" | "pnpm" | "yarn" | "bun";
type BlueprintFrontendStack =
  | "vite-react-ts"
  | "vite-vue-ts"
  | "vite-solid-ts"
  | "next-ts-fullstack"
  | "nuxt-ts"
  | "sveltekit-ts"
  | "remix-ts"
  | "astro-ts"
  | "angular-ts"
  | "static-html-vanilla";

/* ─── Detail model (stored on blueprint; scaffold may ignore until extended) ─── */

export type FrontendFramework =
  | "react"
  | "vue"
  | "angular"
  | "svelte"
  | "solid"
  | "vanilla"
  | "next"
  | "nuxt"
  | "sveltekit"
  | "remix"
  | "astro";

export type FrontendLanguage = "typescript" | "javascript";

export type FrontendBundler = "vite" | "webpack" | "parcel" | "esbuild" | "angular-cli" | "framework-default";

export type FrontendStyling =
  | "plain-css"
  | "scss"
  | "tailwind"
  | "css-modules"
  | "styled-components"
  | "emotion";

export type FrontendUiLibrary = "none" | "shadcn" | "mui" | "antd" | "chakra" | "mantine" | "angular-material";

export type FrontendRouter =
  | "file-based"
  | "react-router"
  | "tanstack-router"
  | "vue-router"
  | "angular-router"
  | "solidjs-router"
  | "client-spa";

export type FrontendState = "none" | "redux" | "zustand" | "mobx" | "context" | "pinia" | "ngrx";

/** Transport choice — maps to blueprint `tooling.apiStyle`. */
export type FrontendTransport = "rest" | "graphql" | "trpc";

/** Backend integration choice (separate from transport). */
export type FrontendBackendIntegration = "custom-backend" | "firebase" | "supabase";

export type FrontendUnitTesting = "vitest" | "jest" | "none";

export type FrontendE2ETesting = "playwright" | "cypress" | "none";

export type FrontendDeploymentTarget =
  | "undecided"
  | "vercel"
  | "netlify"
  | "cloudflare-pages"
  | "docker"
  | "azure-static-web-apps"
  | "aws-amplify";

export type FrontendForms =
  | "none-yet"
  | "react-hook-form"
  | "formik"
  | "tanstack-form"
  | "angular-reactive-forms"
  | "vue-vee-validate"
  | "svelte-superforms"
  | "html-native";

export type FrontendValidation =
  | "none-yet"
  | "zod"
  | "yup"
  | "valibot"
  | "superstruct"
  | "class-validator"
  | "built-in-framework";

export type FrontendAnimation = "none" | "framer-motion" | "gsap" | "motion-one" | "auto-animate";

export type FrontendDataFetching =
  | "fetch-only"
  | "tanstack-query"
  | "swr"
  | "apollo-client"
  | "urql"
  | "rtk-query";

export type FrontendA11yApproach =
  | "baseline-semantic-html"
  | "headless-aria-primitives"
  | "component-library-a11y"
  | "formal-a11y-testing";

export type FrontendComponentTooling = "none" | "storybook" | "ladle";

export type FrontendRenderMode = "csr" | "ssr" | "ssg" | "isr" | "hybrid" | "framework-default";

/** Concrete runtime target (replaces vague edgeRendering). */
export type FrontendRuntimeTarget = "node-server" | "edge-runtime" | "static-export" | "hybrid-runtime";

/**
 * Frontend “runtime” is often misread as the app running on Node.
 * Use rendering environment instead (browser vs server vs hybrid).
 *
 * (Legacy: some older blueprints may still contain `runtime` — validator accepts both.)
 */
export type FrontendRenderingEnvironment = "browser" | "server" | "hybrid";

export type FrontendLintFormat = "eslint-prettier" | "biome" | "none";

export type FrontendGitHooks = "none" | "husky-lint-staged" | "lefthook";

export type AstroIslandStrategy = "astro-only" | "react-islands" | "vue-islands" | "svelte-islands" | "mixed-islands";

export type FrontendExtras = {
  pwa: boolean;
  authSketch: boolean;
  darkMode: boolean;
  i18n: boolean;
  seo: boolean;
  storybook: boolean;
  ssr: boolean;
};

export type FrontendStackDetail = {
  framework: FrontendFramework;
  language: FrontendLanguage;
  bundler: FrontendBundler;
  styling: FrontendStyling;
  uiLibrary: FrontendUiLibrary;
  router: FrontendRouter;
  state: FrontendState;
  forms: FrontendForms;
  validation: FrontendValidation;
  animation: FrontendAnimation;
  dataFetching: FrontendDataFetching;
  accessibility: FrontendA11yApproach;
  componentTooling: FrontendComponentTooling;
  astroIslands?: AstroIslandStrategy;
  renderMode: FrontendRenderMode;
  runtimeTarget: FrontendRuntimeTarget;
  renderingEnvironment: FrontendRenderingEnvironment;
  /** Legacy field kept for backwards compatibility in existing files. */
  runtime?: string;
  dxLintFormat: FrontendLintFormat;
  dxGitHooks: FrontendGitHooks;
  packageManager: BlueprintPackageManager;
  transport: FrontendTransport;
  backendIntegration: FrontendBackendIntegration;
  unitTesting: FrontendUnitTesting;
  e2eTesting: FrontendE2ETesting;
  deployment: FrontendDeploymentTarget;
  extras: FrontendExtras;
};

export type AiIntegration = "none" | "openai-http-sketch" | "azure-openai-sketch" | "anthropic-sketch" | "provider-agnostic-placeholder";

export function defaultFrontendDetailForStack(stack: BlueprintFrontendStack): FrontendStackDetail {
  const baseExtras: FrontendExtras = {
    pwa: false,
    authSketch: false,
    darkMode: false,
    i18n: false,
    seo: false,
    storybook: false,
    ssr: false,
  };
  if (stack === "next-ts-fullstack") {
    return {
      framework: "next",
      language: "typescript",
      bundler: "framework-default",
      styling: "tailwind",
      uiLibrary: "shadcn",
      router: "file-based",
      state: "zustand",
      forms: "react-hook-form",
      validation: "zod",
      animation: "framer-motion",
      dataFetching: "tanstack-query",
      accessibility: "headless-aria-primitives",
      componentTooling: "storybook",
      renderMode: "framework-default",
      runtimeTarget: "hybrid-runtime",
      renderingEnvironment: "hybrid",
      dxLintFormat: "eslint-prettier",
      dxGitHooks: "husky-lint-staged",
      packageManager: "pnpm",
      transport: "rest",
      backendIntegration: "custom-backend",
      unitTesting: "vitest",
      e2eTesting: "playwright",
      deployment: "vercel",
      extras: { ...baseExtras, ssr: true, seo: true },
    };
  }
  return {
    framework: "react",
    language: "typescript",
    bundler: "vite",
    styling: "tailwind",
    uiLibrary: "shadcn",
    router: "react-router",
    state: "zustand",
    forms: "react-hook-form",
    validation: "zod",
    animation: "none",
    dataFetching: "tanstack-query",
    accessibility: "headless-aria-primitives",
    componentTooling: "storybook",
    astroIslands: undefined,
    renderMode: "csr",
    runtimeTarget: "node-server",
    renderingEnvironment: "browser",
    dxLintFormat: "eslint-prettier",
    dxGitHooks: "husky-lint-staged",
    packageManager: "pnpm",
    transport: "rest",
    backendIntegration: "custom-backend",
    unitTesting: "vitest",
    e2eTesting: "none",
    deployment: "undecided",
    extras: baseExtras,
  };
}

export function deriveFrontendStack(d: FrontendStackDetail): BlueprintFrontendStack {
  switch (d.framework) {
    case "next":
      return "next-ts-fullstack";
    case "nuxt":
      return "nuxt-ts";
    case "sveltekit":
      return "sveltekit-ts";
    case "remix":
      return "remix-ts";
    case "astro":
      return "astro-ts";
    case "angular":
      return "angular-ts";
    case "vanilla":
      return "static-html-vanilla";
    case "vue":
      return "vite-vue-ts";
    case "solid":
      return "vite-solid-ts";
    case "svelte":
      return "sveltekit-ts";
    case "react":
    default:
      return "vite-react-ts";
  }
}

export function mapTransportToTooling(s: FrontendTransport): BlueprintApiStyle {
  switch (s) {
    case "graphql":
      return "graphql";
    case "trpc":
      return "trpc";
    case "rest":
    default:
      return "rest-json";
  }
}

/** Map blueprint backend `runtime` string to test-stack family (no import of app-blueprint-config). */
export function backendRuntimeToTestKind(runtime: string): "node-ts" | "python" | "go" | "rust" | "other" {
  if (runtime === "python-fastapi") return "python";
  if (runtime === "go-chi-or-stdlib") return "go";
  if (runtime === "rust-axum") return "rust";
  if (
    runtime === "nodejs-fastify" ||
    runtime === "nodejs-express" ||
    runtime === "nodejs-hono" ||
    runtime === "nestjs" ||
    runtime === "next-api-routes" ||
    runtime === "bun-elysia" ||
    runtime === "edge-worker-only"
  ) {
    return "node-ts";
  }
  return "other";
}

export function mapTestFocusToTooling(
  f: FrontendUnitTesting,
  backendKind: "node-ts" | "python" | "go" | "rust" | "other",
): BlueprintTestStack {
  switch (backendKind) {
    case "python":
      return "pytest";
    case "go":
      return "go-test";
    case "rust":
      return "rust-cargo-test";
    case "node-ts":
    default:
      if (f === "jest") return "jest";
      if (f === "none") return "minimal";
      return "vitest";
  }
}

function fwLabel(f: FrontendFramework): string {
  const m: Record<FrontendFramework, string> = {
    react: "React",
    vue: "Vue",
    angular: "Angular",
    svelte: "Svelte (→ SvelteKit stack in factory)",
    solid: "SolidJS",
    vanilla: "Vanilla JS / HTML",
    next: "Next.js (full-stack)",
    nuxt: "Nuxt",
    sveltekit: "SvelteKit",
    remix: "Remix",
    astro: "Astro",
  };
  return m[f];
}

function isMetaFramework(f: FrontendFramework): boolean {
  return f === "next" || f === "nuxt" || f === "sveltekit" || f === "remix" || f === "astro";
}

function isReactFamily(f: FrontendFramework): boolean {
  return f === "react" || f === "next" || f === "remix";
}

function allowedRenderModes(framework: FrontendFramework): FrontendRenderMode[] {
  switch (framework) {
    case "next":
      return ["framework-default", "ssr", "ssg", "isr", "hybrid"];
    case "remix":
      return ["framework-default", "ssr"];
    case "sveltekit":
      return ["framework-default", "hybrid"];
    case "nuxt":
      return ["framework-default", "hybrid"];
    case "astro":
      return ["framework-default", "ssg", "hybrid"];
    case "angular":
      return ["csr", "ssr"];
    case "react":
    case "vue":
    case "solid":
    case "svelte":
    case "vanilla":
    default:
      return ["csr"];
  }
}

function reactOnlyStyling(s: FrontendStyling): boolean {
  return s === "styled-components" || s === "emotion";
}

function reactOnlyUi(u: FrontendUiLibrary): boolean {
  return u === "shadcn" || u === "mui" || u === "antd" || u === "chakra" || u === "mantine";
}

async function pick<T extends string>(message: string, choices: { value: T; label: string }[]): Promise<T> {
  const value = await select({
    message,
    choices: choices.map((c) => ({ name: c.label, value: c.value })),
  });
  return value as T;
}

type PromptDepth = "beginner" | "advanced";

function isMetaFrameworkLike(framework: FrontendFramework): boolean {
  return framework === "next" || framework === "nuxt" || framework === "sveltekit" || framework === "remix" || framework === "astro";
}

export async function promptFrontendStackTree(opts?: { depth?: "beginner" | "advanced"; askDepth?: boolean }): Promise<{
  detail: FrontendStackDetail;
  stack: BlueprintFrontendStack;
  apiStyle: BlueprintApiStyle;
}> {
  const askDepth = opts?.askDepth ?? true;
  const depth: PromptDepth =
    opts?.depth ??
    (askDepth
      ? await pick<PromptDepth>("Frontend wizard depth", [
          { value: "beginner", label: "Beginner — fewer questions, safe defaults (recommended)" },
          { value: "advanced", label: "Advanced — full decision tree" },
        ])
      : "beginner");

  const framework = await pick<FrontendFramework>("1 · Frontend — framework (drives later options)", [
    { value: "react", label: fwLabel("react") },
    { value: "vue", label: fwLabel("vue") },
    { value: "angular", label: fwLabel("angular") },
    { value: "svelte", label: fwLabel("svelte") },
    { value: "solid", label: fwLabel("solid") },
    { value: "vanilla", label: fwLabel("vanilla") },
    { value: "next", label: fwLabel("next") },
    { value: "nuxt", label: fwLabel("nuxt") },
    { value: "sveltekit", label: fwLabel("sveltekit") },
    { value: "remix", label: fwLabel("remix") },
    { value: "astro", label: fwLabel("astro") },
  ]);

  const language: FrontendLanguage =
    framework === "angular"
      ? "typescript"
      : await pick<FrontendLanguage>("2 · Language", [
          { value: "typescript", label: "TypeScript (recommended)" },
          { value: "javascript", label: "JavaScript" },
        ]);

  let bundler: FrontendBundler;
  if (framework === "angular") {
    bundler = "angular-cli";
  } else if (isMetaFramework(framework)) {
    bundler = "framework-default";
  } else {
    const bundlerChoices: { value: FrontendBundler; label: string }[] = [
      { value: "vite", label: "Vite (recommended for SPA)" },
      { value: "webpack", label: "Webpack" },
      { value: "parcel", label: "Parcel" },
      { value: "esbuild", label: "esbuild (CLI / minimal)" },
    ];
    bundler = await pick("3 · Build tool / bundler", bundlerChoices);
  }

  const stylingChoicesAll: { value: FrontendStyling; label: string }[] = [
    { value: "plain-css", label: "Plain CSS" },
    { value: "scss", label: "SCSS / Sass" },
    { value: "tailwind", label: "Tailwind CSS" },
    { value: "css-modules", label: "CSS Modules" },
    { value: "styled-components", label: "Styled Components (React)" },
    { value: "emotion", label: "Emotion (React)" },
  ];
  const stylingChoices = stylingChoicesAll.filter((c) => {
    if (reactOnlyStyling(c.value) && !isReactFamily(framework)) return false;
    return true;
  });
  const styling = await pick("4 · Styling strategy", stylingChoices);

  const uiAll: { value: FrontendUiLibrary; label: string }[] = [
    { value: "none", label: "None (custom or add later)" },
    { value: "shadcn", label: "shadcn/ui (React)" },
    { value: "mui", label: "Material UI (React)" },
    { value: "antd", label: "Ant Design (React)" },
    { value: "chakra", label: "Chakra UI (React)" },
    { value: "mantine", label: "Mantine (React)" },
    { value: "angular-material", label: "Angular Material" },
  ];
  const uiChoices = uiAll.filter((c) => {
    if (c.value === "angular-material" && framework !== "angular") return false;
    if (reactOnlyUi(c.value) && !isReactFamily(framework)) return false;
    return true;
  });
  const uiLibrary = await pick("5 · UI component library (optional)", uiChoices);

  const routerAll: { value: FrontendRouter; label: string }[] = [
    { value: "file-based", label: "File-based / framework router (Next, Nuxt, SvelteKit, Remix)" },
    { value: "react-router", label: "React Router" },
    { value: "tanstack-router", label: "TanStack Router" },
    { value: "vue-router", label: "Vue Router" },
    { value: "angular-router", label: "Angular Router" },
    { value: "solidjs-router", label: "@solidjs/router" },
    { value: "client-spa", label: "Simple SPA (no formal router yet)" },
  ];
  let router: FrontendRouter;
  if (framework === "next" || framework === "nuxt" || framework === "sveltekit" || framework === "remix") {
    router = "file-based";
  } else if (framework === "angular") {
    router = "angular-router";
  } else if (framework === "vue") {
    router = await pick("6 · Routing", routerAll.filter((c) => c.value === "vue-router" || c.value === "client-spa"));
  } else if (framework === "solid") {
    router = await pick("6 · Routing", routerAll.filter((c) => c.value === "solidjs-router" || c.value === "client-spa"));
  } else if (framework === "react") {
    router = await pick("6 · Routing", routerAll.filter((c) => ["react-router", "tanstack-router", "client-spa"].includes(c.value)));
  } else {
    router = "client-spa";
  }

  const stateAll: { value: FrontendState; label: string }[] = [
    { value: "redux", label: "Redux" },
    { value: "zustand", label: "Zustand" },
    { value: "mobx", label: "MobX" },
    { value: "context", label: "React Context only" },
    { value: "pinia", label: "Pinia (Vue)" },
    { value: "ngrx", label: "NgRx (Angular)" },
    { value: "none", label: "None (local component state only)" },
  ];
  let state: FrontendState;
  if (framework === "angular") {
    state = await pick("7 · State management", stateAll.filter((c) => c.value === "none" || c.value === "ngrx"));
  } else if (framework === "vue") {
    state = await pick("7 · State management", stateAll.filter((c) => ["none", "pinia", "mobx"].includes(c.value)));
  } else if (isReactFamily(framework)) {
    state = await pick("7 · State management", stateAll.filter((c) => ["none", "redux", "zustand", "mobx", "context"].includes(c.value)));
  } else {
    state = await pick("7 · State management", stateAll.filter((c) => ["none", "redux", "zustand", "mobx"].includes(c.value)));
  }

  let forms: FrontendForms;
  let validation: FrontendValidation;
  let dataFetching: FrontendDataFetching;
  let animation: FrontendAnimation;
  let accessibility: FrontendA11yApproach;
  let componentTooling: FrontendComponentTooling;

  if (depth === "beginner") {
    forms = "html-native";
    validation = "none-yet";
    dataFetching = "fetch-only";
    animation = "none";
    accessibility = "baseline-semantic-html";
    componentTooling = "none";

    if (isReactFamily(framework)) {
      forms = "react-hook-form";
      validation = "zod";
      dataFetching = "tanstack-query";
      accessibility = "headless-aria-primitives";
      componentTooling = "storybook";
    } else if (framework === "angular") {
      forms = "angular-reactive-forms";
      validation = "built-in-framework";
      accessibility = "component-library-a11y";
    } else if (framework === "vue" || framework === "nuxt") {
      forms = "vue-vee-validate";
      validation = "zod";
    } else if (framework === "astro") {
      validation = "zod";
    }
  } else {
    const formsChoicesAll: { value: FrontendForms; label: string }[] = [
      { value: "none-yet", label: "None yet (keep it simple)" },
      { value: "html-native", label: "HTML native forms only (minimal)" },
      { value: "react-hook-form", label: "React Hook Form (React/Next)" },
      { value: "tanstack-form", label: "TanStack Form (React-ish)" },
      { value: "formik", label: "Formik (React/Next)" },
      { value: "angular-reactive-forms", label: "Angular Reactive Forms" },
      { value: "vue-vee-validate", label: "VeeValidate (Vue/Nuxt)" },
      { value: "svelte-superforms", label: "Superforms (SvelteKit)" },
    ];
    const formsChoices = formsChoicesAll.filter((c) => {
      if ((c.value === "react-hook-form" || c.value === "formik" || c.value === "tanstack-form") && !isReactFamily(framework)) return false;
      if (c.value === "angular-reactive-forms" && framework !== "angular") return false;
      if (c.value === "vue-vee-validate" && !(framework === "vue" || framework === "nuxt")) return false;
      if (c.value === "svelte-superforms" && framework !== "sveltekit") return false;
      return true;
    });
    forms = await pick("7.1 · Forms", formsChoices);

    const validationChoicesAll: { value: FrontendValidation; label: string }[] = [
      { value: "none-yet", label: "None yet" },
      { value: "zod", label: "Zod" },
      { value: "yup", label: "Yup" },
      { value: "valibot", label: "Valibot" },
      { value: "superstruct", label: "Superstruct" },
      { value: "class-validator", label: "class-validator (Nest/TS class-based DTOs)" },
      { value: "built-in-framework", label: "Framework-native (Angular / built-in) — sketch" },
    ];
    const validationChoices = validationChoicesAll.filter((c) => !(c.value === "built-in-framework" && framework !== "angular"));
    validation = await pick("7.2 · Validation library / approach", validationChoices);

    const dataFetchingChoicesAll: { value: FrontendDataFetching; label: string }[] = [
      { value: "fetch-only", label: "fetch only (no client caching library)" },
      { value: "tanstack-query", label: "TanStack Query" },
      { value: "swr", label: "SWR" },
      { value: "apollo-client", label: "Apollo Client (GraphQL)" },
      { value: "urql", label: "urql (GraphQL)" },
      { value: "rtk-query", label: "RTK Query (Redux Toolkit)" },
    ];
    const dataFetchingChoices = dataFetchingChoicesAll.filter((c) => {
      if ((c.value === "swr" || c.value === "tanstack-query" || c.value === "rtk-query") && !(isReactFamily(framework) || framework === "solid")) return false;
      return true;
    });
    dataFetching = await pick("7.3 · Data fetching", dataFetchingChoices);

    const animationChoicesAll: { value: FrontendAnimation; label: string }[] = [
      { value: "none", label: "None" },
      { value: "framer-motion", label: "Framer Motion (React)" },
      { value: "motion-one", label: "Motion One" },
      { value: "auto-animate", label: "Auto Animate" },
      { value: "gsap", label: "GSAP" },
    ];
    const animationChoices = animationChoicesAll.filter((c) => !(c.value === "framer-motion" && !isReactFamily(framework)));
    animation = await pick("7.4 · Animation", animationChoices);

    accessibility = await pick<FrontendA11yApproach>("7.5 · Accessibility approach", [
      { value: "baseline-semantic-html", label: "Baseline: semantic HTML + keyboard focus discipline" },
      { value: "headless-aria-primitives", label: "Headless / aria primitives (Radix / Headless UI style)" },
      { value: "component-library-a11y", label: "Rely on component library defaults (document constraints)" },
      { value: "formal-a11y-testing", label: "Formal a11y testing posture (axe + CI checks)" },
    ]);

    componentTooling = await pick<FrontendComponentTooling>("7.6 · Component tooling", [
      { value: "none", label: "None" },
      { value: "storybook", label: "Storybook" },
      { value: "ladle", label: "Ladle (lightweight Storybook-like; React-centric)" },
    ]);
  }

  let astroIslands: AstroIslandStrategy | undefined;
  if (framework === "astro") {
    astroIslands =
      depth === "beginner"
        ? "astro-only"
        : await pick<AstroIslandStrategy>("7.6a · Astro island strategy", [
            { value: "astro-only", label: "Astro only (no framework islands)" },
            { value: "react-islands", label: "React islands" },
            { value: "vue-islands", label: "Vue islands" },
            { value: "svelte-islands", label: "Svelte islands" },
            { value: "mixed-islands", label: "Mixed islands (multiple frameworks)" },
          ]);
  }

  const renderModeChoicesAll: { value: FrontendRenderMode; label: string }[] = [
    { value: "framework-default", label: "Framework default / mixed (recommended for meta-frameworks)" },
    { value: "csr", label: "CSR (client-side render only)" },
    { value: "ssr", label: "SSR (server-side render)" },
    { value: "ssg", label: "SSG (static site generation)" },
    { value: "isr", label: "ISR (incremental static regeneration)" },
    { value: "hybrid", label: "Hybrid (mix CSR/SSR/SSG/ISR)" },
  ];
  const allowed = new Set(allowedRenderModes(framework));
  const renderModeChoices = renderModeChoicesAll.filter((c) => allowed.has(c.value));
  const renderMode = depth === "beginner" ? (renderModeChoices[0]?.value ?? "csr") : await pick("7.7 · Runtime rendering mode", renderModeChoices);

  const renderingEnvironment: FrontendRenderingEnvironment = renderMode === "csr" ? "browser" : renderMode === "ssr" ? "server" : "hybrid";

  const dxLintFormat =
    depth === "beginner"
      ? "eslint-prettier"
      : await pick<FrontendLintFormat>("7.9 · Frontend DX: lint & format", [
          { value: "eslint-prettier", label: "ESLint + Prettier" },
          { value: "biome", label: "Biome" },
          { value: "none", label: "None / later" },
        ]);

  const dxGitHooks =
    depth === "beginner"
      ? "husky-lint-staged"
      : await pick<FrontendGitHooks>("7.10 · Frontend DX: git hooks / pre-commit", [
          { value: "none", label: "None" },
          { value: "husky-lint-staged", label: "Husky + lint-staged (typical JS workflow)" },
          { value: "lefthook", label: "Lefthook" },
        ]);

  const transport = await pick<FrontendTransport>("8.1 · Transport (maps to blueprint API style)", [
    { value: "rest", label: "REST + JSON" },
    { value: "graphql", label: "GraphQL" },
    { value: "trpc", label: "tRPC (TypeScript)" },
  ]);

  const backendIntegration = await pick<FrontendBackendIntegration>("8.2 · Backend integration (separate from transport)", [
    { value: "custom-backend", label: "Custom backend (your API)" },
    { value: "firebase", label: "Firebase" },
    { value: "supabase", label: "Supabase" },
  ]);

  const unitTesting =
    depth === "beginner"
      ? (isMetaFrameworkLike(framework) || isReactFamily(framework) || framework === "solid" ? "vitest" : "none")
      : await pick<FrontendUnitTesting>("9.1 · Unit testing", [
          { value: "vitest", label: "Vitest" },
          { value: "jest", label: "Jest" },
          { value: "none", label: "None / later" },
        ]);

  const e2eTesting =
    depth === "beginner"
      ? "none"
      : await pick<FrontendE2ETesting>("9.2 · E2E testing", [
          { value: "playwright", label: "Playwright" },
          { value: "cypress", label: "Cypress" },
          { value: "none", label: "None / later" },
        ]);

  const deployment = await pick<FrontendDeploymentTarget>("10 · Deployment target (intent for docs / CI)", [
    { value: "undecided", label: "Undecided" },
    { value: "vercel", label: "Vercel" },
    { value: "netlify", label: "Netlify" },
    { value: "cloudflare-pages", label: "Cloudflare Pages" },
    { value: "docker", label: "Docker / container" },
    { value: "azure-static-web-apps", label: "Azure Static Web Apps" },
    { value: "aws-amplify", label: "AWS Amplify Hosting" },
  ]);

  const extrasAns = await checkbox({
    message: "11 · Optional frontend extras",
    choices: [
      { value: "pwa", name: "PWA", checked: false },
      { value: "authSketch", name: "Auth placeholder (routes / env hints)", checked: false },
      { value: "darkMode", name: "Dark mode ready", checked: false },
      { value: "i18n", name: "i18n hooks", checked: false },
      { value: "seo", name: "SEO / meta helpers", checked: false },
      { value: "storybook", name: "Storybook", checked: false },
      { value: "ssr", name: "SSR / streaming (if not already implied by framework)", checked: false },
    ],
  });
  const extras: FrontendExtras = {
    pwa: extrasAns.includes("pwa"),
    authSketch: extrasAns.includes("authSketch"),
    darkMode: extrasAns.includes("darkMode"),
    i18n: extrasAns.includes("i18n"),
    seo: extrasAns.includes("seo"),
    storybook: extrasAns.includes("storybook"),
    ssr: extrasAns.includes("ssr"),
  };

  const packageManager =
    depth === "beginner"
      ? "pnpm"
      : await pick<BlueprintPackageManager>("12 · Package manager", [
          { value: "pnpm", label: "pnpm" },
          { value: "npm", label: "npm" },
          { value: "yarn", label: "yarn" },
          { value: "bun", label: "bun" },
        ]);

  const runtimeTarget =
    depth === "beginner"
      ? (isMetaFrameworkLike(framework) ? "hybrid-runtime" : "node-server")
      : await pick<FrontendRuntimeTarget>("13 · Runtime target (deployment semantics)", [
          { value: "node-server", label: "Node server runtime" },
          { value: "edge-runtime", label: "Edge runtime" },
          { value: "static-export", label: "Static export" },
          { value: "hybrid-runtime", label: "Hybrid runtime" },
        ]);

  const detail: FrontendStackDetail = {
    framework,
    language,
    bundler,
    styling,
    uiLibrary,
    router,
    state,
    forms,
    validation,
    animation,
    dataFetching,
    accessibility,
    componentTooling,
    astroIslands,
    renderMode,
    runtimeTarget,
    renderingEnvironment,
    dxLintFormat,
    dxGitHooks,
    packageManager,
    transport,
    backendIntegration,
    unitTesting,
    e2eTesting,
    deployment,
    extras,
  };

  const stack = deriveFrontendStack(detail);
  const apiStyle = mapTransportToTooling(transport);

  return { detail, stack, apiStyle };
}

export async function promptAiIntegration(): Promise<{ integration: AiIntegration; notes?: string }> {
  const integration = await pick<AiIntegration>("AI integrations (backend / product — sketch only in scaffold today)", [
    { value: "none", label: "None" },
    { value: "openai-http-sketch", label: "OpenAI-compatible HTTP API (env + placeholder)" },
    { value: "azure-openai-sketch", label: "Azure OpenAI (env + placeholder)" },
    { value: "anthropic-sketch", label: "Anthropic Messages API (sketch)" },
    { value: "provider-agnostic-placeholder", label: "Provider-agnostic LLM boundary (interface only)" },
  ]);
  if (integration === "none") return { integration };
  const addNote = await confirm({ message: "Add a short free-text note in the blueprint?", default: false });
  if (!addNote) return { integration };
  const notes = await input({ message: "Notes (e.g. regions, model family)", default: "" });
  return { integration, notes: notes.trim() || undefined };
}

/** Loose validation for persisted JSON (optional block). */
export function isValidFrontendDetail(x: unknown): x is FrontendStackDetail {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  const fw = o.framework;
  const okFw =
    fw === "react" ||
    fw === "vue" ||
    fw === "angular" ||
    fw === "svelte" ||
    fw === "solid" ||
    fw === "vanilla" ||
    fw === "next" ||
    fw === "nuxt" ||
    fw === "sveltekit" ||
    fw === "remix" ||
    fw === "astro";
  if (!okFw) return false;
  if (o.extras !== undefined) {
    if (o.extras === null || typeof o.extras !== "object" || Array.isArray(o.extras)) return false;
  }
  // Backward compatibility: older files used `runtime` instead of `renderingEnvironment`.
  // Accept either; new writes should use `renderingEnvironment`.
  const hasRenderingEnv = typeof o.renderingEnvironment === "string";
  const hasLegacyRuntime = typeof o.runtime === "string";
  return (
    typeof o.language === "string" &&
    typeof o.bundler === "string" &&
    typeof o.styling === "string" &&
    typeof o.uiLibrary === "string" &&
    typeof o.router === "string" &&
    typeof o.state === "string" &&
    typeof o.forms === "string" &&
    typeof o.validation === "string" &&
    typeof o.animation === "string" &&
    typeof o.dataFetching === "string" &&
    typeof o.accessibility === "string" &&
    typeof o.componentTooling === "string" &&
    (o.astroIslands === undefined || typeof o.astroIslands === "string") &&
    typeof o.renderMode === "string" &&
    typeof o.runtimeTarget === "string" &&
    (hasRenderingEnv || hasLegacyRuntime) &&
    typeof o.dxLintFormat === "string" &&
    typeof o.dxGitHooks === "string" &&
    typeof o.packageManager === "string" &&
    typeof o.transport === "string" &&
    typeof o.backendIntegration === "string" &&
    typeof o.unitTesting === "string" &&
    typeof o.e2eTesting === "string"
  );
}

export function isValidAiBlock(x: unknown): x is { integration: AiIntegration; notes?: string; usagePattern?: string } {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  const i = o.integration;
  if (
    i !== "none" &&
    i !== "openai-http-sketch" &&
    i !== "azure-openai-sketch" &&
    i !== "anthropic-sketch" &&
    i !== "provider-agnostic-placeholder"
  ) {
    return false;
  }
  if (o.notes !== undefined && typeof o.notes !== "string") return false;
  if (o.usagePattern !== undefined && typeof o.usagePattern !== "string") return false;
  return true;
}
