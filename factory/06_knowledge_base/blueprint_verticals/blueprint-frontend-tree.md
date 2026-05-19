# Frontend decision tree (manual stack wizard)

This documents the interactive prompts implemented in `factory/blueprint-frontend-tree.ts`.

It is a **frontend-first** decision tree: earlier choices constrain later choices (compatibility rules).

Legend:
- `◆` decision (single-select)
- `▣` multi-select (checkboxes)
- `→` implies / derives
- `⛔` option not offered (incompatible)
- `(*)` auto-picked (no prompt shown)

---

## Ease-of-use modes

The wizard now starts with:

◆ **Frontend wizard depth**
- **Beginner**: asks only the “big knobs” and **auto-fills** advanced nodes with safe defaults
- **Advanced**: asks the full tree below

In **Beginner** mode, the following are **auto-derived** (still written into `frontendDetail`):
forms, validation, data fetching, animation, accessibility posture, component tooling, render mode, DX tooling, unit/e2e testing defaults, package manager, runtime target.

---

## Tree (vertical)

◆ **1 · Framework**  
├─ React  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Vite | Webpack | Parcel | esbuild  
│  ├─ ◆ 4 Styling: Plain CSS | SCSS | Tailwind | CSS Modules | Styled Components | Emotion  
│  ├─ ◆ 5 UI library: None | shadcn/ui | MUI | AntD | Chakra | Mantine  
│  ├─ ◆ 6 Router: React Router | TanStack Router | Simple SPA  
│  ├─ ◆ 7 State: None | Redux | Zustand | MobX | Context  
│  ├─ ◆ 7.1 Forms: React Hook Form | TanStack Form | Formik | None | HTML native  
│  ├─ ◆ 7.2 Validation: Zod | Yup | Valibot | Superstruct | None  
│  ├─ ◆ 7.3 Data fetching: fetch-only | TanStack Query | SWR | RTK Query  
│  ├─ ◆ 7.4 Animation: Framer Motion | Motion One | Auto Animate | GSAP | None  
│  ├─ ◆ 7.5 Accessibility: semantic baseline | headless/aria primitives | library defaults | formal a11y testing  
│  ├─ ◆ 7.6 Component tooling: Storybook | Ladle | None  
│  ├─ ◆ 7.7 Render mode: CSR (SPA)  
│  ├─ ◆ 7.8 Edge rendering: none | optional | default  
│  ├─ ◆ 7.9 Runtime: Node | (meta-framework default when applicable)  
│  ├─ ◆ 7.10 DX lint/format: ESLint+Prettier | Biome | None  
│  ├─ ◆ 7.11 DX git hooks: none | Husky+lint-staged | Lefthook  
│  └─ … continues to API / tests / deploy / extras
│
├─ Vue  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Vite | Webpack | Parcel | esbuild  
│  ├─ ◆ 4 Styling: Plain CSS | SCSS | Tailwind | CSS Modules  
│  │  └─ ⛔ Styled Components / Emotion  
│  ├─ ◆ 5 UI library: None  
│  │  └─ ⛔ shadcn/MUI/AntD/Chakra/Mantine (React-only)  
│  ├─ ◆ 6 Router: Vue Router | Simple SPA  
│  ├─ ◆ 7 State: None | Pinia | MobX
│  ├─ ◆ 7.1 Forms: VeeValidate | None | HTML native  
│  ├─ ◆ 7.2 Validation: Zod | Yup | Valibot | Superstruct | None  
│  └─ (data fetching / a11y / tooling prompts still appear; React-only options remain hidden)
│
├─ Angular  
│  ├─ ◆ 2 Language: TypeScript (*)  
│  ├─ ◆ 3 Bundler: Angular CLI (*)  
│  ├─ ◆ 4 Styling: Plain CSS | SCSS | Tailwind | CSS Modules  
│  │  └─ ⛔ Styled Components / Emotion  
│  ├─ ◆ 5 UI library: None | Angular Material  
│  ├─ ◆ 6 Router: Angular Router (*)  
│  ├─ ◆ 7 State: None | NgRx
│  ├─ ◆ 7.1 Forms: Angular Reactive Forms (*)  
│  ├─ ◆ 7.2 Validation: framework-native (*) or class-validator (sketch)  
│  └─ (rest continues)
│
├─ Next.js (full-stack)  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Framework default (*)  
│  ├─ ◆ 4 Styling: Plain CSS | SCSS | Tailwind | CSS Modules | Styled Components | Emotion  
│  ├─ ◆ 5 UI library: None | shadcn/ui | MUI | AntD | Chakra | Mantine  
│  ├─ ◆ 6 Router: File-based (*)  
│  ├─ ◆ 7.7 Render mode: framework-default (*) | SSR | SSG | ISR | Hybrid  
│  ├─ ◆ 7.9 Runtime: framework-default (*)  
│  └─ (rest same as React-capable branches)
│
├─ Nuxt  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Framework default (*)  
│  ├─ ◆ 6 Router: File-based (*)  
│  └─ (styling/UI filtered like non-React)
│
├─ SvelteKit  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Framework default (*)  
│  ├─ ◆ 6 Router: File-based (*)  
│  └─ (styling/UI filtered like non-React)
│
├─ Remix  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Framework default (*)  
│  ├─ ◆ 6 Router: File-based (*)  
│  └─ (React-based: inherits React/Next-compatible styling/UI/forms/data-fetching options)
│
├─ Astro  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Framework default (*)  
│  ├─ ◆ 6 Router: File-based (*)  
│  ├─ ◆ 7.6a Island strategy: Astro only | React islands | Vue islands | Svelte islands | Mixed islands  
│  └─ (Astro-specific: not a standard SPA; render modes constrained)
│
├─ SolidJS  
│  ├─ ◆ 2 Language: TypeScript | JavaScript  
│  ├─ ◆ 3 Bundler: Vite | Webpack | Parcel | esbuild  
│  ├─ ◆ 6 Router: @solidjs/router | Simple SPA  
│  └─ (styling/UI filtered like non-React)
│
└─ Vanilla (HTML/JS)  
   ├─ ◆ 2 Language: TypeScript | JavaScript  
   ├─ ◆ 3 Bundler: Vite | Webpack | Parcel | esbuild  
   ├─ ◆ 6 Router: Simple SPA (*)  
   └─ (styling/UI/state are minimal; React-only choices hidden)

---

## Shared steps (after framework branch)

These steps always appear (with choice sets filtered by framework).

◆ **8 · Client ↔ API strategy**  
◆ **8.1 · Transport**  
`REST` | `GraphQL` | `tRPC`

◆ **8.2 · Backend integration**  
`Custom backend` | `Firebase` | `Supabase`

→ **Derives** `tooling.apiStyle` from **Transport**:
- REST → `rest-json`
- GraphQL → `graphql`
- tRPC → `trpc`

◆ **9.1 · Unit testing**  
`Vitest` | `Jest` | `None`

◆ **9.2 · E2E testing**  
`Playwright` | `Cypress` | `None`

→ **Derives** `tooling.testing` later (after backend runtime is selected):
- Node-family backend → `vitest` (or `jest` when explicitly picked; `None` → `minimal`)
- Python backend → `pytest`
- Go backend → `go-test`
- Rust backend → `rust-cargo-test`

◆ **10 · Deployment target (intent)**  
`Undecided` | `Vercel` | `Netlify` | `Cloudflare Pages` | `Docker` | `Azure Static Web Apps` | `AWS Amplify`

▣ **11 · Optional frontend extras**  
`PWA` | `Auth placeholder` | `Dark mode` | `i18n hooks` | `SEO helpers` | `Storybook` | `SSR flag`

◆ **12 · Package manager**  
`pnpm` | `npm` | `yarn` | `bun`

◆ **13 · Runtime target (deployment semantics)**  
`Node server runtime` | `Edge runtime` | `Static export` | `Hybrid runtime`

---

## Outputs (what gets written)

---

## Render mode constraints (owned by compatibility engine)

`7.7 · Runtime rendering mode` is **framework-constrained**:

- **React + Vite**: CSR only
- **Next.js**: framework-default, SSR, SSG, ISR, Hybrid
- **Astro**: framework-default, SSG, Hybrid
- **Angular**: CSR, SSR
- **Remix**: framework-default, SSR
- **SvelteKit**: framework-default, Hybrid

The tree produces two key outputs:

- **Coarse scaffold key**: `frontend.stack` (a `FrontendStack` union)  
  Used by `mfg app scaffold` today.
- **Rich capture**: `frontendDetail`  
  Stored in `app.stack.json` for agents + future scaffold improvements.

Mapping from framework to coarse `frontend.stack` (simplified):
- React → `vite-react-ts`
- Vue → `vite-vue-ts`
- Solid → `vite-solid-ts`
- Angular → `angular-ts`
- Next → `next-ts-fullstack`
- Nuxt → `nuxt-ts`
- Svelte/SvelteKit → `sveltekit-ts`
- Remix → `remix-ts`
- Astro → `astro-ts`
- Vanilla → `static-html-vanilla`

---

## Notes / constraints

- This is **documentation of the prompts**, not a guarantee that scaffold templates exist for every combination yet.
- Today, `factory/app-scaffold.ts` still only scaffolds `frontend.stack === "vite-react-ts"` (v1 limitation). The tree is captured so the factory can grow without losing the negotiated choices.

