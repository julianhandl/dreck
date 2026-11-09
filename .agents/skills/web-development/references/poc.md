# POC guide

Code rules for POC sized projects (very small, short lived, "just make it work").

- Frontend: native html, css and js in one file per route. No framework.
- Styling: BEM class names (`block__element--modifier`, e.g. `weather-card__temp--warm`). Put the CSS in a `<style>` block inside the same HTML file. No Tailwind, no CSS framework, no separate CSS file, no `style="…"` attributes.
- State: none or plain JavaScript variables.
- Backend: try to avoid a backend altogether; if unavoidable use hono (read `hono.md`).
