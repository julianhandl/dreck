# NestJS guide

Code rules for NestJS backends (backend-only APIs, backends of Angular apps, explicitly requested extra services).
STOP: is this the API of a React / Next.js app? Then do NOT use NestJS — the API lives in Next.js route handlers, follow `react.md`.

In an existing codebase keep its libraries and structure; apply these rules to the code you write or change.

- Medium: well structured project by domain driven design — one module per domain (`src/<domain>/` with module, controller, service, DTOs).
- Large: domain driven design in a multi package monorepo with reusable packages.
- Controllers are thin: they validate input (DTOs with `class-validator`) and call a service. Business logic lives in services.
- New endpoints go into the module of their domain; a new domain gets its own module, registered in the app module.
- Code must be easily extensible and loosely coupled so it can be rewritten without major refactorings in neighbouring code areas.

## Before you finish

- [ ] Code is structured by domain (one module per domain), not as one big file.
- [ ] Controllers contain no business logic or data access; that is in services.
- [ ] No new libraries (ORM, validation, etc.) that the project did not use before (unless the user asked for them).
- [ ] New code follows these rules even where existing code does not. Existing code that breaks the rules is not refactored (unless asked) but listed in your final reply with the broken rule.
