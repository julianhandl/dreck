# Angular guide

Code rules for every project with an Angular frontend. Angular stays Angular — do not switch to React.
In an existing codebase keep its libraries and structure; apply these rules to the code you write or change.

## Structure and state

- Small and medium sized components. Statemanagement with well structured services.
- Code is structured by feature/domain (e.g. `src/app/customers/` next to `src/app/products/`), following the existing folders.
- Components must be rendering only. Logic lives in services.
  "Logic" includes form models, loading/error flags, toggles, submit handlers and API calls.
  Put them into `@Injectable` services next to the feature (e.g. `customer-form.service.ts`, `customer.store.ts` with signals). Components inject the service and only bind to it in the template.
- State lives in the service as signals (`signal`, `computed`), also filters and selections. No `.subscribe()` in components.
- Every new component: `standalone: true` and `changeDetection: ChangeDetectionStrategy.OnPush`.
- Component props with `input()` / `input.required()` and `output()`, not `@Input` / `@Output`.
- Forms are reactive forms (`FormBuilder`, `formControlName`), no `ngModel`. The form group lives in the service.
- Reusable UI components (badge, button, dialog) go into `src/app/shared/`, not into a feature folder.

  ```ts
  // features/customers/customer-form.service.ts
  @Injectable()
  export class CustomerFormService {
    private api = inject(CustomerService);
    readonly form = inject(FormBuilder).nonNullable.group({ name: ['', Validators.required], email: ['', Validators.email] });
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    async submit(): Promise<void> {
      this.saving.set(true);
      try { await firstValueFrom(this.api.create(this.form.getRawValue())); }
      catch { this.error.set('Speichern fehlgeschlagen'); }
      finally { this.saving.set(false); }
    }
  }

  // features/customers/customer-form.component.ts
  @Component({
    selector: 'app-customer-form',
    standalone: true,
    imports: [ReactiveFormsModule],
    providers: [CustomerFormService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <form [formGroup]="vm.form" (ngSubmit)="vm.submit()">
        <label for="customer-name">Name</label>
        <input id="customer-name" formControlName="name" autocomplete="name" required />
        <label for="customer-email">E-Mail</label>
        <input id="customer-email" formControlName="email" type="email" autocomplete="email" />
        <button [disabled]="vm.saving()">Speichern</button>
      </form>`,
  })
  export class CustomerFormComponent {
    protected vm = inject(CustomerFormService);
  }
  ```
- Angular has no hooks — never create `hooks/` folders or `useXyz()` functions in Angular.
- Large: same rules, reusable code lives in domain packages of the monorepo.

## Styling

- Use the styling approach the project already has (e.g. its CSS/SCSS files, Angular Material, Tailwind). Do not introduce a new one.
- With Tailwind CSS: utility classes in the template, no `styles: [...]`, no component CSS files, no BEM.

## Backend

A frontend feature against an existing API needs no backend. If a backend is needed and none exists yet: NestJS — read `setup.md` and `nestjs.md`.

## Before you finish

- [ ] New files follow the existing feature folder structure.
- [ ] New components contain no `HttpClient` calls, no `.subscribe()`, no loading/error/filter state and no business logic; that is in `@Injectable` services with signals.
- [ ] New components are standalone with OnPush, use `input()`/`output()` and reactive forms.
- [ ] No `hooks/` folder, no `useXyz()` function.
- [ ] No new libraries or styling tools that the project did not use before (unless the user asked for them).
- [ ] New code follows these rules even where existing code does not. Existing code that breaks the rules is not refactored (unless asked) but listed in your final reply with the broken rule.
