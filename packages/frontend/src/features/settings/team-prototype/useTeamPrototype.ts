// PROTOTYPE (ticket 08): in-memory state of the Team tab; no API calls, reload resets everything.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  type Access,
  accessLossText,
  canManage,
  fakeLink,
  INITIAL_USERS,
  isLastActiveAdmin,
  lostProjects,
  type MemberToggles,
  type Role,
  type TeamUser,
  VIEWER_USER_ID,
  type Viewer,
} from './team-prototype-data';

export type DialogKind = 'assign' | 'role' | 'reset' | 'deactivate' | 'reactivate' | 'delete';

export type RevealedLink = { userId: number; kind: 'invite' | 'reset'; url: string };

export type Draft = { email: string; name: string; role: Role; access: Access };

export type DraftErrors = { email?: string; name?: string };

/** What the viewer may do with one User, with the reason when the rule blocks it. */
export type Permissions = {
  manage: boolean;
  changeRole: boolean;
  deactivate: boolean;
  reactivate: boolean;
  /** „Der letzte aktive Admin …" when Role and Deactivate are blocked by the rule. */
  lastAdminReason: string;
};

const EMPTY_DRAFT: Draft = {
  email: '',
  name: '',
  role: 'member',
  access: { allProjects: true, projectIds: [] },
};

const LAST_ADMIN =
  'Der letzte aktive Admin lässt sich weder deaktivieren noch herabstufen. Mach zuerst einen anderen User zum Admin.';

/** In-memory Team tab: Users, switches „Was Members sehen", dialogs and one-time links. */
export function useTeamPrototype() {
  const [params, setParams] = useSearchParams();
  const viewer: Viewer = params.get('as') === 'manager' ? 'manager' : 'admin';
  const viewerId = VIEWER_USER_ID[viewer];
  const variant = params.get('variant') ?? 'A';

  const [users, setUsers] = useState<TeamUser[]>(INITIAL_USERS);
  const [toggles, setToggles] = useState<MemberToggles>({
    amounts: false,
    budget: false,
    projectReport: false,
  });
  const [selectedId, setSelectedId] = useState<number | 'new'>(3);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [dialog, setDialog] = useState<{ kind: DialogKind; userId: number } | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [assignDraft, setAssignDraft] = useState<Access>(EMPTY_DRAFT.access);
  const [roleDraft, setRoleDraft] = useState<Role>('member');
  const [revealed, setRevealed] = useState<RevealedLink | null>(null);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  const userById = (id: number): TeamUser | undefined => users.find((u) => u.id === id);
  const update = (id: number, patch: Partial<TeamUser>): void =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const permissions = (user: TeamUser): Permissions => {
    const manage = canManage(viewer, user);
    const lastAdmin = isLastActiveAdmin(users, user);
    return {
      manage,
      changeRole: viewer === 'admin' && !lastAdmin,
      deactivate: manage && user.status !== 'deactivated' && !lastAdmin,
      // GLOSSARY: „Ein Admin kann ihn reaktivieren."
      reactivate: viewer === 'admin' && user.status === 'deactivated',
      lastAdminReason: lastAdmin ? LAST_ADMIN : '',
    };
  };

  const reveal = (userId: number, kind: RevealedLink['kind']): void => {
    setRevealed({ userId, kind, url: fakeLink(kind) });
    setCopied(false);
  };

  const handleViewerChange = (next: Viewer): void => {
    setParams(
      (p) => {
        p.set('as', next);
        return p;
      },
      { replace: true },
    );
    setDialog(null);
    setNotice('');
  };

  const handleCreateOpen = (open: boolean): void => {
    setCreateOpen(open);
    if (open) {
      setDraft(EMPTY_DRAFT);
      setDraftErrors({});
      setRevealed(null);
    }
  };

  const handleDraftChange = (patch: Partial<Draft>): void => setDraft((d) => ({ ...d, ...patch }));

  /** Simulates `POST /users`; returns the new id or `null` on a validation error. */
  const handleCreate = (): number | null => {
    const email = draft.email.trim();
    const errors: DraftErrors = {};
    if (!email.includes('@')) errors.email = 'Gib eine gültige E-Mail ein.';
    else if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      errors.email = 'Diese E-Mail gehört schon zu einem User.';
    if (draft.name.trim() === '') errors.name = 'Gib einen Namen ein.';
    setDraftErrors(errors);
    if (errors.email || errors.name) return null;

    const id = Math.max(...users.map((u) => u.id)) + 1;
    const role = viewer === 'manager' ? 'member' : draft.role;
    setUsers((list) => [
      ...list,
      {
        id,
        name: draft.name.trim(),
        email,
        role,
        status: 'invited',
        access: draft.access,
        hasData: false,
        lastSeen: '–',
      },
    ]);
    reveal(id, 'invite');
    setNotice(`${draft.name.trim()} ist angelegt. Gib den Einladungslink selbst weiter.`);
    setSelectedId(id);
    setExpandedId(null);
    return id;
  };

  const openDialog = (kind: DialogKind, userId: number): void => {
    const user = userById(userId);
    if (!user) return;
    setAssignDraft(user.access);
    setRoleDraft(user.role);
    setDeleteBlocked(false);
    setDialog({ kind, userId });
  };

  const closeDialog = (): void => setDialog(null);

  const handleRoleChange = (userId: number, role: Role): void => {
    const user = userById(userId);
    if (!user || role === user.role) return;
    update(userId, { role });
    setNotice(
      role === 'member'
        ? `${user.name} ist jetzt Member und sieht ${user.access.allProjects ? 'alle Projects' : 'nur die ausgewählten Projects'}.`
        : `${user.name} ist jetzt ${role === 'admin' ? 'Admin' : 'Manager'} und sieht alle Projects.`,
    );
  };

  const handleAccessChange = (userId: number, access: Access): void => {
    const user = userById(userId);
    if (!user) return;
    update(userId, { access });
    setNotice(accessLossText(user.name, lostProjects(user.access, access)));
  };

  const handleSaveAssign = (): void => {
    if (dialog) handleAccessChange(dialog.userId, assignDraft);
    closeDialog();
  };

  const handleSaveRole = (): void => {
    if (dialog) handleRoleChange(dialog.userId, roleDraft);
    closeDialog();
  };

  /** Reset-Link for an active User, new Einladungslink for an invited one. */
  const handleReset = (userId: number): void => {
    const user = userById(userId);
    if (!user) return;
    const kind = user.status === 'invited' ? 'invite' : 'reset';
    reveal(userId, kind);
    setNotice(
      kind === 'invite'
        ? `Neuer Einladungslink für ${user.name}. Der alte gilt nicht mehr.`
        : `Reset-Link für ${user.name}. Altes Passwort und alle Sessions sind ungültig.`,
    );
  };

  const handleDeactivate = (userId: number): void => {
    const user = userById(userId);
    if (!user || !permissions(user).deactivate) return;
    update(userId, { status: 'deactivated' });
    if (revealed?.userId === userId) setRevealed(null);
    setNotice(`${user.name} ist deaktiviert.`);
    closeDialog();
  };

  const handleReactivate = (userId: number): void => {
    const user = userById(userId);
    if (!user) return;
    update(userId, { status: 'active' });
    reveal(userId, 'reset');
    setNotice(`${user.name} ist reaktiviert. Anmelden geht erst über den Reset-Link.`);
    closeDialog();
  };

  /** Simulates `DELETE /users/:id`: `409 has_dependencies` when the User owns data. */
  const handleDelete = (userId: number): void => {
    const user = userById(userId);
    if (!user) return;
    if (user.hasData) {
      setDeleteBlocked(true);
      return;
    }
    setUsers((list) => list.filter((u) => u.id !== userId));
    if (selectedId === userId) setSelectedId(viewerId);
    if (revealed?.userId === userId) setRevealed(null);
    setNotice(`${user.name} ist gelöscht.`);
    closeDialog();
  };

  const handleToggle = (key: keyof MemberToggles, value: boolean): void => {
    if (viewer !== 'admin') return;
    setToggles((t) => ({ ...t, [key]: value }));
  };

  const handleCopy = async (url: string): Promise<void> => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  const handleDismissLink = (): void => setRevealed(null);

  const handleExpand = (userId: number): void =>
    setExpandedId((id) => (id === userId ? null : userId));

  return {
    variant,
    viewer,
    viewerId,
    users,
    toggles,
    selectedId,
    expandedId,
    createOpen,
    draft,
    draftErrors,
    dialog,
    dialogUser: dialog ? userById(dialog.userId) : undefined,
    deleteBlocked,
    assignDraft,
    roleDraft,
    revealed,
    notice,
    copied,
    roleOptions: (viewer === 'admin' ? ['member', 'manager', 'admin'] : ['member']) as Role[],
    permissions,
    userById,
    setSelectedId,
    setAssignDraft,
    setRoleDraft,
    handleViewerChange,
    handleCreateOpen,
    handleDraftChange,
    handleCreate,
    openDialog,
    closeDialog,
    handleRoleChange,
    handleAccessChange,
    handleSaveAssign,
    handleSaveRole,
    handleReset,
    handleDeactivate,
    handleReactivate,
    handleDelete,
    handleToggle,
    handleCopy,
    handleDismissLink,
    handleExpand,
  };
}

export type TeamPrototype = ReturnType<typeof useTeamPrototype>;
