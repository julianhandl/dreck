// PROTOTYPE (ticket 08), variant A „Tabelle + Dialoge": every action opens a dialog,
// the one-time link appears in a dialog of its own; „Was Members sehen" below as a settings row.
import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { TextField } from '@/forms/TextField';
import { ActionsMenu, type MenuAction } from '@/ui/ActionsMenu';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Select } from '@/ui/Select';
import {
  AssignmentEditor,
  LinkBox,
  MemberSwitch,
  RolePill,
  StatusPill,
} from './TeamPrototypeParts';
import {
  accessLossText,
  accessSummary,
  lostProjects,
  memberPreview,
  ROLE_LABEL,
  type TeamUser,
  TOGGLES,
} from './team-prototype-data';
import type { TeamPrototype } from './useTeamPrototype';

type VariantProps = {
  /** State of the Team tab. */
  team: TeamPrototype;
};

/**
 * Team tab as a table with an actions menu per row; dialogs for every change.
 * @example <VariantA team={team} />
 */
export function VariantA({ team }: VariantProps): ReactElement {
  const actionsFor = (user: TeamUser): MenuAction[] => {
    const p = team.permissions(user);
    const list: MenuAction[] = [];
    if (!p.manage) return list;
    if (user.role === 'member' && user.status !== 'deactivated')
      list.push({ label: 'Projects zuordnen', onSelect: () => team.openDialog('assign', user.id) });
    if (p.changeRole)
      list.push({ label: 'Role ändern', onSelect: () => team.openDialog('role', user.id) });
    if (user.status !== 'deactivated')
      list.push({
        label: user.status === 'invited' ? 'Neuer Einladungslink' : 'Reset-Link erzeugen',
        onSelect: () => team.openDialog('reset', user.id),
      });
    if (p.deactivate)
      list.push({
        label: 'Deaktivieren',
        danger: true,
        onSelect: () => team.openDialog('deactivate', user.id),
      });
    if (p.reactivate)
      list.push({ label: 'Reaktivieren', onSelect: () => team.openDialog('reactivate', user.id) });
    if (!p.lastAdminReason)
      list.push({
        label: 'Löschen',
        danger: true,
        onSelect: () => team.openDialog('delete', user.id),
      });
    return list;
  };

  const linkUser = team.revealed ? team.userById(team.revealed.userId) : undefined;

  return (
    <div className="flex flex-col gap-10 border-temp-divider border-t pt-6">
      <section aria-labelledby="a-users" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="a-users" className="font-medium text-xl">
            User
          </h2>
          <Button variant="primary" onClick={() => team.handleCreateOpen(true)}>
            User anlegen
          </Button>
        </div>
        <p role="status" className="text-temp-ink-muted empty:sr-only">
          {team.notice}
        </p>
        <div className="overflow-x-auto rounded-temp-card border border-temp-divider bg-temp-surface">
          <table className="w-full text-left">
            <thead className="bg-temp-band text-sm text-temp-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  E-Mail
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Projects
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {team.users.map((user) => {
                const actions = actionsFor(user);
                const p = team.permissions(user);
                return (
                  <tr
                    key={user.id}
                    className={`border-temp-divider border-t ${user.status === 'deactivated' ? 'text-temp-ink-muted' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{user.name}</span>
                      {user.id === team.viewerId && (
                        <span className="text-temp-ink-muted"> (du)</span>
                      )}
                      {p.lastAdminReason && (
                        <span className="block text-sm text-temp-ink-muted">
                          Letzter aktiver Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <RolePill role={user.role} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{accessSummary(user)}</td>
                    <td className="px-4 py-3">
                      <StatusPill user={user} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {actions.length > 0 && (
                        <ActionsMenu
                          label="Aktionen"
                          ariaLabel={`Aktionen für ${user.name}`}
                          actions={actions}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="a-members"
        className="grid gap-x-8 gap-y-4 border-temp-divider border-t pt-6 sm:grid-cols-[12rem_1fr_1fr]"
      >
        <div>
          <h2 id="a-members" className="font-medium">
            Was Members sehen
          </h2>
          <p className="text-sm text-temp-ink-muted">Gilt für alle Members.</p>
        </div>
        <div className="flex flex-col gap-2">
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
        <div className="rounded-temp-control bg-temp-band p-4">
          <h3 className="mb-2 font-medium">Vorschau: Ein Member sieht …</h3>
          <ul aria-live="polite" className="flex flex-col gap-2">
            {memberPreview(team.toggles).map((line) => (
              <li key={line.area}>
                <span className="font-medium">{line.area}: </span>
                {line.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CreateDialog team={team} />
      <AssignDialog team={team} />
      <RoleDialog team={team} />
      <Modal
        title="Link weitergeben"
        open={team.revealed !== null && !team.createOpen}
        onOpenChange={(open) => !open && team.handleDismissLink()}
      >
        {team.revealed && linkUser && (
          <div className="flex flex-col gap-4">
            <LinkBox
              link={team.revealed}
              name={linkUser.name}
              copied={team.copied}
              onCopy={team.handleCopy}
            />
            <div>
              <Button onClick={team.handleDismissLink}>Fertig</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateDialog({ team }: VariantProps): ReactElement {
  const { draft } = team;
  return (
    <Modal title="User anlegen" open={team.createOpen} onOpenChange={team.handleCreateOpen}>
      <Form
        errors={team.draftErrors}
        onFormSubmit={() => team.handleCreate() !== null && team.handleCreateOpen(false)}
        className="flex flex-col gap-5"
      >
        <TextField
          name="email"
          label="E-Mail"
          type="email"
          autoComplete="off"
          required
          value={draft.email}
          onValueChange={(email) => team.handleDraftChange({ email })}
          description="Damit meldet sich der User an."
        />
        <TextField
          name="name"
          label="Name"
          autoComplete="off"
          required
          value={draft.name}
          onValueChange={(name) => team.handleDraftChange({ name })}
        />
        {team.viewer === 'admin' ? (
          <Select
            label="Role"
            value={draft.role}
            options={team.roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            onValueChange={(role) => team.handleDraftChange({ role })}
          />
        ) : (
          <p>
            <span className="font-medium">Role:</span> Member{' '}
            <span className="text-sm text-temp-ink-muted">(Manager legen nur Members an)</span>
          </p>
        )}
        {draft.role === 'member' ? (
          <AssignmentEditor
            access={draft.access}
            onChange={(access) => team.handleDraftChange({ access })}
          />
        ) : (
          <p className="text-temp-ink-muted">Admin und Manager sehen immer alle Projects.</p>
        )}
        <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-5">
          <Button variant="primary" type="submit">
            Anlegen und Link erzeugen
          </Button>
          <Button onClick={() => team.handleCreateOpen(false)}>Abbrechen</Button>
        </div>
      </Form>
    </Modal>
  );
}

function AssignDialog({ team }: VariantProps): ReactElement | null {
  const user = team.dialogUser;
  if (team.dialog?.kind !== 'assign' || !user) return null;
  const loss = accessLossText(user.name, lostProjects(user.access, team.assignDraft));
  return (
    <Modal title={`Projects von ${user.name}`} open onOpenChange={team.closeDialog}>
      <div className="flex flex-col gap-5">
        <AssignmentEditor
          access={team.assignDraft}
          onChange={team.setAssignDraft}
          legend="Welche Projects sieht der Member?"
        />
        {loss && <p className="rounded-temp-control bg-temp-band p-3 text-sm">{loss}</p>}
        <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-5">
          <Button variant="primary" onClick={team.handleSaveAssign}>
            Speichern
          </Button>
          <Button onClick={team.closeDialog}>Abbrechen</Button>
        </div>
      </div>
    </Modal>
  );
}

function RoleDialog({ team }: VariantProps): ReactElement | null {
  const user = team.dialogUser;
  if (team.dialog?.kind !== 'role' || !user) return null;
  return (
    <Modal title={`Role von ${user.name}`} open onOpenChange={team.closeDialog}>
      <div className="flex flex-col gap-5">
        <Select
          label="Role"
          value={team.roleDraft}
          options={team.roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          onValueChange={team.setRoleDraft}
        />
        <p className="text-sm text-temp-ink-muted">
          {team.roleDraft === 'member'
            ? `Als Member sieht ${user.name} nur die Projects aus der Assignment (${user.access.allProjects ? 'Alle Projects' : `${user.access.projectIds.length} ausgewählt`}) und Geld nur laut „Was Members sehen“.`
            : `Als ${ROLE_LABEL[team.roleDraft]} sieht ${user.name} alle Projects und alle Beträge.${team.roleDraft === 'admin' ? ' Admins ändern auch Settings, Roles und Backup.' : ''}`}
        </p>
        <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-5">
          <Button variant="primary" onClick={team.handleSaveRole}>
            Speichern
          </Button>
          <Button onClick={team.closeDialog}>Abbrechen</Button>
        </div>
      </div>
    </Modal>
  );
}
