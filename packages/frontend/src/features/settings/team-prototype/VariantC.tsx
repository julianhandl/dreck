// PROTOTYPE (ticket 08), variant C „Alles auf einer Seite": User zuerst, „Was Members sehen"
// unten mit einem Mock-Bildschirm des Members; User als aufklappbare Zeilen in einem Spaltenraster,
// Role und Assignment gelten erst mit „Speichern"; „User anlegen" als Formular über der Liste;
// der Link steht in der Zeile des Users.
import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { TextField } from '@/forms/TextField';
import { BudgetBar } from '@/ui/BudgetBar';
import { Button } from '@/ui/Button';
import { ChevronDownIcon } from '@/ui/icons';
import {
  AssignmentEditor,
  LinkBox,
  MemberSwitch,
  RolePill,
  StatusPill,
} from './TeamPrototypeParts';
import {
  accessSummary,
  ROLE_LABEL,
  type Role,
  type TeamUser,
  TOGGLES,
} from './team-prototype-data';
import type { TeamPrototype } from './useTeamPrototype';

/** One column template for header, rows and deactivated rows, so columns line up. */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_9rem_7rem_8.5rem]';

type VariantProps = {
  /** State of the Team tab. */
  team: TeamPrototype;
};

/**
 * Team tab on one page: inline-editable User rows first, then the Member view.
 * @example <VariantC team={team} />
 */
export function VariantC({ team }: VariantProps): ReactElement {
  const current = team.users.filter((u) => u.status !== 'deactivated');
  const deactivated = team.users.filter((u) => u.status === 'deactivated');
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="c-users" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="c-users" className="font-medium text-xl">
            User
          </h2>
          <Button
            variant={team.createOpen ? 'secondary' : 'primary'}
            aria-expanded={team.createOpen}
            aria-controls="c-create"
            onClick={() => team.handleCreateOpen(!team.createOpen)}
          >
            {team.createOpen ? 'Abbrechen' : 'User anlegen'}
          </Button>
        </div>
        <div id="c-create">{team.createOpen && <InlineCreate team={team} />}</div>
        <p role="status" className="rounded-temp-control bg-temp-band p-3 empty:hidden">
          {team.notice}
        </p>
        <ul className="flex flex-col divide-y divide-temp-divider rounded-temp-card border border-temp-divider bg-temp-surface">
          <li
            aria-hidden="true"
            className={`${ROW_GRID} hidden px-4 py-2 text-sm text-temp-ink-muted sm:grid`}
          >
            <span>Name</span>
            <span>Role</span>
            <span>Projects</span>
            <span>Status</span>
            <span />
          </li>
          {current.map((user) => (
            <UserRow key={user.id} team={team} user={user} />
          ))}
        </ul>
        {deactivated.length > 0 && (
          <>
            <h3 className="font-medium text-temp-ink-muted">Deactivated ({deactivated.length})</h3>
            <ul className="flex flex-col divide-y divide-temp-divider rounded-temp-card border border-temp-divider border-dashed bg-temp-surface">
              {deactivated.map((user) => (
                <UserRow key={user.id} team={team} user={user} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section
        aria-labelledby="c-members"
        className="grid gap-6 rounded-temp-card border border-temp-divider bg-temp-surface p-6 shadow-temp-card lg:grid-cols-[1fr_1.2fr]"
      >
        <div className="flex flex-col gap-3">
          <h2 id="c-members" className="font-medium text-xl">
            Was Members sehen
          </h2>
          <p className="text-temp-ink-muted">
            Gilt für alle Members. Admin und Manager sehen immer alles.
          </p>
          {TOGGLES.map((item) => (
            <MemberSwitch
              key={item.key}
              item={item}
              toggles={team.togglesDraft}
              readOnly={team.viewer !== 'admin'}
              onChange={team.handleToggleDraft}
            />
          ))}
          {team.viewer === 'admin' && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                disabled={!team.togglesDirty}
                onClick={team.handleSaveToggles}
              >
                Speichern
              </Button>
              <Button
                variant="secondary"
                disabled={!team.togglesDirty}
                onClick={team.handleResetToggles}
              >
                Verwerfen
              </Button>
              {team.togglesDirty && (
                <span className="text-sm text-temp-ink-muted">
                  Ungespeichert: die Vorschau zeigt den Entwurf.
                </span>
              )}
            </div>
          )}
          {team.viewer !== 'admin' && (
            <p className="text-sm text-temp-ink-muted">Nur Admins ändern diese Schalter.</p>
          )}
        </div>
        <MemberScreen team={team} />
      </section>
    </div>
  );
}

function InlineCreate({ team }: VariantProps): ReactElement {
  const { draft } = team;
  return (
    <Form
      errors={team.draftErrors}
      onFormSubmit={() => team.handleCreate() !== null && team.handleCreateOpen(false)}
      className="flex flex-col gap-4 rounded-temp-card border border-temp-highlight-border bg-temp-highlight p-6"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <TextField
          name="email"
          label="E-Mail"
          type="email"
          autoComplete="off"
          required
          value={draft.email}
          onValueChange={(email) => team.handleDraftChange({ email })}
        />
        <TextField
          name="name"
          label="Name"
          autoComplete="off"
          required
          value={draft.name}
          onValueChange={(name) => team.handleDraftChange({ name })}
        />
        <RoleRadios
          value={draft.role}
          options={team.roleOptions}
          onChange={(role) => team.handleDraftChange({ role })}
          name="c-create-role"
        />
      </div>
      {draft.role === 'member' && (
        <AssignmentEditor
          access={draft.access}
          onChange={(access) => team.handleDraftChange({ access })}
        />
      )}
      <div>
        <Button variant="primary" type="submit">
          Anlegen
        </Button>
      </div>
    </Form>
  );
}

type RoleRadiosProps = {
  value: Role;
  options: Role[];
  onChange: (role: Role) => void;
  name: string;
};

/** Role as segmented radios; with one option (Manager) just the text. */
function RoleRadios({ value, options, onChange, name }: RoleRadiosProps): ReactElement {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 font-medium">Role</legend>
      <div className="flex w-fit rounded-temp-pill border border-temp-border bg-temp-surface p-0.5">
        {options.map((role) => (
          <label
            key={role}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-temp-pill px-4 has-checked:bg-temp-nav-active has-checked:text-temp-on-nav has-focus-visible:outline-2 has-focus-visible:outline-temp-focus"
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === role}
              onChange={() => onChange(role)}
            />
            {ROLE_LABEL[role]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function UserRow({ team, user }: VariantProps & { user: TeamUser }): ReactElement {
  const p = team.permissions(user);
  const open = team.expandedId === user.id;
  const draft = open ? team.rowDraft : null;
  const dirty = team.rowDirty(user);
  const link = team.revealed?.userId === user.id ? team.revealed : null;
  const panelId = `c-user-${user.id}`;
  return (
    <li
      className={`flex flex-col ${
        open
          ? 'relative z-10 -mx-px bg-temp-band shadow-temp-card ring-2 ring-temp-nav-active'
          : link
            ? 'bg-temp-highlight'
            : ''
      }`}
    >
      <div className={`${ROW_GRID} p-4`}>
        <div className="min-w-0">
          <p className={open ? 'font-semibold' : 'font-medium'}>
            {user.name}
            {user.id === team.viewerId && (
              <span className="font-normal text-temp-ink-muted"> (du)</span>
            )}
          </p>
          <p className="truncate text-sm text-temp-ink-muted">{user.email}</p>
        </div>
        <span className="hidden sm:block">
          <RolePill role={user.role} />
        </span>
        <span className="hidden text-sm sm:block">{accessSummary(user)}</span>
        <span className="hidden sm:block">
          <StatusPill user={user} />
        </span>
        <span className="justify-self-end">
          {p.manage ? (
            <Button
              size="sm"
              variant={open ? 'secondary' : 'ghost'}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => team.handleExpand(user.id)}
              aria-label={`${user.name} ${open ? 'zuklappen' : 'bearbeiten'}`}
            >
              {open ? 'Zuklappen' : 'Bearbeiten'}
              <ChevronDownIcon className={open ? 'rotate-180' : ''} />
            </Button>
          ) : (
            <span className="text-sm text-temp-ink-muted">nur lesen</span>
          )}
        </span>
      </div>

      {link && (
        <div className="px-4 pb-4">
          <LinkBox
            link={link}
            name={user.name}
            copied={team.copied}
            onCopy={team.handleCopy}
            onDismiss={team.handleDismissLink}
          />
        </div>
      )}

      <div id={panelId} hidden={!open} className="px-4 pb-4">
        {open && draft && (
          <div className="flex flex-col gap-5 rounded-temp-control border border-temp-divider bg-temp-surface p-5">
            {p.changeRole ? (
              <RoleRadios
                value={draft.role}
                options={team.roleOptions}
                onChange={(role) => team.handleRowDraftChange({ role })}
                name={`c-role-${user.id}`}
              />
            ) : (
              p.lastAdminReason && (
                <p className="text-sm text-temp-ink-muted">{p.lastAdminReason}</p>
              )
            )}
            {draft.role === 'member' && user.status !== 'deactivated' && (
              <AssignmentEditor
                access={draft.access}
                onChange={(access) => team.handleRowDraftChange({ access })}
              />
            )}
            {draft.role === 'member' && user.role !== 'member' && (
              <p className="text-sm text-temp-ink-muted">
                Als Member sieht {user.name} zunächst alle Projects. Schränke den Zugriff vor dem
                Speichern ein, falls nötig.
              </p>
            )}
            {(p.changeRole || user.role === 'member') && user.status !== 'deactivated' && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  disabled={!dirty}
                  onClick={() => team.handleSaveRow(user.id)}
                >
                  Speichern
                </Button>
                <Button variant="secondary" onClick={() => team.handleExpand(user.id)}>
                  Abbrechen
                </Button>
                {dirty && (
                  <span className="text-sm text-temp-ink-muted">Ungespeicherte Änderungen</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-4">
              {user.status !== 'deactivated' && (
                <Button size="sm" onClick={() => team.openDialog('reset', user.id)}>
                  {user.status === 'invited' ? 'Neuer Einladungslink' : 'Reset-Link erzeugen'}
                </Button>
              )}
              {p.deactivate && (
                <Button size="sm" onClick={() => team.openDialog('deactivate', user.id)}>
                  Deaktivieren
                </Button>
              )}
              {p.reactivate && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => team.openDialog('reactivate', user.id)}
                >
                  Reaktivieren
                </Button>
              )}
              {!p.lastAdminReason && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => team.openDialog('delete', user.id)}
                >
                  Löschen
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

/** Mock of what Lena (Member) sees on a Project and in the Report with the current switches. */
function MemberScreen({ team }: VariantProps): ReactElement {
  const t = team.togglesDraft;
  return (
    <figure className="flex flex-col gap-3 rounded-temp-control border-4 border-temp-band bg-temp-canvas p-4">
      <figcaption className="text-sm text-temp-ink-muted">
        Vorschau: So sieht Lena Huber (Member) das Project „Website-Relaunch“
      </figcaption>
      <div
        className="flex flex-col gap-3 rounded-temp-control bg-temp-surface p-4"
        aria-live="polite"
      >
        <div>
          <p className="font-medium">Website-Relaunch</p>
          <p className="text-sm text-temp-ink-muted">Bergbäckerei Lechner GmbH</p>
        </div>
        <div className="flex items-center justify-between border-temp-divider border-t pt-2">
          <span>Heute · Design</span>
          <span className="font-medium">
            2:30 h{t.amounts && <span className="text-temp-ink-muted"> · 225,00 €</span>}
          </span>
        </div>
        <div className="border-temp-divider border-t pt-2">
          <p className="mb-1 text-sm">Dein User-Budget (immer sichtbar)</p>
          <BudgetBar
            label="User-Budget von Lena"
            used={18}
            limit={20}
            state="warning"
            stateLabel="Knapp"
            valueText="18 h von 20 h"
          />
        </div>
        <div className="border-temp-divider border-t pt-2">
          <p className="mb-1 text-sm">Budget des Projects</p>
          {t.budget ? (
            <>
              <BudgetBar
                label="Budget von Website-Relaunch"
                used={62}
                limit={80}
                state="ok"
                stateLabel="Im Rahmen"
                valueText={t.amounts ? '62 h von 80 h · 5.580 € von 7.200 €' : '62 h von 80 h'}
              />
              <p className="text-sm text-temp-ink-muted">
                Members sehen die gebuchten Stunden des ganzen Projects.
              </p>
            </>
          ) : (
            <p className="text-sm text-temp-ink-muted">ausgeblendet</p>
          )}
        </div>
        <div className="border-temp-divider border-t pt-2">
          <p className="mb-1 text-sm">Report, dieser Monat</p>
          <table className="w-full text-sm">
            <tbody>
              {(t.projectReport
                ? [
                    ['Lena Huber', '14:00 h', '1.260,00 €'],
                    ['Jakob Steiner', '9:30 h', '855,00 €'],
                    ['Martina Gruber', '6:00 h', '540,00 €'],
                  ]
                : [['Lena Huber', '14:00 h', '1.260,00 €']]
              ).map(([name, hours, amount]) => (
                <tr key={name}>
                  <th scope="row" className="py-0.5 text-left font-normal">
                    {name}
                  </th>
                  <td className="text-right">{hours}</td>
                  {t.amounts && <td className="text-right text-temp-ink-muted">{amount}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}
