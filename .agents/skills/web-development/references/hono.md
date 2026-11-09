# hono guide

Code rules for hono backends (Small projects with a frontend, rare POC backends).
A backend without any frontend uses NestJS — read `nestjs.md` instead.

- The hono backend lives in the `api` folder, separate from the frontend code.
- Clear project structure and easily extensible: Small projects tend to grow into medium sized ones. Group routes by domain (e.g. `api/routes/todos.ts`), keep logic out of the route definitions.
