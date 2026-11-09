
<!-- ix-development-advantage:agents:start -->

# Agent Instructions

## Communication Style

- No sycophancy
- Be critical and challenge my reasoning
- Use our common language based on GLOSSARY.md
- Drop filler words (just/really/basically/actually/simply)
- Drop pleasantries (sure/certainly/of course/happy to)
- Drop hedging phrases
- Keep articles (a/an/the) and full sentences
- Stay professional but tight
- Technical terms stay exact
- Code blocks unchanged

Pattern: `[thing] [action] [reason]. [next step].`

Example:

- Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
- Yes: "Bug in auth middleware. Token expiry check uses `<` not `<=`. Fix:"

### Auto-Clarify

Switch to normal communication for:

- Security warnings
- Irreversible action confirmations
- Multi-step sequences where fragment order risks misread
- Technical ambiguity from compression
- User asks to clarify or repeats question

Resume lite caveman after clear part done.

Example — destructive operation:

> **Warning:** This will permanently delete all rows in the `users` table and cannot be undone.
>
> ```sql
> DROP TABLE users;
> ```
>
> Verify backup exists first.

## Be lazy

Default to the laziest solution that actually works — lazy means efficient, not careless. Before writing code, climb this ladder and stop at the first rung that holds:

1. Does this need to exist at all? Speculative need = skip it, say so in one line.
2. Already in this codebase? Reuse the existing helper/util/pattern instead of re-implementing it.
3. Stdlib or a runtime built-in does it? Use that.
4. A native platform feature covers it (HTML input, CSS, DB constraint)? Use that before a dependency.
5. An already-installed dependency solves it? Use it — don't add a new one.
6. Can it be one line? Make it one line.
7. Only then: the minimum code that works.

No unrequested abstractions (no interface for one implementation, no config for a value that never changes), no boilerplate "for later". Bug fix = root cause, not symptom: grep callers and fix it once where they all route through, not just the path the report named.

Never simplify away input validation, error handling, security, accessibility, or anything explicitly requested.

## Package manager

Use `bun` if not specified otherwise.

## Platform configuration (detect once, persist, reuse)

The project's issue tracker, git provider, and DevOps platform are recorded in a
self-managed block in `AGENTS.md`, delimited by:

This block lives **outside** the `ix-development-advantage:agents` managed block
so `setup` never overwrites it. Rules for every agent and skill:

1. **Read first.** Before detecting the tracker/git provider, read this block. If
   it answers the question, use it — do not re-run detection or ask the user.
2. **Detect only on a miss.** If the block is absent or missing the needed key,
   detect it (issue key/URL shape, `git remote get-url origin`, lockfile, etc.),
   confirm with the user when ambiguous, then **persist** it.
3. **Persist by editing the block in place.** Create it if missing (insert after
   the `ix-development-advantage:agents:end` marker). Update a single key without
   touching the rest. Never duplicate the markers.
4. **Keep it declarative** — platform names, remotes, CLIs, and stable ids only.
   No secrets/tokens. Reviewer ids and project ids are allowed; API tokens are not.
5. **Repo override.** If the repo designates another location for this config
   (e.g. a note in the agent system prompt pointing at another file), read and
   persist there instead of `AGENTS.md`. Follow the redirect when present.

## Planning Documents

Keep planning compact. Single file preferred over multiple documents.
Avoid creating excessive planning artifacts.
Focus on actionable decisions, not documentation overhead.

## Documentation

Always fetch current docs before implementation.

1. Try to use context7 mcp (if availalbe)
2. Fetch the library docs website as a fallback

Never rely on training data for library APIs.

## Runtime Debugging

After implementing frontend features, use the configured Chrome DevTools MCP server to:

Verify feature works in an actual browser and check the console for errors.
If it fails to connect, tell the user to check the local Chrome and Node.js installation manually.

## TypeScript Styleguide

- `strict: true`, kein `any` — `unknown` + Type Guards
- `type` für alle Type-Definitionen, `interface` nur für Class Interfaces
- Alle Funktionen: strikt typisierte Parameter und explizite Return Types
- Optional Chaining (`?.`) und Nullish Coalescing (`??`) bevorzugen
- `async`/`await` statt roher Promises
- PascalCase für Types/Classes, camelCase für Variablen/Funktionen, UPPER_SNAKE_CASE für Konstanten
- Kein `I`-Prefix für Interfaces

## Platforms

- issue_tracker: local-markdown
- git_provider: github
- base_branch: main
- pkg_manager: bun