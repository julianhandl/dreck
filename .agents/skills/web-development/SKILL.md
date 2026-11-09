---
name: web-development
description: "Required coding standards for every web project. Load this skill FIRST — before exploring or editing files — whenever the task touches a web codebase (package.json, src/, .ts/.tsx/.html/.css files; React, Next.js, Angular, NestJS, Node/hono) or asks for a new web app, POC, prototype or REST API. Typical tasks: add a feature, page, route, table, list, form, dialog, badge, filter or button (Feature, Seite, Tabelle, Formular, Komponente), extend a store/service/API endpoint, fix styling or accessibility. It defines component structure, where logic lives (hooks/services), state, folder structure, styling (BEM vs. Tailwind), accessibility (WCAG 2.2) and the backend framework. Applies even if the user does not mention standards or the stack. Not for non-web code (CLI tools, scripts, data pipelines, mobile-native apps)."
---

# Web Development standards

This file contains the basics. The concrete rules and examples are in the `references/` folder next to this SKILL.md.

## Step 1: Existing codebase or new project?

**Existing codebase** (there is already app code, e.g. a `package.json` or `src/`):

- Do not restructure or migrate it. Keep its framework, styling approach, state library, folder structure and backend.
- Do not add tools it does not use yet (no new Tailwind, Next.js, NestJS, state library, CSS framework).
- Follow its conventions where the rules leave a choice: naming, file locations, extend existing stores/services instead of creating parallel ones.
- Before writing UI, open the shared component folder (`components/ui/`, `shared/`, `components/`) and use what is there — the project's `Button`, `Card`, `Input` instead of a raw `<button>` or a new copy.
- The rules always win over existing code: write every new file and every new piece of code by the rules of the framework guide (Step 2), even if existing code does it differently. Existing code that breaks the rules is not an example to copy.
- Do not refactor existing code that breaks the rules unless the user explicitly asks for it. If you have to change such a file, make only the requested change and leave its structure as it is.
- Push back instead: in your final reply, list the existing files that break the rules (which file, which rule) and offer to refactor them.

**New project** (empty folder, nothing to extend) or a new part that does not exist yet (e.g. the first backend):

- You MUST read `references/setup.md` first. It decides the stack and shows the setup.

### General Rules

Structure the codebase, components, services, packages and so on to be composable and reusable easily.
Code must be easily extensible and loosely coupled so it can be rewritten without major refactorings in neighbouring code areas.
If not specified otherwise, assume the project size to be medium.

### Project sizes

- POC | very small and short lived. No special structure needed. Just make it work from the client facing side.
- Small | clear project structure and easily extensible. Small projects tend to grow into medium sized ones.
- Medium | Well structured project by domain driven design.
- Large | Domain driven design in a multi package monorepo.

In an existing codebase, read the size from its structure: single HTML files → POC; SPA with context/props and no state library → Small; domain folders or a state library (zustand, Angular stores) → Medium; monorepo with packages → Large.

## Step 2: Read the framework guide — REQUIRED

You MUST read the matching guide file(s) from this skill before you write or change any code. They contain the concrete rules and examples you have to follow; this SKILL.md alone is not enough to do the task correctly.

The files are in the `references/` folder in the same directory as this SKILL.md. Read every file that applies to the code you write.
Always read them with an absolute path: workspace root + `.bob/skills/web-development/references/<file>` (or `.claude/skills/web-development/references/<file>`), e.g. `/path/to/project/.bob/skills/web-development/references/angular.md`.
Do not search for the files with glob. If a read fails, retry with that absolute path. Never continue without the guide.

| Your code is                                             | You MUST read                               |
| -------------------------------------------------------- | ------------------------------------------- |
| New project or new part                                  | `references/setup.md` (first)               |
| POC (plain html, css, js)                                | `references/poc.md`                         |
| React (SPA or Next.js)                                   | `references/react.md`                       |
| Angular                                                  | `references/angular.md`                     |
| hono backend                                             | `references/hono.md`                        |
| NestJS backend                                           | `references/nestjs.md`                      |
| Any styling (CSS, Tailwind classes, `<style>`)           | `references/styling.md` (in addition)       |
| Any UI (markup, forms, buttons, menus, tables, messages) | `references/accessibility.md` (in addition) |

Examples: feature in an existing Next.js app (including its API) → only `react.md`. Feature in an existing Angular app → `angular.md`. Endpoint in an existing NestJS API → `nestjs.md`. New backend-only API → `setup.md` and `nestjs.md`. A component with styling → the framework guide, `styling.md` and `accessibility.md`.

Only read the files for your stack; do not apply rules from other frameworks' files.

## Step 3: Implement

Implement following Step 1 and the rules from the guide files read in Step 2.
Before you finish, go through the "Before you finish" checklist at the end of every guide file you read and fix everything that is not done.
