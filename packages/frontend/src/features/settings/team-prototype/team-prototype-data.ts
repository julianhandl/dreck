/*
 * PROTOTYPE (Wayfinder ticket 08, Settings-Tab „Team"): throwaway, in-memory only, no backend.
 * Three variants of the Team tab on /settings/team-prototype, switchable via `?variant=A|B|C`;
 * `?as=admin|manager` switches the viewer. Lives on branch `prototype/team-settings-tab` only.
 */

export type Role = 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'invited' | 'deactivated';
export type Viewer = 'admin' | 'manager';

/** Assignment of a Member; `projectIds` is kept while "Alle" is chosen. */
export type Access = { allProjects: boolean; projectIds: number[] };

export type TeamUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  access: Access;
  /** Owns Time Entries or Ausgaben: delete answers `409 has_dependencies`. */
  hasData: boolean;
  /** Text like „vor 2 Tagen", only for the list. */
  lastSeen: string;
};

export type ProtoProject = { id: number; name: string; archived?: boolean };
export type ProtoCustomer = { name: string; projects: ProtoProject[] };

export type MemberToggles = { amounts: boolean; budget: boolean; projectReport: boolean };

export const CUSTOMERS: ProtoCustomer[] = [
  {
    name: 'Bergbäckerei Lechner GmbH',
    projects: [
      { id: 1, name: 'Website-Relaunch' },
      { id: 2, name: 'Online-Shop' },
      { id: 3, name: 'Wartung & Hosting' },
      { id: 4, name: 'Newsletter-Anbindung', archived: true },
    ],
  },
  {
    name: 'Kanzlei Huber & Partner',
    projects: [
      { id: 5, name: 'Website' },
      { id: 6, name: 'Mandantenportal' },
      { id: 7, name: 'DSGVO-Check' },
    ],
  },
  {
    name: 'Alpenlogistik Transport GmbH',
    projects: [
      { id: 8, name: 'Server-Migration' },
      { id: 9, name: 'ERP-Schnittstelle' },
    ],
  },
  {
    name: 'Weinhof Steiner',
    projects: [
      { id: 10, name: 'Website' },
      { id: 11, name: 'Weinshop' },
    ],
  },
  {
    name: 'Intern',
    projects: [
      { id: 12, name: 'Weiterbildung' },
      { id: 13, name: 'Administration' },
    ],
  },
];

const ALL: Access = { allProjects: true, projectIds: [] };

export const INITIAL_USERS: TeamUser[] = [
  {
    id: 1,
    name: 'Martina Gruber',
    email: 'martina@gruber-digital.at',
    role: 'admin',
    status: 'active',
    access: ALL,
    hasData: true,
    lastSeen: 'gerade eben',
  },
  {
    id: 2,
    name: 'Thomas Wieser',
    email: 'thomas@gruber-digital.at',
    role: 'manager',
    status: 'active',
    access: ALL,
    hasData: true,
    lastSeen: 'heute',
  },
  {
    id: 3,
    name: 'Lena Huber',
    email: 'lena@gruber-digital.at',
    role: 'member',
    status: 'active',
    access: ALL,
    hasData: true,
    lastSeen: 'gestern',
  },
  {
    id: 4,
    name: 'Jakob Steiner',
    email: 'jakob.steiner@freelance.at',
    role: 'member',
    status: 'active',
    access: { allProjects: false, projectIds: [1, 2, 10, 11] },
    hasData: true,
    lastSeen: 'vor 3 Tagen',
  },
  {
    id: 5,
    name: 'Eva Moser',
    email: 'eva.moser@gmail.com',
    role: 'member',
    status: 'invited',
    access: { allProjects: false, projectIds: [5, 6] },
    hasData: false,
    lastSeen: '–',
  },
  {
    id: 6,
    name: 'Paul Bauer',
    email: 'paul@gruber-digital.at',
    role: 'member',
    status: 'deactivated',
    access: ALL,
    hasData: true,
    lastSeen: 'vor 4 Monaten',
  },
];

/** The signed-in User per viewer: Martina (Admin) or Thomas (Manager). */
export const VIEWER_USER_ID: Record<Viewer, number> = { admin: 1, manager: 2 };

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Aktiv',
  invited: 'Eingeladen',
  deactivated: 'Deactivated',
};

export const ALL_PROJECTS = CUSTOMERS.flatMap((c) => c.projects);

/** Whether `user` is the only active Admin: neither deactivate nor demote. */
export function isLastActiveAdmin(users: TeamUser[], user: TeamUser): boolean {
  if (user.role !== 'admin' || user.status !== 'active') return false;
  return users.filter((u) => u.role === 'admin' && u.status === 'active').length === 1;
}

/** Manager acts on Members only; Admin on everyone. */
export function canManage(viewer: Viewer, user: TeamUser): boolean {
  return viewer === 'admin' || user.role === 'member';
}

/** „Alle Projects", „4 von 13 Projects" or „–" for Admin and Manager. */
export function accessSummary(user: TeamUser): string {
  if (user.role !== 'member') return 'Alle (Role)';
  if (user.access.allProjects) return 'Alle Projects';
  const n = user.access.projectIds.length;
  return `${n} von ${ALL_PROJECTS.length} Projects`;
}

/** Projects the Member sees before but not after the change. */
export function lostProjects(before: Access, after: Access): ProtoProject[] {
  const sees = (a: Access, id: number): boolean => a.allProjects || a.projectIds.includes(id);
  return ALL_PROJECTS.filter((p) => sees(before, p.id) && !sees(after, p.id));
}

/** Hint after an Assignment change that removes Projects. */
export function accessLossText(name: string, lost: ProtoProject[]): string {
  if (lost.length === 0) return '';
  const names = lost.map((p) => p.name).join(', ');
  return `${name} sieht ${lost.length === 1 ? 'dieses Project' : `diese ${lost.length} Projects`} nicht mehr: ${names}. Eigene Time Entries und Ausgaben dort bleiben lesbar, sind aber gesperrt; ein laufender Timer stoppt.`;
}

export type PreviewLine = {
  /** Area, e.g. „Budget". */
  area: string;
  /** What a Member sees there with the current switches. */
  text: string;
  /** Whether a switch widens what Members see here. */
  widened: boolean;
};

/** What a Member sees with the given switches; the first line is always the same. */
export function memberPreview(t: MemberToggles): PreviewLine[] {
  return [
    {
      area: 'Immer',
      text: 'Eigene Time Entries und Ausgaben (Ausgaben mit Betrag), das eigene User-Budget, Name, Customer und Tasks der Projects, die sie sehen.',
      widened: false,
    },
    {
      area: 'Beträge',
      text: t.amounts
        ? 'Hourly Rate und Wert ihrer Time Entries, überall wo sie Stunden sehen.'
        : 'Nur Stunden. Keine Hourly Rates, keine Beträge von Time Entries.',
      widened: t.amounts,
    },
    {
      area: 'Budget',
      text: t.budget
        ? `Members sehen die gebuchten Stunden des ganzen Projects. Budgets in Stunden${t.amounts ? ' und in Betrag' : '; in Betrag nur zusammen mit „Beträge sehen“'}.`
        : 'Keine Budgets der Projects, auch keine Prozente.',
      widened: t.budget,
    },
    {
      area: 'Report',
      text: t.projectReport
        ? `Stunden aller User auf ihren Projects, mit Namen und Filter „User“${t.amounts ? ', mit Beträgen' : ', ohne Beträge'}.`
        : 'Nur eigene Time Entries und Ausgaben, keine fremden Namen.',
      widened: t.projectReport,
    },
  ];
}

export const TOGGLES: { key: keyof MemberToggles; label: string; hint: string }[] = [
  {
    key: 'amounts',
    label: 'Beträge sehen',
    hint: 'Hourly Rate und Wert von Time Entries.',
  },
  {
    key: 'budget',
    label: 'Budget sehen',
    hint: 'Budget des Projects in Stunden, mit „Beträge sehen“ auch in Betrag.',
  },
  {
    key: 'projectReport',
    label: 'Project-Report sehen',
    hint: 'Report mit den Stunden aller User auf sichtbaren Projects.',
  },
];

/** One-time link as the server would return it. */
export function fakeLink(kind: 'invite' | 'reset'): string {
  const token = crypto.getRandomValues(new Uint8Array(18));
  const text = btoa(String.fromCharCode(...token))
    .replaceAll('+', '-')
    .replaceAll('/', '_');
  return `${window.location.origin}/${kind}/${text}`;
}
