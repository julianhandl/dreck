# Styling guide

Read for every change that touches styling: CSS files, Tailwind classes, `<style>` blocks, component styles.
Keep the project's styling approach (Tailwind, CSS files, BEM); these rules decide how values are written.

- Design tokens: colors (also neutrals like text gray and white), spacing and font sizes come from CSS custom properties, so a design change is one edit instead of a search through every component. A raw value used fewer than 3 times may stay hardcoded with `/* TODO: token */`; at 3 or more uses create a token.
- New tokens that are not in the project's design system yet get the `temp` marker and a semantic name (what it is for, not what it looks like): `--temp-color-surface-brand`, never `--temp-color-1` or `--temp-16px`.
  - Tailwind 4: put tokens in `@theme` in the entry CSS and use the generated classes. Only Tailwind namespaces generate classes: `--color-temp-brand` → `bg-temp-brand`, `--spacing-temp-card` → `p-temp-card`, `--text-temp-kpi` → `text-temp-kpi`, `--radius-*`, `--shadow-*`. Other names (`--temp-color-*`, `--font-size-*`, `--border-width-*`) generate nothing. Built-in scale values (`text-gray-600`, `border-4`) are tokens too. No hex or px in arbitrary values (`bg-[#0f766e]`, `text-[32px]`), no `style={{…}}`.
  - Plain CSS: global tokens in `:root`; a component exposes its themeable values as its own custom properties that default to global tokens:
    ```css
    .card { --card-bg: var(--temp-color-surface-brand); --card-padding: var(--temp-spacing-card, 1.25rem);
      background: var(--card-bg); padding: var(--card-padding); }
    ```
- Font sizes in `rem` (1rem = 16px) so text scales with the user's browser setting (WCAG 1.4.4); note the px value: `1.5rem; /* 24px */`. Borders, shadows and fixed icon sizes stay `px`.
- A component that is used in containers of different widths (sidebar and main area) adapts with container queries (`container-type: inline-size` + `@container`, Tailwind `@container` + `@md:`), not viewport media queries.
- Modern CSS features: check the project's `browserslist` and add a fallback if a target does not support the feature.

## Before you finish

- [ ] No raw hex/px color or font-size values outside token definitions (except `/* TODO: token */` for values used fewer than 3 times).
- [ ] New tokens have the `temp` marker and a semantic name; with Tailwind they are in `@theme` in a Tailwind namespace and used via classes.
- [ ] Font sizes in `rem` with px comment; components used in different widths use container queries.
