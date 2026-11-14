import type { UpdateSettings } from '@dreck/shared/api/settings';
import type { InvoiceGrouping } from '@dreck/shared/invoice-items';

/**
 * Test data of a solo full-stack web developer over the past year. All dates are days before the
 * day the seed runs, so the data stays "the past year" whenever it is generated.
 */

type ProjectSeed = {
  /** Unique key to reference the Project from Expenses, Invoices and special entries. */
  key: string;
  name: string;
  /** Defaults to the Hourly Rate of the Customer. */
  hourlyRateMinor?: number;
  /** Active from … to, in days ago (`to: 0` = ongoing). */
  from: number;
  to: number;
  /** Relative share of the working days while active. */
  weight: number;
  descriptions: readonly string[];
  archived?: boolean;
};

type CustomerSeed = {
  name: string;
  hourlyRateMinor: number;
  address: string | null;
  archived?: boolean;
  /** Internal Customer: its time is booked besides the billable work, not instead of it. */
  internal?: boolean;
  projects: readonly ProjectSeed[];
};

type ExpenseSeed = {
  project: string;
  daysAgo: number;
  amountMinor: number;
  description: string;
  billable: boolean;
};

type MonthlyExpenseSeed = Omit<ExpenseSeed, 'daysAgo'> & {
  dayOfMonth: number;
  from: number;
  to: number;
};

type RateChangeSeed = {
  customer: string;
  daysAgo: number;
  hourlyRateMinor: number;
  /** Projects that take over the new rate; their existing Time Entries keep the old one. */
  projects: readonly string[];
};

type SpecialEntrySeed = {
  project: string;
  daysAgo: number;
  durationSeconds: number;
  description: string;
  /** Corrected by hand after creating the entry. */
  hourlyRateMinor: number;
};

type InvoiceSeed = {
  customer: string;
  /** Only this Project of the Customer. */
  project?: string;
  from: number;
  to: number;
  issued: number;
  /** Without `paid` and without `draft` the Invoice stays sent. */
  paid?: number;
  draft?: boolean;
  subject: string;
  grouping: InvoiceGrouping;
  expenses: boolean;
  discountBasisPoints?: number;
};

export const DAYS_OF_HISTORY = 365;
export const PAYMENT_TERM_DAYS = 14;
export const TIMEZONE = 'Europe/Vienna';

export const SETTINGS: UpdateSettings = {
  currency: 'EUR',
  defaultHourlyRateMinor: 9500,
  roundingMinutes: 15,
  language: 'de',
  timezone: TIMEZONE,
  senderName: 'Alex Muster – Webentwicklung',
  senderAddress: 'Musterstraße 12\n4020 Linz\nÖsterreich',
  senderVatId: 'ATU12345678',
  defaultTaxBasisPoints: 2000,
  defaultInvoiceNotes:
    'Zahlbar innerhalb von 14 Tagen ohne Abzug.\nIBAN: AT00 1234 5678 9012 3456 · BIC: MUSTATXXXXX\nVielen Dank für die gute Zusammenarbeit!',
  defaultTasks: [
    { name: 'Design', billable: true },
    { name: 'Entwicklung', billable: true },
    { name: 'Projektmanagement', billable: true },
    { name: 'Akquise', billable: false },
  ],
};

const WEBSITE_DESCRIPTIONS = [
  'Abstimmung Sitemap und Inhalte',
  'Layout Startseite umsetzen',
  'Komponenten für Unterseiten',
  'Responsive-Anpassungen',
  'Kontaktformular mit Spamschutz',
  'Bilder optimieren und einbinden',
  'SEO: Meta-Daten und Sitemap',
  'Barrierefreiheit prüfen und korrigieren',
  'Feedbackrunde einarbeiten',
  'Go-live und DNS-Umstellung',
] as const;

const SHOP_DESCRIPTIONS = [
  'Produktimport aus CSV',
  'Warenkorb und Checkout anpassen',
  'Versandkostenregeln',
  'Zahlungsanbieter einbinden',
  'Bestellbestätigung per E-Mail',
  'Produktfilter und Suche',
  'Rechtstexte und Pflichtangaben',
  'Testbestellungen und Bugfixing',
] as const;

const BACKEND_DESCRIPTIONS = [
  'Datenmodell und Migrationen',
  'REST-Endpunkte implementieren',
  'Authentifizierung und Rollen',
  'Validierung und Fehlerbehandlung',
  'Integrationstests',
  'Code-Review und Refactoring',
  'Performance: Abfragen optimieren',
  'API-Dokumentation (OpenAPI)',
  'Abstimmung mit dem Team',
] as const;

const INTERFACE_DESCRIPTIONS = [
  'Schnittstellen-Spezifikation abstimmen',
  'Mapping der Datenfelder',
  'Import-Job mit Wiederholungslogik',
  'Webhook-Empfang und Signaturprüfung',
  'Fehlerprotokoll und Alerting',
  'Testlauf mit Echtdaten',
  'Sonderfälle im Datenabgleich',
  'Deployment und Übergabe',
] as const;

const SERVER_DESCRIPTIONS = [
  'Server aufsetzen und härten',
  'Reverse Proxy und TLS',
  'Docker-Compose-Setup',
  'Backup-Strategie einrichten',
  'Datenmigration vom Altsystem',
  'Monitoring und Alerts',
  'CI/CD-Pipeline',
  'Dokumentation für den Betrieb',
] as const;

const MAINTENANCE_DESCRIPTIONS = [
  'Updates und Sicherheitspatches',
  'Backup-Kontrolle',
  'Kleine Textänderungen',
  'Fehleranalyse nach Kundenmeldung',
  'Zertifikat und Domain prüfen',
  'Support per Telefon',
] as const;

const OPS_DESCRIPTIONS = [
  'Störung analysiert und behoben',
  'Updates eingespielt',
  'Speicherplatz bereinigt',
  'Logrotation angepasst',
  'Monatlicher Systemcheck',
] as const;

export const CUSTOMERS: readonly CustomerSeed[] = [
  {
    name: 'Bergbäckerei Lechner GmbH',
    hourlyRateMinor: 9000,
    address: 'Hauptplatz 4\n4560 Kirchdorf an der Krems\nUID: ATU98765432',
    projects: [
      {
        key: 'lechner-relaunch',
        name: 'Website-Relaunch',
        from: 365,
        to: 250,
        weight: 3,
        descriptions: WEBSITE_DESCRIPTIONS,
      },
      {
        key: 'lechner-shop',
        name: 'Online-Shop',
        from: 240,
        to: 90,
        weight: 3,
        descriptions: SHOP_DESCRIPTIONS,
      },
      {
        key: 'lechner-maintenance',
        name: 'Wartung & Hosting',
        hourlyRateMinor: 7500,
        from: 250,
        to: 0,
        weight: 0.5,
        descriptions: MAINTENANCE_DESCRIPTIONS,
      },
      {
        key: 'lechner-newsletter',
        name: 'Newsletter-Anbindung',
        from: 30,
        to: 0,
        weight: 2,
        descriptions: INTERFACE_DESCRIPTIONS,
      },
    ],
  },
  {
    name: 'Kanzlei Huber & Partner',
    hourlyRateMinor: 11000,
    address: 'Landstraße 21\n4020 Linz',
    projects: [
      {
        key: 'huber-website',
        name: 'Website',
        from: 340,
        to: 270,
        weight: 3,
        descriptions: WEBSITE_DESCRIPTIONS,
        archived: true,
      },
      {
        key: 'huber-portal',
        name: 'Mandantenportal',
        from: 190,
        to: 0,
        weight: 3,
        descriptions: BACKEND_DESCRIPTIONS,
      },
      {
        key: 'huber-gdpr',
        name: 'DSGVO-Check',
        from: 120,
        to: 105,
        weight: 2,
        descriptions: [
          'Cookie-Banner prüfen',
          'Datenschutzerklärung abgleichen',
          'Tracking entfernen',
        ],
      },
      {
        key: 'huber-maintenance',
        name: 'Wartung',
        from: 270,
        to: 0,
        weight: 0.4,
        descriptions: MAINTENANCE_DESCRIPTIONS,
      },
    ],
  },
  {
    name: 'Alpenlogistik Transport GmbH',
    hourlyRateMinor: 12000,
    address: 'Industriezeile 88\n4030 Linz\nUID: ATU55511122',
    projects: [
      {
        key: 'alpen-migration',
        name: 'Server-Migration',
        from: 300,
        to: 260,
        weight: 3,
        descriptions: SERVER_DESCRIPTIONS,
      },
      {
        key: 'alpen-erp',
        name: 'ERP-Schnittstelle',
        from: 290,
        to: 160,
        weight: 3,
        descriptions: INTERFACE_DESCRIPTIONS,
      },
      {
        key: 'alpen-tracking',
        name: 'Sendungsverfolgung API',
        from: 160,
        to: 0,
        weight: 3,
        descriptions: BACKEND_DESCRIPTIONS,
      },
      {
        key: 'alpen-ops',
        name: 'Betrieb & Monitoring',
        hourlyRateMinor: 9500,
        from: 260,
        to: 0,
        weight: 0.6,
        descriptions: OPS_DESCRIPTIONS,
      },
    ],
  },
  {
    name: 'Weinhof Steiner',
    hourlyRateMinor: 8500,
    address: 'Kellergasse 7\n3550 Langenlois',
    archived: true,
    projects: [
      {
        key: 'steiner-website',
        name: 'Website',
        from: 365,
        to: 300,
        weight: 2,
        descriptions: WEBSITE_DESCRIPTIONS,
      },
      {
        key: 'steiner-shop',
        name: 'Weinshop',
        from: 310,
        to: 215,
        weight: 2,
        descriptions: SHOP_DESCRIPTIONS,
      },
    ],
  },
  {
    name: 'Fitwerk Studios OG',
    hourlyRateMinor: 10000,
    address: 'Bahnhofstraße 15\n4600 Wels',
    projects: [
      {
        key: 'fitwerk-server',
        name: 'Server-Setup',
        from: 215,
        to: 195,
        weight: 2,
        descriptions: SERVER_DESCRIPTIONS,
      },
      {
        key: 'fitwerk-booking',
        name: 'Buchungssystem Backend',
        from: 210,
        to: 0,
        weight: 3,
        descriptions: BACKEND_DESCRIPTIONS,
      },
      {
        key: 'fitwerk-payments',
        name: 'Zahlungsanbindung',
        from: 130,
        to: 60,
        weight: 2,
        descriptions: INTERFACE_DESCRIPTIONS,
      },
      {
        key: 'fitwerk-website',
        name: 'Website',
        from: 75,
        to: 20,
        weight: 2,
        descriptions: WEBSITE_DESCRIPTIONS,
      },
    ],
  },
  {
    name: 'Intern',
    hourlyRateMinor: 0,
    address: null,
    internal: true,
    projects: [
      {
        key: 'intern-learning',
        name: 'Weiterbildung',
        from: 365,
        to: 0,
        weight: 0.08,
        descriptions: ['Fachartikel und Doku lesen', 'Online-Kurs', 'Prototyp mit neuem Framework'],
      },
      {
        key: 'intern-admin',
        name: 'Administration',
        from: 365,
        to: 0,
        weight: 0.3,
        descriptions: [
          'Buchhaltung',
          'Angebot schreiben',
          'E-Mails und Telefonate',
          'Akquise-Termin',
        ],
      },
    ],
  },
];

export const RATE_CHANGES: readonly RateChangeSeed[] = [
  {
    customer: 'Bergbäckerei Lechner GmbH',
    daysAgo: 180,
    hourlyRateMinor: 9500,
    projects: ['lechner-shop', 'lechner-newsletter'],
  },
];

export const SPECIAL_ENTRIES: readonly SpecialEntrySeed[] = [
  {
    project: 'lechner-shop',
    daysAgo: 120,
    durationSeconds: 7200,
    description: 'Gewährleistung: Fehler im Warenkorb',
    hourlyRateMinor: 0,
  },
  {
    project: 'fitwerk-booking',
    daysAgo: 80,
    durationSeconds: 5400,
    description: 'Kulanz: Einschulung Studio-Team',
    hourlyRateMinor: 5000,
  },
];

export const MONTHLY_EXPENSES: readonly MonthlyExpenseSeed[] = [
  {
    project: 'intern-admin',
    dayOfMonth: 1,
    from: 365,
    to: 0,
    amountMinor: 18900,
    description: 'Coworking-Space Monatsticket',
    billable: false,
  },
  {
    project: 'intern-admin',
    dayOfMonth: 3,
    from: 365,
    to: 0,
    amountMinor: 1190,
    description: 'Cloud-Server für eigene Projekte',
    billable: false,
  },
  {
    project: 'intern-admin',
    dayOfMonth: 12,
    from: 365,
    to: 0,
    amountMinor: 1500,
    description: 'Design-Tool Abo',
    billable: false,
  },
  {
    project: 'alpen-ops',
    dayOfMonth: 5,
    from: 260,
    to: 0,
    amountMinor: 6490,
    description: 'Dedizierter Server (Monatsmiete)',
    billable: true,
  },
  {
    project: 'fitwerk-booking',
    dayOfMonth: 8,
    from: 200,
    to: 0,
    amountMinor: 2900,
    description: 'Managed-Datenbank (Monat)',
    billable: true,
  },
];

export const EXPENSES: readonly ExpenseSeed[] = [
  {
    project: 'steiner-website',
    daysAgo: 358,
    amountMinor: 7900,
    description: 'Premium-Theme-Lizenz',
    billable: true,
  },
  {
    project: 'steiner-website',
    daysAgo: 350,
    amountMinor: 1800,
    description: 'Domain weinhof-steiner.example (1 Jahr)',
    billable: true,
  },
  {
    project: 'steiner-shop',
    daysAgo: 290,
    amountMinor: 12900,
    description: 'Shop-Erweiterung Versandkostenrechner',
    billable: true,
  },
  {
    project: 'lechner-relaunch',
    daysAgo: 330,
    amountMinor: 4500,
    description: 'Stockfotos (5 Bilder)',
    billable: true,
  },
  {
    project: 'lechner-shop',
    daysAgo: 200,
    amountMinor: 9900,
    description: 'Zahlungsmodul-Lizenz',
    billable: true,
  },
  {
    project: 'lechner-shop',
    daysAgo: 150,
    amountMinor: 4200,
    description: 'Fahrtkosten Vor-Ort-Termin (84 km)',
    billable: true,
  },
  {
    project: 'huber-website',
    daysAgo: 320,
    amountMinor: 6000,
    description: 'Webfont-Lizenz',
    billable: true,
  },
  {
    project: 'huber-gdpr',
    daysAgo: 110,
    amountMinor: 8900,
    description: 'Cookie-Consent-Lizenz (1 Jahr)',
    billable: true,
  },
  {
    project: 'alpen-migration',
    daysAgo: 280,
    amountMinor: 2500,
    description: 'Backup-Speicher Erstbefüllung',
    billable: true,
  },
  {
    project: 'alpen-erp',
    daysAgo: 200,
    amountMinor: 6300,
    description: 'Fahrtkosten Workshop vor Ort (126 km)',
    billable: true,
  },
  {
    project: 'alpen-tracking',
    daysAgo: 40,
    amountMinor: 4900,
    description: 'Test-Kontingent Kartendienst-API',
    billable: true,
  },
  {
    project: 'fitwerk-server',
    daysAgo: 205,
    amountMinor: 8900,
    description: 'SSL-Wildcard-Zertifikat',
    billable: true,
  },
  {
    project: 'fitwerk-website',
    daysAgo: 25,
    amountMinor: 3500,
    description: 'Stockvideo für Startseite',
    billable: true,
  },
  {
    project: 'intern-learning',
    daysAgo: 240,
    amountMinor: 39900,
    description: 'Konferenzticket Web-Entwicklung',
    billable: false,
  },
  {
    project: 'intern-learning',
    daysAgo: 130,
    amountMinor: 4990,
    description: 'Fachbuch Datenbank-Design',
    billable: false,
  },
  {
    project: 'intern-learning',
    daysAgo: 60,
    amountMinor: 12900,
    description: 'Online-Kurs Kubernetes',
    billable: false,
  },
  {
    project: 'intern-admin',
    daysAgo: 300,
    amountMinor: 28900,
    description: 'IDE-Lizenz (Jahresabo)',
    billable: false,
  },
  {
    project: 'intern-admin',
    daysAgo: 180,
    amountMinor: 54900,
    description: 'Neuer Monitor',
    billable: false,
  },
  {
    project: 'intern-admin',
    daysAgo: 20,
    amountMinor: 45000,
    description: 'Steuerberatung Quartal',
    billable: false,
  },
];

/** In issue order, so the numbers ascend and the draft is the last Invoice. */
export const INVOICES: readonly InvoiceSeed[] = [
  {
    customer: 'Kanzlei Huber & Partner',
    project: 'huber-website',
    from: 340,
    to: 270,
    issued: 268,
    paid: 255,
    subject: 'Neue Website',
    grouping: 'description',
    expenses: true,
  },
  {
    customer: 'Bergbäckerei Lechner GmbH',
    project: 'lechner-relaunch',
    from: 365,
    to: 250,
    issued: 247,
    paid: 230,
    subject: 'Website-Relaunch',
    grouping: 'project',
    expenses: true,
    discountBasisPoints: 500,
  },
  {
    customer: 'Weinhof Steiner',
    from: 365,
    to: 215,
    issued: 212,
    paid: 200,
    subject: 'Website und Weinshop',
    grouping: 'project',
    expenses: true,
  },
  {
    customer: 'Alpenlogistik Transport GmbH',
    from: 300,
    to: 160,
    issued: 157,
    paid: 140,
    subject: 'Server-Migration und ERP-Schnittstelle',
    grouping: 'project',
    expenses: true,
  },
  {
    customer: 'Fitwerk Studios OG',
    from: 215,
    to: 61,
    issued: 45,
    subject: 'Buchungssystem, Zahlungsanbindung und Server',
    grouping: 'project',
    expenses: true,
  },
  {
    customer: 'Alpenlogistik Transport GmbH',
    from: 159,
    to: 14,
    issued: 1,
    draft: true,
    subject: 'Sendungsverfolgung API und Betrieb',
    grouping: 'description',
    expenses: true,
  },
];

/** `MM-DD` of the fixed Austrian public holidays. */
export const HOLIDAYS = new Set([
  '01-01',
  '01-06',
  '05-01',
  '08-15',
  '10-26',
  '11-01',
  '12-08',
  '12-25',
  '12-26',
]);

/** Vacation as inclusive `MM-DD` ranges; a range with from > to wraps the year. */
export const VACATIONS: readonly (readonly [string, string])[] = [
  ['12-22', '01-06'],
  ['05-26', '05-30'],
  ['08-04', '08-18'],
];
