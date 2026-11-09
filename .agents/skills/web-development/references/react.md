# React guide

Code rules for every project with a React frontend (Small: React SPA, Medium/Large: Next.js).
In an existing codebase keep its libraries and structure; apply these rules to the code you write or change.

## Components (every size)

- Function components with named exports (`export function ContactList`). `export default` only where Next.js requires it (`page.tsx`, `layout.tsx`).
- Every new or changed exported component gets a JSDoc comment: one sentence what it renders, plus `@example`. Every prop gets a `/** */` comment. Hooks and services get a one-line JSDoc.
- Event handlers you define are named `handle<Event>` (`handleDelete`, `handleSubmit`), also when a hook returns them. Props that receive a handler are named `on<Event>` (`onDelete`).
- A reusable UI component that must render as another element (button as link) gets an `as` prop typed with `ElementType`, not a second component.
- Accessibility is required for every interactive element — keyboard and screen reader must work. Every input has a `<label>`, icon-only buttons have `aria-label`, never a clickable `<div>` (details in `accessibility.md`).
  - **Project has `@base-ui/react` in `package.json` (every new React project does) → build dialogs, tabs, menus and selects with Base UI, not with native elements.** Never add Base UI to an existing project that does not have it.
  - Project without Base UI → native elements: `<dialog>` opened via `ref.current?.showModal()` in a hook (focus trap and Escape built in) with `aria-labelledby` on its heading, never a `<div>` overlay. Tabs: `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, `role="tabpanel"`.

  ```tsx
  import { AlertDialog } from '@base-ui/react/alert-dialog';
  type ConfirmDialogProps = {
    /** Heading, also the accessible name of the dialog. */
    title: string;
    /** Whether the dialog is open; the state lives in the calling hook. */
    open: boolean;
    /** Called when the dialog opens or closes (Escape, "Abbrechen"). */
    onOpenChange: (open: boolean) => void;
    /** Called when the user confirms. */
    onConfirm: () => void;
  };

  /**
   * Confirmation dialog based on Base UI AlertDialog.
   * @example <ConfirmDialog title="Kontakt löschen?" open={open} onOpenChange={setOpen} onConfirm={handleDelete} />
   */
  export function ConfirmDialog({ title, open, onOpenChange, onConfirm }: ConfirmDialogProps) {
    return (
      <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Close>Abbrechen</AlertDialog.Close>
            <button type="button" onClick={onConfirm}>Löschen</button>
          </AlertDialog.Popup></AlertDialog.Portal>
      </AlertDialog.Root>
    );
  }
  // Tabs: import { Tabs } from '@base-ui/react/tabs'; <Tabs.Root value={tab} onValueChange={setTab}><Tabs.List><Tabs.Tab value="a">A</Tabs.Tab></Tabs.List><Tabs.Panel value="a">…</Tabs.Panel></Tabs.Root>
  ```

## Small — React SPA

- Small components.
- Statemanagement with context, hooks and props.
- Backend: hono in the `api` folder — read `hono.md`.

## Medium — Next.js

- Small and medium sized components. Statemanagement with a library like zustand (use the store library the project already has).
- Code is structured by domain: `features/<domain>/` with `components/`, `hooks/`, `store` and services.
- Components must be rendering only. Logic in services/hooks.
  "Logic" includes form field state, loading/error flags, toggles and submit handlers. A component file contains no `useState`, `useEffect` or `fetch` — it calls one hook and renders. Pages (`page.tsx`) and layouts are components too. Put the hook next to the feature:

  ```tsx
  // features/auth/hooks/useLoginForm.ts
  export function useLoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const login = useAuthStore((s) => s.login);
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); login(email, password); };
    return { email, setEmail, password, setPassword, handleSubmit };
  }

  // features/auth/components/LoginForm.tsx
  export function LoginForm() {
    const { email, setEmail, password, setPassword, handleSubmit } = useLoginForm();
    return (
      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">E-Mail</label> <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="login-password">Passwort</label> <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </form>
    );
  }
  ```
- Backend: the API lives in Next.js route handlers (`app/api/**/route.ts`) or server actions — in the same Next.js app, no separate `backend/` project, no NestJS, no Express. Keep route handlers thin and put business logic in domain services.
  Only if the user explicitly asks for an additional backend service (worker, separate API, service used by other apps) → NestJS for that service, read `setup.md` and `nestjs.md`.
- Large (Next.js monorepo): rules from Medium; put new reusable code into the matching domain package, not into the app.

## Styling

- Use the styling approach the project already has. With Tailwind CSS: utility classes directly in the markup. No BEM, no hand-written component CSS files, no `@apply`.

## Before you finish

- [ ] Every new/changed exported component has JSDoc with `@example`, every prop a `/** */` comment.
- [ ] Event handlers are named `handle<Event>`; no `export default` except `page.tsx`/`layout.tsx`.
- [ ] Dialogs, tabs, menus are accessible: Base UI if the project has it, otherwise `<dialog>` + `showModal()` / ARIA tab roles. No clickable `<div>`, no `<div>` overlay as dialog.
- [ ] New files are in the same places as similar existing files; no parallel store/service for something that already exists.
- [ ] Medium/Large: no new component or page (`page.tsx`) contains `useState`, `useEffect` or `fetch`; that logic is in hooks/stores.
- [ ] Medium/Large: API code is in `app/api/**/route.ts` — no separate `backend/` project, no NestJS, no Express.
- [ ] No new libraries or styling tools that the project did not use before (unless the user asked for them).
- [ ] New code follows these rules even where existing code does not. Existing code that breaks the rules is not refactored (unless asked) but listed in your final reply with the broken rule.
