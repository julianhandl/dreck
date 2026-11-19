// PROTOTYPE (ticket 08), variant B „Liste + Detail": tabs „User" / „Was Members sehen";
// list of Users on the left, everything about the chosen User in a panel on the right, changes
// apply at once; the one-time link sits at the top of the panel. Preview as a matrix.
import { Form } from '@base-ui/react/form';
import { Tabs } from '@base-ui/react/tabs';
import type { ReactElement } from 'react';
import { TextField } from '@/forms/TextField';
import { Button } from '@/ui/Button';
import { PlusIcon } from '@/ui/icons';
import { Select } from '@/ui/Select';
import {
  AssignmentEditor,
  LinkBox,
  MemberSwitch,
  RolePill,
  StatusPill,
} from './TeamPrototypeParts';
import { accessSummary, ROLE_LABEL, type TeamUser, TOGGLES } from './team-prototype-data';
import type { TeamPrototype } from './useTeamPrototype';

type VariantProps = {
  /** State of the Team tab. */
  team: TeamPrototype;
};

const TAB =
  'inline-flex min-h-11 items-center gap-2 border-transparent border-b-2 px-4 font-medium text-temp-ink-muted hover:text-temp-ink data-active:border-temp-accent data-active:text-temp-ink';

const ORDER = { active: 0, invited: 1, deactivated: 2 };

/**
 * Team tab as master-detail with two tabs.
 * @example <VariantB team={team} />
 */
export function VariantB({ team }: VariantProps): ReactElement {
  const sorted = [...team.users].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const selected = team.selectedId === 'new' ? undefined : team.userById(team.selectedId);
  return (
    <Tabs.Root defaultValue="users" className="flex flex-col gap-6">
      <Tabs.List aria-label="Team" className="flex border-temp-divider border-b">
        <Tabs.Tab value="users" className={TAB}>
          User
          <span className="rounded-temp-pill bg-temp-band px-2 text-sm">{team.users.length}</span>
        </Tabs.Tab>
        <Tabs.Tab value="members" className={TAB}>
          Was Members sehen
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="users" className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-3">
          <Button
            variant={team.selectedId === 'new' ? 'primary' : 'secondary'}
            onClick={() => {
              team.handleCreateOpen(true);
              team.setSelectedId('new');
            }}
            aria-pressed={team.selectedId === 'new'}
          >
            <PlusIcon /> User anlegen
          </Button>
          <ul className="flex flex-col gap-1">
            {sorted.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => team.setSelectedId(user.id)}
                  aria-current={team.selectedId === user.id ? 'true' : undefined}
                  className={`flex w-full flex-col items-start gap-1 rounded-temp-control border px-4 py-3 text-left hover:bg-temp-band aria-[current=true]:border-temp-highlight-border aria-[current=true]:bg-temp-highlight ${user.status === 'deactivated' ? 'border-dashed border-temp-divider text-temp-ink-muted' : 'border-temp-divider bg-temp-surface'}`}
                >
                  <span className="font-medium">
                    {user.name}
                    {user.id === team.viewerId && (
                      <span className="font-normal text-temp-ink-muted"> (du)</span>
                    )}
                  </span>
                  <span className="text-sm text-temp-ink-muted">{user.email}</span>
                  <span className="flex flex-wrap gap-1">
                    <RolePill role={user.role} />
                    {user.status !== 'active' && <StatusPill user={user} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-temp-card border border-temp-divider bg-temp-surface p-6 shadow-temp-card">
          <p role="status" className="mb-4 rounded-temp-control bg-temp-band p-3 empty:hidden">
            {team.notice}
          </p>
          {team.selectedId === 'new' ? (
            <CreatePanel team={team} />
          ) : selected ? (
            <DetailPanel team={team} user={selected} />
          ) : (
            <p className="text-temp-ink-muted">Wähle links einen User.</p>
          )}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="members" className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <div className="flex flex-col gap-3">
          <p className="text-temp-ink-muted">
            Gilt für alle Members. Admin und Manager sehen immer alles.
          </p>
          {TOGGLES.map((item) => (
            <MemberSwitch
              key={item.key}
              item={item}
              toggles={team.toggles}
              readOnly={team.viewer !== 'admin'}
              onChange={team.handleToggle}
            />
          ))}
          {team.viewer !== 'admin' && (
            <p className="text-sm text-temp-ink-muted">Nur Admins ändern diese Schalter.</p>
          )}
        </div>
        <MatrixPreview team={team} />
      </Tabs.Panel>
    </Tabs.Root>
  );
}

function CreatePanel({ team }: VariantProps): ReactElement {
  const { draft } = team;
  return (
    <Form
      errors={team.draftErrors}
      onFormSubmit={() => team.handleCreate()}
      className="flex flex-col gap-5"
    >
      <h2 className="font-medium text-xl">User anlegen</h2>
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      {team.viewer === 'admin' ? (
        <Select
          label="Role"
          value={draft.role}
          options={team.roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          onValueChange={(role) => team.handleDraftChange({ role })}
        />
      ) : (
        <p>
          <span className="font-medium">Role:</span> Member
        </p>
      )}
      {draft.role === 'member' && (
        <AssignmentEditor
          access={draft.access}
          onChange={(access) => team.handleDraftChange({ access })}
        />
      )}
      <div>
        <Button variant="primary" type="submit">
          Anlegen und Einladungslink erzeugen
        </Button>
      </div>
    </Form>
  );
}

function DetailPanel({ team, user }: VariantProps & { user: TeamUser }): ReactElement {
  const p = team.permissions(user);
  const link = team.revealed?.userId === user.id ? team.revealed : null;
  const readOnly = !p.manage;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-2xl tracking-tight">{user.name}</h2>
          <p className="text-temp-ink-muted">
            {user.email} · zuletzt angemeldet {user.lastSeen}
          </p>
        </div>
        <StatusPill user={user} />
      </div>

      {link && (
        <LinkBox
          link={link}
          name={user.name}
          copied={team.copied}
          onCopy={team.handleCopy}
          onDismiss={team.handleDismissLink}
        />
      )}

      {readOnly && (
        <p className="rounded-temp-control bg-temp-band p-3 text-sm">
          Manager ändern nur Members. {user.name} ist {ROLE_LABEL[user.role]}.
        </p>
      )}

      <section className="flex flex-col gap-2 border-temp-divider border-t pt-4">
        <h3 className="font-medium">Role</h3>
        {p.changeRole ? (
          <Select
            label="Role"
            hideLabel
            value={user.role}
            options={team.roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            onValueChange={(role) => team.handleRoleChange(user.id, role)}
          />
        ) : (
          <p>
            <RolePill role={user.role} />{' '}
            <span className="text-sm text-temp-ink-muted">
              {p.lastAdminReason || (team.viewer === 'manager' ? 'Nur Admins ändern Roles.' : '')}
            </span>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2 border-temp-divider border-t pt-4">
        <h3 className="font-medium">Projects</h3>
        {user.role !== 'member' ? (
          <p className="text-temp-ink-muted">
            {ROLE_LABEL[user.role]} sehen immer alle Projects, keine Assignment nötig.
          </p>
        ) : p.manage && user.status !== 'deactivated' ? (
          <AssignmentEditor
            access={user.access}
            onChange={(access) => team.handleAccessChange(user.id, access)}
            legend="Welche Projects sieht der Member?"
          />
        ) : (
          <p>{accessSummary(user)}</p>
        )}
      </section>

      {p.manage && (
        <section className="flex flex-col gap-3 border-temp-divider border-t pt-4">
          <h3 className="font-medium">Zugang</h3>
          <div className="flex flex-wrap gap-3">
            {user.status !== 'deactivated' && (
              <Button onClick={() => team.openDialog('reset', user.id)}>
                {user.status === 'invited' ? 'Neuer Einladungslink' : 'Reset-Link erzeugen'}
              </Button>
            )}
            {p.deactivate && (
              <Button onClick={() => team.openDialog('deactivate', user.id)}>Deaktivieren</Button>
            )}
            {p.reactivate && (
              <Button variant="primary" onClick={() => team.openDialog('reactivate', user.id)}>
                Reaktivieren
              </Button>
            )}
            {!p.lastAdminReason && (
              <Button variant="danger" onClick={() => team.openDialog('delete', user.id)}>
                Löschen
              </Button>
            )}
          </div>
          {user.status === 'deactivated' && !p.reactivate && (
            <p className="text-sm text-temp-ink-muted">Nur Admins reaktivieren User.</p>
          )}
          {p.lastAdminReason && <p className="text-sm text-temp-ink-muted">{p.lastAdminReason}</p>}
        </section>
      )}
    </div>
  );
}

function MatrixPreview({ team }: VariantProps): ReactElement {
  const t = team.toggles;
  const rows: { area: string; member: string; on: boolean }[] = [
    {
      area: 'Projects',
      member: 'Nur zugeordnete (Assignment): Name, Customer, Tasks',
      on: false,
    },
    { area: 'Eigene Time Entries', member: 'Immer: Stunden', on: false },
    {
      area: 'Hourly Rate, Wert',
      member: t.amounts ? 'Sichtbar' : 'Unsichtbar',
      on: t.amounts,
    },
    {
      area: 'Budget in Stunden',
      member: t.budget
        ? 'Sichtbar: Members sehen die gebuchten Stunden des ganzen Projects.'
        : 'Unsichtbar, auch keine Prozente',
      on: t.budget,
    },
    {
      area: 'Budget in Betrag',
      member:
        t.budget && t.amounts
          ? 'Sichtbar'
          : 'Unsichtbar (braucht „Budget sehen“ und „Beträge sehen“)',
      on: t.budget && t.amounts,
    },
    { area: 'Eigenes User-Budget', member: 'Immer', on: false },
    {
      area: 'Report',
      member: t.projectReport
        ? `Stunden aller User auf ihren Projects, mit Namen${t.amounts ? ' und Beträgen' : ''}`
        : 'Nur Eigenes',
      on: t.projectReport,
    },
    { area: 'Rechnungen, Angebote', member: 'Nie', on: false },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="mb-2 text-left font-medium">Vorschau</caption>
        <thead className="bg-temp-band text-sm text-temp-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Bereich
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Admin, Manager
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Member
            </th>
          </tr>
        </thead>
        <tbody aria-live="polite">
          {rows.map((row) => (
            <tr key={row.area} className="border-temp-divider border-t">
              <th scope="row" className="px-4 py-2 font-medium">
                {row.area}
              </th>
              <td className="px-4 py-2 text-temp-ink-muted">Alles</td>
              <td className={`px-4 py-2 ${row.on ? 'font-medium text-temp-success' : ''}`}>
                {row.member}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
