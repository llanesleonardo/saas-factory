# Architecture review — todo-instance Phase 7 UI stack (003) — 2026-05-08

## Context

Phase 7 is **local-only UX/UI polish** per **`architecture-review-002-2026-05-08.md`**. Product asked to standardize on **Tailwind CSS** plus a **lightweight** headless component layer—not a heavy full design system.

## Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Styling | **Tailwind CSS v3** (+ PostCSS) | Utility-first, fits Vite; **`darkMode: 'media'`** maps to `prefers-color-scheme`. **v4** is possible later via `@tailwindcss/postcss` / Vite plugin—pin deliberately. |
| Primitives | **Headless UI** (`@headlessui/react`) | Small surface, **accessible** behavior for buttons, menus, listbox-style patterns; pairs with Tailwind classes. No shipped visual skin—stays lightweight. |

## Out of scope for this vertical (Phase 7)

- **Material UI, Chakra, Mantine** — heavier runtime + styling models; unnecessary for a teaching vertical.
- **daisyUI** — optional later; adds opinionated components on top of Tailwind; defer unless PM expands scope.
- **shadcn/ui** — copy-paste pattern, not a single versioned dependency; acceptable as a future refactor if the org adopts it repo-wide.

## Boundaries

- **Domain logic** stays in **`todos.model.ts`**, **storage** in **`todos.storage.ts`**, **portable** in **`todos.portable.ts`**. UI is presentation + wiring only.
- **Tailwind** owns spacing/color/type scale; avoid parallel bespoke CSS files except `index.css` entry and rare `@layer` additions.

## Handoff

- **Tooling / Dev:** wire PostCSS + Tailwind + Vite; keep **ESLint** green (no unused Headless imports).
- **Spec / PM:** Phase 7 acceptance names Tailwind + Headless UI explicitly.
