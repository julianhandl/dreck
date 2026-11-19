// PROTOTYPE (ticket 08): small pieces shared by the three variants; layouts stay per variant.
import { Switch } from '@base-ui/react/switch';
import { type ReactElement, useId } from 'react';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Pill } from '@/ui/Pill';
import {
  type Access,
  CUSTOMERS,
  type MemberToggles,
  ROLE_LABEL,
  type Role,
  STATUS_LABEL,
  type TeamUser,
  type TOGGLES,
} from './team-prototype-data';
import type { RevealedLink, TeamPrototype } from './useTeamPrototype';

type AssignmentEditorProps = {
  /** Current Assignment of the Member. */
  access: Access;
  /** Called with the new Assignment on every change. */
  onChange: (access: Access) => void;
  /** Visible heading of the radio group. */
  legend?: string;
};

/**
 * Switch „Alle Projects / Ausgewählte Projects", below it the checkbox list grouped by Customer.
 * @example <AssignmentEditor access={user.access} onChange={handleChange} />
 */
export function AssignmentEditor({
  access,
  onChange,
  legend = 'Projects',
}: AssignmentEditorProps): ReactElement {
  const name = useId();
  const toggle = (id: number, on: boolean): void =>
    onChange({
      ...access,
      projectIds: on ? [...access.projectIds, id] : access.projectIds.filter((p) => p !== id),
    });
  const setCustomer = (ids: number[], on: boolean): void =>
    onChange({
      ...access,
      projectIds: on
        ? [...new Set([...access.projectIds, ...ids])]
        : access.projectIds.filter((p) => !ids.includes(p)),
    });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">{legend}</legend>
        {[true, false].map((all) => (
          <label key={String(all)} className="flex min-h-11 w-fit items-center gap-3">
            <input
              type="radio"
              name={name}
              className="size-5"
              checked={access.allProjects === all}
              onChange={() => onChange({ ...access, allProjects: all })}
            />
            {all ? 'Alle Projects' : 'Ausgewählte Projects'}
            {all && <span className="text-sm text-temp-ink-muted">auch künftige Projects</span>}
          </label>
        ))}
      </fieldset>
      {!access.allProjects && (
        <div className="flex flex-col gap-3 rounded-temp-control border border-temp-divider p-4">
          <p className="text-sm text-temp-ink-muted" role="status">
            {access.projectIds.length} Projects ausgewählt
          </p>
          {CUSTOMERS.map((customer) => {
            const ids = customer.projects.map((p) => p.id);
            const allOn = ids.every((id) => access.projectIds.includes(id));
            return (
              <fieldset key={customer.name} className="flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="float-left font-medium">{customer.name}</legend>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => setCustomer(ids, !allOn)}
                    aria-label={`${allOn ? 'Keine' : 'Alle'} Projects von ${customer.name}`}
                  >
                    {allOn ? 'keine' : 'alle'}
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2">
                  {customer.projects.map((project) => (
                    <label key={project.id} className="flex min-h-10 w-fit items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-5"
                        checked={access.projectIds.includes(project.id)}
                        onChange={(e) => toggle(project.id, e.target.checked)}
                      />
                      {project.name}
                      {project.archived && <Pill>Archived</Pill>}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LinkBoxProps = {
  /** The link that is shown only now. */
  link: RevealedLink;
  /** Name of the User, for the text. */
  name: string;
  /** Whether the link was just copied. */
  copied: boolean;
  /** Copies the link. */
  onCopy: (url: string) => void;
  /** Hides the link for good. */
  onDismiss?: () => void;
};

/**
 * One-time Einladungs- or Reset-Link with a copy button; gone after closing.
 * @example <LinkBox link={revealed} name="Eva Moser" copied={copied} onCopy={handleCopy} />
 */
export function LinkBox({ link, name, copied, onCopy, onDismiss }: LinkBoxProps): ReactElement {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 rounded-temp-control border border-temp-highlight-border bg-temp-highlight p-4">
      <label htmlFor={id} className="font-medium">
        {link.kind === 'invite' ? `Einladungslink für ${name}` : `Reset-Link für ${name}`}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          readOnly
          value={link.url}
          onFocus={(e) => e.target.select()}
          className="min-h-11 min-w-0 flex-1 rounded-temp-control border border-temp-border bg-temp-surface px-3 font-mono text-sm"
        />
        <Button variant="primary" onClick={() => onCopy(link.url)}>
          {copied ? 'Kopiert' : 'Link kopieren'}
        </Button>
      </div>
      <p className="text-sm text-temp-ink-muted">
        Nur jetzt sichtbar. Gültig 7 Tage, einmal nutzbar. Gib ihn selbst weiter, Dreck verschickt
        keine Mails. Ein neuer Link macht diesen ungültig.
      </p>
      <p role="status" className="sr-only">
        {copied ? 'Link kopiert' : ''}
      </p>
      {onDismiss && (
        <div>
          <Button size="sm" onClick={onDismiss}>
            Fertig, Link ausblenden
          </Button>
        </div>
      )}
    </div>
  );
}

type MemberSwitchProps = {
  /** Which switch. */
  item: (typeof TOGGLES)[number];
  /** Current values of all three switches. */
  toggles: MemberToggles;
  /** Only Admins change the switches; Managers see them read-only. */
  readOnly: boolean;
  /** Called with the new value. */
  onChange: (key: keyof MemberToggles, value: boolean) => void;
  /** Hide the hint below the label. */
  compact?: boolean;
};

/**
 * One of the three switches „Was Members sehen" (Base UI Switch).
 * @example <MemberSwitch item={TOGGLES[0]} toggles={toggles} readOnly={false} onChange={handleToggle} />
 */
export function MemberSwitch({
  item,
  toggles,
  readOnly,
  onChange,
  compact = false,
}: MemberSwitchProps): ReactElement {
  const hintId = useId();
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI Switch renders the control inside
    <label className="flex min-h-11 items-start gap-3">
      <Switch.Root
        checked={toggles[item.key]}
        onCheckedChange={(on) => onChange(item.key, on)}
        readOnly={readOnly}
        aria-describedby={compact ? undefined : hintId}
        className="mt-0.5 flex h-6 w-11 shrink-0 rounded-temp-pill border border-temp-border bg-temp-band p-0.5 data-checked:border-temp-accent data-checked:bg-temp-accent data-readonly:opacity-60"
      >
        <Switch.Thumb className="size-4.5 rounded-temp-pill bg-temp-surface shadow-temp-card transition-transform data-checked:translate-x-5" />
      </Switch.Root>
      <span className="flex flex-col">
        <span className="font-medium">{item.label}</span>
        {!compact && (
          <span id={hintId} className="text-sm text-temp-ink-muted">
            {item.hint}
          </span>
        )}
      </span>
    </label>
  );
}

/** Role as a pill, Admin highlighted. */
export function RolePill({ role }: { role: Role }): ReactElement {
  return <Pill tone={role === 'admin' ? 'accent' : 'default'}>{ROLE_LABEL[role]}</Pill>;
}

/** Status pill: Aktiv, Eingeladen or Deactivated. */
export function StatusPill({ user }: { user: TeamUser }): ReactElement {
  const tone =
    user.status === 'active' ? 'success' : user.status === 'invited' ? 'accent' : 'danger';
  return <Pill tone={tone}>{STATUS_LABEL[user.status]}</Pill>;
}

/** Text of the confirmation dialogs, by action. */
export function confirmText(kind: 'reset' | 'deactivate' | 'reactivate', user: TeamUser): string {
  switch (kind) {
    case 'reset':
      return user.status === 'invited'
        ? `Der bisherige Einladungslink von ${user.name} wird ungültig.`
        : `Das alte Passwort und alle Sessions von ${user.name} werden sofort ungültig. ${user.name} meldet sich danach über den Link mit einem neuen Passwort an.`;
    case 'deactivate':
      return `${user.name} kann sich nicht mehr anmelden. Sessions, API-Tokens und offene Links werden gelöscht, ein laufender Timer stoppt jetzt. Time Entries und Ausgaben bleiben in Reports und sind weiter abrechenbar.`;
    case 'reactivate':
      return `${user.name} wird wieder aktiv und meldet sich über einen Reset-Link neu an. Du bekommst ihn gleich zum Weitergeben.`;
  }
}

/** Text of the `409 has_dependencies` answer to a delete. */
export function deleteBlockedText(user: TeamUser): string {
  return `${user.name} lässt sich nicht löschen: Dem User gehören Time Entries oder Ausgaben (409 has_dependencies). Deaktiviere den User stattdessen: Die Daten bleiben in Reports.`;
}

const CONFIRM_LABEL = {
  reset: 'Link erzeugen',
  deactivate: 'Deaktivieren',
  reactivate: 'Reaktivieren',
  delete: 'Löschen',
};

type ConfirmDialogsProps = {
  /** State of the Team tab. */
  team: TeamPrototype;
};

/**
 * Confirmations for Reset-Link, Deactivate, Reactivate and Delete (incl. `409 has_dependencies`).
 * @example <ConfirmDialogs team={team} />
 */
export function ConfirmDialogs({ team }: ConfirmDialogsProps): ReactElement | null {
  const { dialog, dialogUser: user } = team;
  if (!dialog || !user || dialog.kind === 'assign' || dialog.kind === 'role') return null;
  const { kind } = dialog;
  const titles = {
    reset: user.status === 'invited' ? 'Neuen Einladungslink erzeugen?' : 'Reset-Link erzeugen?',
    deactivate: `${user.name} deaktivieren?`,
    reactivate: `${user.name} reaktivieren?`,
    delete: team.deleteBlocked ? 'Löschen nicht möglich' : `${user.name} löschen?`,
  };

  const handleConfirm = (): void => {
    if (kind === 'reset') {
      team.handleReset(user.id);
      team.closeDialog();
    } else if (kind === 'deactivate') team.handleDeactivate(user.id);
    else if (kind === 'reactivate') team.handleReactivate(user.id);
    else team.handleDelete(user.id);
  };

  return (
    <Modal title={titles[kind]} open onOpenChange={(open) => !open && team.closeDialog()}>
      <div className="flex flex-col gap-6">
        {kind === 'delete' ? (
          <p role={team.deleteBlocked ? 'alert' : undefined}>
            {team.deleteBlocked
              ? deleteBlockedText(user)
              : `${user.name} wird endgültig entfernt. Das geht nur, solange dem User keine Time Entries oder Ausgaben gehören.`}
          </p>
        ) : (
          <p>{confirmText(kind, user)}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {kind === 'delete' && team.deleteBlocked ? (
            team.permissions(user).deactivate && (
              <Button variant="primary" onClick={() => team.handleDeactivate(user.id)}>
                Stattdessen deaktivieren
              </Button>
            )
          ) : (
            <Button variant="primary" onClick={handleConfirm}>
              {CONFIRM_LABEL[kind]}
            </Button>
          )}
          <Button onClick={team.closeDialog}>
            {team.deleteBlocked ? 'Schließen' : 'Abbrechen'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
