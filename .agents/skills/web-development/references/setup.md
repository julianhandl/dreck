# Setup guide — new projects only

Use this only when you create a new project or add a part that does not exist yet (e.g. the first backend). Never use it to restructure or migrate an existing codebase.

## Choose the stack

| Size   | Frontend                            | State                         | Styling                    | Backend                                                        |
|--------|-------------------------------------|-------------------------------|----------------------------|----------------------------------------------------------------|
| POC    | native html, css, js, 1 file/route  | none / plain variables        | BEM in `<style>` block     | none; if unavoidable hono                                      |
| Small  | React SPA with Vite                 | context, hooks, props         | Tailwind CSS               | hono in `api/` folder                                          |
| Medium | React → Next.js; Angular            | zustand / Angular services    | Tailwind CSS               | React → Next.js route handlers (no separate backend project); Angular → NestJS |
| Large  | like Medium, in monorepo packages   | zustand / Angular services    | Tailwind CSS               | like Medium                                                    |

- If not specified otherwise, the size is Medium and the frontend framework is React.
- Backend only (no frontend at all, e.g. an API for a mobile app) → NestJS for every size.
- React + "REST backend / API in the same repo" (Medium/Large) → that backend IS the Next.js route handlers in `app/api/`. Do not create a separate `backend/` project.
- A first backend for an existing Angular app → NestJS.

## Set up

- POC: one HTML file per route. No `package.json`, no build setup, no framework.
- Small React: Vite + React + TypeScript. Tailwind: add `tailwindcss` and `@tailwindcss/vite`, register the plugin in `vite.config.ts`, entry CSS contains `@import "tailwindcss";`. Backend: hono in `api/`.
- Medium/Large React: Next.js App Router (`app/`, no `pages/`). Tailwind: add `tailwindcss`, `@tailwindcss/postcss`, `postcss`; `postcss.config.mjs` with `@tailwindcss/postcss`; `app/globals.css` contains `@import "tailwindcss";`. Add `zustand`.
- Every new React project (Small and Medium/Large): add `@base-ui/react` as the foundation for accessible interactive components (dialog, tabs, menu, select, …; imports like `@base-ui/react/dialog`). Put `isolation: isolate` on the root wrapper in the layout so portaled popups stay on top.
- Angular: Angular CLI project. Tailwind:
  1. `package.json`: add `tailwindcss`, `@tailwindcss/postcss` and `postcss` to `devDependencies`.
  2. Create `.postcssrc.json` with `{ "plugins": { "@tailwindcss/postcss": {} } }`.
  3. Create `src/styles.css` containing `@import "tailwindcss";`.
  4. `angular.json`: add `"src/styles.css"` to `styles` in the build options.
- NestJS: Nest CLI project structure, one module per domain, `class-validator` for DTOs.
- Large: multi package monorepo (e.g. pnpm workspaces) with reusable domain packages.

After the setup, write the code with the rules from the framework guide (`react.md`, `angular.md`, `nestjs.md`, `hono.md` or `poc.md`).

## Before you finish

- [ ] The stack matches the table above (size, framework, state, styling, backend).
- [ ] The styling tool is set up completely (dependencies in `package.json` and config files), not only used in class names.
- [ ] Medium/Large React: no separate `backend/` project, no NestJS, no Express.
- [ ] React: `@base-ui/react` is in `package.json`, and dialogs/tabs/menus use it.
