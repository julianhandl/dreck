# Accessibility guide

Read for every change that adds or changes UI: markup, forms, buttons, menus, tables, messages.
Target is WCAG 2.2 AA (EU: EN 301 549 / European Accessibility Act). Users navigate with keyboard only, screen readers, zoom and their own OS settings — every rule below keeps one of them working.

- Native elements first: `<button type="button">` for actions, `<a href>` for navigation, `<input>`, `<select>`, `<details>`, `<dialog>`, `<table>`. They bring role, focus and keyboard handling for free. Use ARIA only where no native element exists; never a clickable `<div>`/`<span>`/`<tr>`, no redundant `role`, no `tabindex` > 0.
- Every interactive element has an accessible name. Icon-only buttons get an `aria-label` that names action and object (`aria-label="Anna Schmidt entfernen"`), the icon itself `aria-hidden="true"`. Images: `alt` with the content, decorative `alt=""`.
- Forms:
  - Every field has a visible `<label>` linked via `for`/`id` (React `htmlFor`); a placeholder is not a label. Related radios/checkboxes in `<fieldset>` + `<legend>`.
  - `type` and `autocomplete` match the data so browsers can autofill (WCAG 1.3.5): `name`, `email`, `tel`, `organization`, `street-address`, `new-password`/`current-password`, `one-time-code`. Whole numbers like codes: `inputmode="numeric"` instead of `type="number"`.
  - Required fields: `required` attribute plus a visible marker.
  - Errors: text next to the field, linked with `aria-describedby`, the field gets `aria-invalid="true"`. On submit move focus to the first invalid field. Never color alone.
  - Never block paste in password/code fields; a "show password" button is a `<button type="button">` with `aria-pressed` (WCAG 3.3.8).
- Expose state on the control and keep it in sync: disclosure/menu trigger `aria-expanded` with `true` *and* `false` (false = "collapsed", missing = "not expandable") plus `aria-controls`; toggle buttons `aria-pressed`; current page `aria-current="page"`; sorted column `aria-sort` on the `<th>` (the clickable part is a `<button>` inside the `<th>`). Angular binds them with `[attr.aria-expanded]="open()"`, React with `aria-expanded={open}`.
- Messages that appear without a page load (result counts "12 Mitglieder gefunden", "Gespeichert", toasts) go into a container with `role="status"` (errors `role="alert"`) that is already in the DOM before the text changes. Toasts stay at least until the user could read them; errors stay until dismissed.
- Keyboard: everything works with Tab/Shift+Tab, Enter/Space in a logical order. Popups (menu, dialog, dropdown) close with Escape and return focus to their trigger. Dragging always has a button alternative (2.5.7).
- Complex widgets (tabs, menu, combobox, dialog): use Base UI where the project has it (`react.md`), otherwise implement the WAI-ARIA APG pattern completely. A half-done ARIA widget is worse than none: `role="menu"`/`menuitem` makes screen readers expect arrow keys, so it needs `aria-haspopup="menu"` plus ArrowUp/ArrowDown/Home/End. A simple action menu (⋮) is a disclosure instead: trigger with `aria-expanded` + `aria-controls`, a list of plain `<button>`s, no `role="menu"`.
- Focus stays visible: never `outline: none` without a `:focus-visible` style (≥ 2px, 3:1 contrast), and sticky headers must not cover the focused element (`scroll-padding-top`, 2.4.11).
- Page structure: `<html lang="de">`, a unique `<title>`, landmarks (`header`, `nav`, `main`, `footer`), one `<h1>` and no skipped heading levels. Data tables use `<th scope="col">`.
- Visual: text contrast 4.5:1 (large text 3:1), borders of inputs and focus ring 3:1; click targets at least 24×24 CSS px (2.5.8); animations respect `prefers-reduced-motion`; never disable zoom (`user-scalable=no`) and keep the layout usable at 200 % zoom / 320 px width.

## Before you finish
- [ ] No clickable `<div>`/`<span>`; icon-only buttons have an `aria-label` with action and object.
- [ ] Every field: visible `<label>` linked by id, matching `type` + `autocomplete`, errors linked with `aria-describedby` + `aria-invalid`, focus moves to the first error.
- [ ] Toggles, disclosures, menus, sortable headers expose `aria-expanded`/`aria-pressed`/`aria-sort` with both states; popups close with Escape and return focus.
- [ ] Dynamic messages and counts are in a `role="status"`/`role="alert"` container.
- [ ] No `outline: none` without `:focus-visible`; new pages have `lang`, `<title>`, landmarks and a heading structure.
