# Dreck – Spec

Stand 2026-11-09. Zusammengeführt aus der [Wayfinder-Map](wayfinder/map.md). Die Begründungen stehen in den verlinkten Tickets, diese Datei enthält nur die gültigen Entscheidungen. Bei Widerspruch gilt diese Datei. Vokabular: [`GLOSSARY.md`](../GLOSSARY.md) ist verbindlich.

## 1. Produkt

- Einfache Zeiterfassung und Expenses für Einzelunternehmer: Arbeitszeit und Expenses auf Projects buchen und je Project und Customer auswerten. Single-User, eine Instanz pro User.
- Selbst gehostet als Docker-Image. Open Source unter AGPL-3.0-only (Abschnitt 10).
- **API-first:** Die UI nutzt ausschließlich die öffentliche, per OpenAPI beschriebene API. Ein späteres CLI und ein MCP-Server sollen dieselbe API nutzen.
- Deutsch und Englisch.
- Leitlinie: Einfachheit vor Vollständigkeit. Jede Erweiterung wird gegen die „Be lazy“-Leiter in `AGENTS.md` geprüft.

### Nicht im Umfang

- Cloud-Version und Hosting vieler Instanzen (später als eigener Fork, heute kein Tenant-Konzept).
- CLI und MCP-Server (später, die API ist dafür ausgelegt).
- Offline-Editing und Sync, Service Worker.
- Rechnungen, Estimates, Budgets, Tasks, Tags, Approval, Team und Multi-User, wiederkehrende oder duplizierte Expenses, Belege an Expenses, automatische Kostenaufteilung, native Apps.
- Uhrzeiten an Time Entries, Overlap, Wochenansicht.

Quellen: [Produktumfang und Grundregeln](wayfinder/tickets/00-produktumfang-und-grundregeln.md), [Offline-Sync-Modell](wayfinder/tickets/03-offline-sync-modell.md), [Wochenansicht](wayfinder/tickets/08-wochenansicht.md).

## 2. Domänenregeln

- Jedes Project gehört zu genau einem Customer. Interne Arbeit läuft über einen Customer wie „Intern“ (Hourly Rate 0). Kein Seed, der User legt ihn selbst an.
- **Time Entry:** Datum, Dauer, optionale Beschreibung, Hourly Rate. Keine Uhrzeiten. Höchstens einer läuft (der Timer).
- **Timer:** Ein neuer Timer legt einen Time Entry mit dem heutigen Datum an oder setzt einen Time Entry von heute fort. Ein neuer oder fortgesetzter Timer stoppt den laufenden. Time Entries früherer Tage lassen sich nur bearbeiten, nicht starten. Ein Timer über Mitternacht behält die ganze Dauer am Starttag. „Heute“ ist der Tag in der Zeitzone der Instanz.
- **Expense:** Datum, Betrag > 0, Pflicht-Beschreibung, Billable ja/nein, genau ein Project. Keine Gutschriften.
- **Währung:** eine pro Instanz. Änderbar nur, solange es weder Customer noch Expense gibt.
- **Hourly Rate**, Kopierkette beim Anlegen, keine Live-Vererbung: Default Hourly Rate → Customer → Project → Time Entry.
  - Ein Time Entry übernimmt beim Anlegen und beim Start eines neuen Timers die Rate seines Projects. Ein fortgesetzter Time Entry behält seine Rate.
  - Korrektur von Hand am Time Entry (Feld „Hourly Rate“ im Dialog „Time Entry bearbeiten“) markiert ihn als „von Hand korrigiert“.
  - Verschieben auf ein anderes Project übernimmt dessen Rate und hebt die Markierung auf. Wird zugleich eine Rate mitgeschickt, gewinnt sie, und der Time Entry gilt als korrigiert.
  - Änderung am Project: Der User entscheidet, ob bestehende Time Entries die neue Rate übernehmen, optional nur in einem Zeitraum (Kalendertage, beide inklusive). Von Hand korrigierte bleiben unberührt, außer er überschreibt sie ausdrücklich; danach gelten sie nicht mehr als korrigiert.
  - Änderung am Customer: Der User wählt, welche seiner Projects die neue Rate bekommen (vorausgewählt: die mit der alten Rate des Customers). Die gewählten Projects bekommen sie immer, auch bei „Nur für neue Time Entries“. Für ihre bestehenden Time Entries gilt die Regel am Project mit einem gemeinsamen Zeitraum.
  - Rate und betroffene Time Entries ändern sich in einem Aufruf und einer Transaktion.
  - Eine Änderung der Default Hourly Rate betrifft nur neue Customers.
- **Rounding:** pro Instanz 0 (exakt), 5, 6, 10, 15, 30 oder 60 Minuten. Jeder Time Entry wird für den Report einzeln aufgerundet (3 × 7 min bei 15 = 45 min); dabei zählen nur volle Minuten, Sekunden einer angefangenen Minute fallen weg. Eine Dauer auf einem Vielfachen des Rounding-Schritts bleibt dort, bis die nächste volle Minute erreicht ist (bei 15: 15:59 = 15 min, 16:00 = 30 min; bei 6: 6:59 = 6 min, 7:00 = 12 min). Gespeichert wird immer die exakte Dauer, Rounding wirkt also rückwirkend.
- **Archived:** Customer und Project lassen sich archivieren und wiederherstellen. Archived verschwindet aus Auswahllisten und bleibt in Reports. Ein archivierter Customer blendet auch seine Projects aus; nach dem Aufheben gilt wieder der Zustand der Projects (keine Kaskade).
- **Löschen:** Customer und Project nur ohne Abhängigkeiten, sonst nur archivieren. Time Entries und Expenses lassen sich direkt löschen.
- **Report:** frei wählbarer Zeitraum (Kalendertage, inklusive), gegliedert nach Customer und darunter Project. Zeigt Stunden (exakt und nach Rounding), Beträge, Billable Expenses und eigene Kosten getrennt. Archived ist enthalten. Ein laufender Timer zählt bis jetzt. Export als CSV.
- **Rechnung im Report:** Betrag pro Time Entry = `round(hourlyRateMinor × Sekunden nach Rounding / 3600)`, kaufmännisch auf die kleinste Einheit. Summen pro Project und Customer addieren diese gerundeten Beträge, damit CSV und Report übereinstimmen.
- **Zeit:** Der Server ermittelt die Zeit nur in JS (`Date.now()`), nie in SQL (`unixepoch()`, `CURRENT_TIMESTAMP`). Das hält Tests steuerbar.

Quellen: [Datenmodell](wayfinder/tickets/04-datenmodell.md), [Time Entry als Datum und Dauer](wayfinder/tickets/12-time-entry-als-datum-und-dauer.md).

## 3. Datenmodell (SQLite)

### Querschnitt

- Geld als `INTEGER` in der kleinsten Einheit der Währung, Spalten mit Suffix `_minor`. Nachkommastellen nach ISO 4217 über `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits` (EUR: Cent, JPY: ganze Yen).
- Kalenderdaten als `TEXT` `YYYY-MM-DD`. Zeitpunkte (nur `running_since`) als `INTEGER` Unix-Sekunden UTC.
- IDs `INTEGER PRIMARY KEY`, vergeben vom Server. Booleans `INTEGER 0/1`.
- `PRAGMA journal_mode = WAL` und `PRAGMA foreign_keys = ON` beim Öffnen. Alle Foreign Keys `ON DELETE RESTRICT`.
- Nicht im Schema: `created_at`/`updated_at`, Sessions, Fehlversuche, Versionen für Concurrency.

### Tabellen

| Tabelle | Spalten | Constraints |
|---|---|---|
| `settings` | `id`, `currency` (ISO 4217), `default_hourly_rate_minor`, `rounding_minutes`, `language`, `timezone` (IANA) | genau eine Zeile (`CHECK (id = 1)`), alle `NOT NULL`; Rate ≥ 0; `rounding_minutes` ∈ {0, 5, 6, 10, 15, 30, 60}; `language` ∈ {`de`, `en`} |
| `customers` | `id`, `name`, `hourly_rate_minor`, `archived` | `name UNIQUE COLLATE NOCASE`; Rate `NOT NULL`, ≥ 0 |
| `projects` | `id`, `customer_id`, `name`, `hourly_rate_minor`, `archived` | `customer_id NOT NULL` FK; `UNIQUE (customer_id, name COLLATE NOCASE)`; Rate `NOT NULL`, ≥ 0 |
| `time_entries` | `id`, `project_id`, `date`, `duration_seconds`, `running_since`, `description`, `hourly_rate_minor`, `hourly_rate_overridden` | `project_id NOT NULL` FK; `duration_seconds NOT NULL`, ≥ 0, ohne Obergrenze; `running_since` nur gesetzt, solange er läuft; Unique-Index `ON time_entries ((1)) WHERE running_since IS NOT NULL`; Index auf `date` und `project_id`; `description` `NULL` statt Leerstring; Rate `NOT NULL`, ≥ 0 |
| `expenses` | `id`, `project_id`, `date`, `amount_minor`, `description`, `billable` | `project_id NOT NULL` FK; `amount_minor > 0`; `CHECK (length(trim(description)) > 0)`; Index auf `date` und `project_id` |

- Angezeigte Dauer eines laufenden Time Entries = `duration_seconds + (jetzt − running_since)`.
- Die erste Migration legt die Zeile in `settings` an: `EUR`, Rate 0, Rounding 0, `de`, `UTC`. Einen Zustand „nicht eingerichtet“ gibt es nicht.
- Partial Index per Drizzle `.where(sql\`…\`)`, vor der Umsetzung gegen die aktuelle Drizzle-Doku prüfen.

## 4. API-Vertrag

### Form

- Präfix `/api/v1`, Ressourcen im Plural, flach, Filter über Query-Parameter.
- `POST` legt an (`201` + Datensatz), `PATCH` ändert Teile (`200` + Datensatz), `DELETE` löscht (`204`). Kein `PUT`, kein `GET /:id`, keine Bulk-Endpunkte, keine Pagination, keine Sortier-Parameter.
- JSON in camelCase, DB in snake_case, Drizzle übersetzt. Geld mit Suffix `Minor` (`hourlyRateMinor`, `defaultHourlyRateMinor`, `amountMinor`). Dauern in Sekunden.
- Daten als `YYYY-MM-DD`. `from` und `to` sind überall Kalenderdaten, beide inklusive. Zeitpunkte gibt es nur in `at` (Eingabe, ISO 8601 mit Offset, ohne Offset `400`) und `runningSince` (Ausgabe, UTC mit `Z`).
- Sortierung: Time Entries nach `date` absteigend, innerhalb eines Tages nach `id` aufsteigend; Expenses nach `date` absteigend; Customers und Projects nach `name` (NOCASE). Customers und Projects liefern auch Archived mit Flag `archived`, der Client filtert.
- Last-Write-Wins, keine Versionen, kein `If-Match`, auch nicht für das CLI.
- Eine einzige Quelle für Validierung, Typen und Beschreibung: `createRoute` aus `@hono/zod-openapi`.

### Endpunkte (unter `/api/v1`)

| Ressource | Endpunkte |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout` |
| Settings | `GET /settings`, `PATCH /settings` |
| Customers | `GET /customers`, `POST /customers`, `PATCH /customers/:id`, `DELETE /customers/:id` |
| Projects | `GET /projects`, `POST /projects`, `PATCH /projects/:id`, `DELETE /projects/:id` |
| Time Entries | `GET /time-entries[?from][&to][&projectId][&customerId]`, `POST /time-entries`, `PATCH /time-entries/:id`, `DELETE /time-entries/:id` |
| Timer | `GET /timer`, `POST /timer/start`, `POST /timer/stop` |
| Expenses | `GET /expenses[?from][&to][&projectId][&customerId]`, `POST /expenses`, `PATCH /expenses/:id`, `DELETE /expenses/:id` |
| Reports | `GET /reports?from&to[&customerId][&projectId][&format=csv]` |
| Backup | `GET /backup` |
| OpenAPI | `GET /openapi.json` (ohne Auth, keine Viewer-UI) |

Außerhalb von `/v1`: `GET /api/health` ohne Auth, `200 { ok: true }`, sobald die DB offen ist und die Migration gelaufen ist.

Filter werden per UND kombiniert. Bei `GET /time-entries` und `GET /expenses` sind `from` und `to` optional (ohne beide: alle). Das braucht die Rückfrage zur Hourly Rate mit leerem Zeitraum.

### Ressourcen

- **Customer** `{ id, name, hourlyRateMinor, archived }`. `POST` ohne Rate übernimmt die Default Hourly Rate.
- **Project** `{ id, customerId, name, hourlyRateMinor, archived }`. `POST` ohne Rate übernimmt die Rate des Customers.
- **Time Entry** `{ id, projectId, date, durationSeconds, runningSince, description, hourlyRateMinor, hourlyRateOverridden }`. `durationSeconds` ohne den laufenden Teil, den der Client dazurechnet.
  - `POST /time-entries` mit `{ projectId, date, durationSeconds, description? }`. Ein laufender Time Entry entsteht nur über den Timer.
  - `PATCH /time-entries/:id` ändert `projectId`, `date`, `durationSeconds`, `description`, `hourlyRateMinor`. Nur `projectId`: Rate des neuen Projects, `hourlyRateOverridden = false`. Nur `hourlyRateMinor`: `hourlyRateOverridden = true`. Beides: die mitgeschickte Rate gewinnt, `true`. Bei einem laufenden Time Entry setzt `durationSeconds` die angezeigte Gesamtdauer (`duration_seconds = Wert`, `running_since = jetzt`).
- **Expense** `{ id, projectId, date, amountMinor, description, billable }`.
- **Settings** `{ currency, defaultHourlyRateMinor, roundingMinutes, language, timezone }`. `PATCH` ändert alles jederzeit, außer `currency` nach dem ersten Customer oder der ersten Expense (`409 currency_locked`). `timezone` wird gegen `Intl.supportedValuesOf('timeZone')` geprüft.

### Timer

- `GET /timer`: der laufende Time Entry oder `null`.
- `POST /timer/start` mit genau einem von `{ projectId, description?, at? }` (neu) oder `{ timeEntryId, at? }` (fortsetzen). Antwort `200 { started, stopped }`, `stopped` ist der in derselben Transaktion gestoppte Time Entry oder `null`.
  - Neu: `date` = heute in `settings.timezone`, Rate des Projects.
  - Fortsetzen nur für Time Entries von heute, sonst `400 validation_failed`. Die Rate bleibt.
- `POST /timer/stop` mit `{ at? }`. Antwort `200` + Time Entry. Läuft keiner: `409 no_running_timer`.
- `at` ist der Zeitpunkt des Klicks. Der Server nimmt `min(at, Serverzeit)`. Start setzt `running_since`, Stopp rechnet `duration_seconds += t − running_since` und setzt `running_since = NULL`. `at` vor `running_since` des laufenden Timers ergibt `400 validation_failed`. `at` hat keine Untergrenze.

### Hourly Rate übernehmen

- `PATCH /projects/:id` mit `{ hourlyRateMinor, applyToTimeEntries?: { from?, to?, includeOverridden? } }`.
- `PATCH /customers/:id` mit `{ hourlyRateMinor, applyToProjects?: { projectIds, applyToTimeEntries?: { from?, to?, includeOverridden? } } }`. Ohne `applyToTimeEntries` ändern sich nur die Projects.
- Eine Transaktion. Kein Preview-Endpunkt: Die UI holt die betroffenen Time Entries über `GET /time-entries?projectId&from&to` und rechnet die Vorschau selbst.

### Report und CSV

- `GET /reports` liefert JSON mit Summen pro Customer und darunter pro Project: exakte und gerundete Sekunden, Betrag, Billable Expenses, eigene Kosten. Rechnung wie in Abschnitt 2.
- `?format=csv` oder `Accept: text/csv`: Der Server erzeugt das CSV mit denselben Filtern. Eine Zeile pro Time Entry und Expense. Spalten: Typ, Customer, Project, Datum, Dauer (gerundet, Minuten), Beschreibung, Hourly Rate, Betrag, Billable.
  - Spaltennamen und Typ in `settings.language`. `de`: Trennzeichen `;`, Dezimalkomma. `en`: `,`, Dezimalpunkt. Beträge in der Haupteinheit.
  - UTF-8 mit BOM, Dateiname `dreck-report_<from>_<to>.csv`.

### Backup

- `GET /backup` (Auth nötig) erzeugt per `VACUUM INTO` einen Snapshot in einer temporären Datei unter `/data`, streamt ihn als `dreck-backup_<datum>.db` und löscht die Datei danach.

### Fehler

Format `{ "code": "…", "message": "…", "details": { … } }`. `code` stabil und englisch, `message` englisch für Entwickler. Die UI übersetzt den `code`.

| Code | Status |
|---|---|
| `validation_failed` (Zod-Issues in `details`) | 400 |
| `unauthorized` | 401 |
| `not_found` | 404 |
| `has_dependencies` (FK-Verletzung beim Löschen) | 409 |
| `name_taken` (Unique-Verletzung) | 409 |
| `currency_locked` | 409 |
| `no_running_timer` | 409 |
| `rate_limited` (mit `Retry-After`) | 429 |

### Auth

- Ein Secret pro Instanz. Es ist Bearer-Token für die API und Passwort für den UI-Login.
- Jeder Aufruf akzeptiert `Authorization: Bearer <secret>` oder das Session-Cookie.
- `POST /auth/login` mit `{ password }` setzt das Cookie, `POST /auth/logout` löscht es.
- Cookie: vom Secret abgeleitet und signiert (HMAC), ohne DB-Tabelle, 90 Tage gültig, `HttpOnly`, `Secure`, `SameSite=Strict`. Auf `localhost` und `127.0.0.1` ohne `Secure`. Dazu hono `csrf()` (prüft `Origin`). Ein neues Secret macht alle Sessions ungültig.
- Login-Bremse global, nicht pro IP: Fehlversuche per Passwort und per Bearer zählen im Speicher. Ab 10 pro Minute `429 rate_limited` mit `Retry-After`. Abgelaufene Zähler fallen beim nächsten Fehlversuch weg.

Quellen: [API-Vertrag](wayfinder/tickets/05-api-vertrag.md), [Time Entry als Datum und Dauer](wayfinder/tickets/12-time-entry-als-datum-und-dauer.md), [Betrieb und Distribution](wayfinder/tickets/07-betrieb-und-distribution.md).

## 5. Stack

- Projektgröße Small: Vite-React-SPA, hono in `api/`, Tailwind, `@base-ui/react`, SQLite.
- Runtime und Paketmanager: Bun (`bun install`, `bun.lock`). Die Bun-Version steht nur im `Dockerfile` (`FROM oven/bun:<exakte Version>-alpine`).
- SQLite über `bun:sqlite`, WAL, nur auf lokalem Volume.
- Drizzle ORM: `drizzle-kit generate` erzeugt die SQL-Migrationen, `migrate()` wendet sie beim Start an.
- `@hono/zod-openapi` mit Zod 4 erzeugt `/openapi.json`.
- i18n ohne Bibliothek: typisiertes Wörterbuch (`de.ts` als Quelle, `en.ts` mit `satisfies`) plus `Intl` für Datum, Zahl, Währung und Plural. Dasselbe Modul liefert die CSV-Spaltennamen und die UI-Texte zu den Fehlercodes. Sprache und Formate folgen `settings.language`.
- Abhängigkeiten nur unter permissiven Lizenzen (MIT, Apache-2.0, BSD, ISC). Vor jeder Library-Nutzung aktuelle Doku holen (`AGENTS.md`).

Quelle: [Bausteine des Stacks](wayfinder/tickets/01-bausteine-des-stacks.md), [Recherche](wayfinder/research/bausteine-des-stacks.md).

## 6. Betrieb und Distribution

### Image

- Ein Image für die ganze App, veröffentlicht als `ghcr.io/julianhandl/dreck` für `linux/amd64` und `linux/arm64`. Tags: `latest` folgt `main`, dazu `sha-<kurzer Commit>` für Rollback. Bun liefert API und gebaute SPA aus (hono `serveStatic`), kein nginx.
- Server per `bun build --target=bun --minify` gebündelt. Ins Image kommen nur Server-Datei, SPA-`dist/` und der Migrations-Ordner, keine `node_modules`.
- Fest: Port 3000, DB `/data/dreck.db`, Volume `/data`. Einzige Umgebungsvariable der App: `DRECK_SECRET`.
- Bun läuft als PID 1 unter dem User `bun` (uid 1000), kein tini. Bei `SIGTERM` beendet die App laufende Requests und schließt die DB. Der Container verträgt `read_only`, beschreibbar ist nur `/data`.
- Kein `HEALTHCHECK` im Image. Keine Hintergrundlast: kein `setInterval`, kein cron, kein Backup-Zeitplan.
- Logs auf stdout: nur Start (Version bzw. Commit, ausgeführte Migrationen) und Fehler. Kein Access-Log.
- Offen: Lizenzhinweise der Abhängigkeiten ins Image. Pflicht, seit das Image verteilt wird.

### Setup und HTTPS

- `compose.yaml` mit App (`image: ghcr.io/julianhandl/dreck:latest`) und offiziellem Caddy-Image. Caddy per `command: caddy reverse-proxy --from ${DOMAIN} --to app:3000`, ohne Caddyfile. `${DOMAIN:?…}` bricht mit Meldung ab, wenn `DOMAIN` fehlt. Volumes `dreck-data` (`/data`) und `caddy-data`. `restart: unless-stopped`. Die App veröffentlicht keine Ports.
- Aufsetzen: `compose.yaml` aus der README kopieren (kein `git clone`), `DOMAIN=…` in `.env`, `docker compose up -d`, DNS-Eintrag auf den Server, Ports 80 und 443 offen.
- Ausprobieren: `docker run -d --name dreck -p 127.0.0.1:3000:3000 -v dreck-data:/data ghcr.io/julianhandl/dreck`.
- Update: `docker compose pull && docker compose up -d`.
- Lokal ausprobieren: `docker build -t dreck .`, `docker run --rm -p 3000:3000 -v dreck-try:/data dreck`, `http://localhost:3000`.
- Der Server erzwingt kein HTTPS. Öffnet jemand die Login-Seite über HTTP auf einem anderen Host als `localhost` oder `127.0.0.1`, zeigt sie „Nur über HTTPS nutzbar“ statt des Logins.

### Secret

- Ist `DRECK_SECRET` gesetzt, gilt die Variable. Unter 32 Zeichen bricht der Start ab.
- Sonst erzeugt die App beim ersten Start ein Secret, speichert es in `/data/secret` und gibt es nur dabei einmal im Log aus. Anzeigen: `docker compose exec app cat /data/secret`. Wechseln: Datei löschen, neu starten.
- Kein Passwort, das in der UI gesetzt wird.

### Migration und Backup

- `migrate()` beim Start. Stehen Migrationen aus, schreibt die App vorher `VACUUM INTO '/data/backup-before-<letzte angewendete Migration>.db'` und behält die letzten 3 dieser Backups.
- Keine Down-Migrations. Rollback: Container stoppen, Backup zurückkopieren, älteren Stand bauen und starten.
- Findet die App im Journal eine unbekannte Migration (DB neuer als das Image), bricht sie mit klarer Meldung ab und verändert nichts.
- Backup: Button „Backup herunterladen“ in den Einstellungen bzw. `GET /api/v1/backup` per Bearer. Alternativ Container stoppen und das Volume kopieren (Dateikopie im laufenden Betrieb ist mit WAL nicht sicher).
- Restore nur offline: Container stoppen, `/data/dreck.db` ersetzen, starten. Kein Upload-Endpunkt.

### Für die Umsetzung

- RSS nach Report und CSV-Export am ersten echten Build messen, nur zur Information.

Quelle: [Betrieb und Distribution](wayfinder/tickets/07-betrieb-und-distribution.md).

## 7. UI

### Vorlage

- **Aufbau, Screens und Abläufe wie Harvest.** Referenz sind die Screenshots in `design/` (lokal, per `.gitignore` ausgeschlossen, nie committen):
  - Zeit: `new-time-entry.png`
  - Expenses: `expenses*.png`
  - Projects: `projects.png`, `project*.png`
  - Reports: `report*.png`
- Navigation: Zeit, Expenses, Projects, Reports, Einstellungen. Customers erscheinen auf dem Projects-Screen als Gruppen über ihren Projects und werden dort angelegt, bearbeitet und archiviert.
- Aus Harvest entfällt, was es in Dreck nicht gibt: Tasks, Budget, Forecast, Team, Manager, Approval, Invoices, Estimates, Manage, Import, Wochenansicht, Uhrzeiten, Trial-Hinweise. Billable ist eine Eigenschaft der Expense, nicht der Arbeit.
- Mobile: dieselben Screens, als Web-App auf dem Home-Bildschirm.
- Zeit-Screen: Tagesliste mit Summenleiste der Woche darüber, eine Zeile pro Time Entry in der Reihenfolge des Anlegens. ▶ auf Zeilen von heute.
- Ziel: so wenige Klicks und Wege wie möglich. Der Zeit-Screen ist auf Tracken optimiert, die häufigen Aktionen liegen nah beieinander.

### Abweichungen von Harvest

Nur hier weicht Dreck von der Vorlage ab.

- **Vorbelegung:** „Neuer Eintrag“ und „Timer starten“ mit dem Project des laufenden Timers, sonst dem zuletzt gestarteten der Woche, sonst dem einzigen wählbaren Project. Beschreibung mit Vorschlägen aus den Time Entries derselben Woche und desselben Projects. Expense mit Datum heute, Project der letzten Expense (falls noch wählbar), Billable wie zuletzt bei diesem Project. Project-Auswahl mit Tippen-zum-Filtern, zuerst „Heute verwendet“, Archived nicht wählbar.
- **Formular „Neuer Eintrag“:** Datum, Project, Beschreibung, Dauer. Heute ohne Dauer: „Timer starten“; mit Dauer: „Eintrag speichern“. An einem früheren Tag ist die Dauer Pflicht. Kein automatisches Zusammenführen mit bestehenden Time Entries.
- **Dauer:** nur `h:mm` (`2:30`, `0:45`; `2` = 2:00, `:45` = 0:45). Alles andere ist ein Fehler am Feld „Format h:mm, z. B. 2:30“. Im Formular > 0:00 und ≤ 24:00.
- **Betrag:** tolerant („12,50“, „12.5“, „1.234,50“).
- **Timer:** Vor dem Start steht „Stoppt X (0:47) und startet den neuen Timer.“, danach keine Meldung. Ein nach Sekunden gestoppter Timer bleibt als 0:00 stehen, der User löscht ihn selbst.
- **Vergessener Timer** (`runningSince` über 10 h zurück oder an einem früheren Tag): steht heute in der Liste mit Hinweis. Jeder Start oder Stopp fragt zuerst „Wann hast du aufgehört?“ (Uhrzeit am Starttag, in `at` umgerechnet, nicht gespeichert) oder „Nein, bis jetzt gearbeitet“. Rückfrage statt Rückgängig. Bei einem Start mit Uhrzeit schickt die UI zwei Aufrufe: `POST /timer/stop` mit dieser Zeit, dann `POST /timer/start`; „Erneut versuchen“ ignoriert dabei `409 no_running_timer` des Stopps.
- **Rückfrage zur Hourly Rate** am Project nur, wenn es Time Entries hat; am Customer, sobald er nicht archivierte Projects hat, auch ohne Time Entries, weil der User dort wählt, welche Projects die Rate bekommen:
  - optional Zeitraum (leer = alle);
  - live Anzahl, Stunden und Betrag alt → neu;
  - von Hand korrigierte Time Entries gesondert mit Button „Auch überschreiben“;
  - beim Customer die Liste seiner Projects mit Rate, vorausgewählt die mit der alten Rate des Customers.
- **Keine Verbindung:** Scheitert eine Schreibaktion mit Netzwerkfehler, ändert sich nichts. Das Formular bleibt mit Eingabe offen, „Keine Verbindung, nichts gespeichert.“ mit „Erneut versuchen“ bleibt stehen. Kein automatischer Retry. Beim Timer zusätzlich: „Der Timer läuft weiter, bis das Stoppen klappt.“ Start und Stopp schicken immer `at` mit.
- **Abgelaufene Session** (`401`): Login als Dialog über der Seite, die Eingabe bleibt erhalten, danach läuft derselbe Aufruf erneut.
- **Fehler** stehen am Feld. Jeder `code` der API hat einen UI-Text in beiden Sprachen.
- **Tastatur:** `N` = Neu, `Enter` = Speichern bzw. Timer starten (in jedem Feld des Dialogs), `Esc` = Schließen. Zeit-Screen: `↑`/`↓` markiert einen Time Entry, `Leertaste` startet/stoppt ihn, `E` bearbeitet ihn. Dialog: Fokus beim Öffnen auf Project (neu) bzw. Dauer (bearbeiten), Tab-Reihenfolge Project, Beschreibung, Dauer, Datum.
- **Report:** Filter Zeitraum, Customer, Project. Kennzahl „Zu verrechnen“ = Betrag Zeit + Billable Expenses. Button für CSV mit denselben Filtern.
- **Projects:** Löschen nur ohne Abhängigkeiten, sonst Hinweis „nur archivieren möglich“.
- **Einstellungen:** Default Hourly Rate, Rounding (Hinweis: wirkt rückwirkend), Währung (gesperrt mit Begründung, sobald Customer oder Expense existieren), Sprache, Zeitzone mit „Zeitzone dieses Geräts übernehmen“, wenn sie abweicht. Button „Backup herunterladen“. Logout.

### Login und Onboarding

- Login als Dialog über der Seite: „Füge das Passwort aus dem Log ein.“
- Nach dem Login zeigt jede Seite das Onboarding, solange es keinen Customer gibt (ohne Customer gibt es auch keine Expense):
  - Währung, Default Hourly Rate;
  - „Für wen arbeitest du?“ (Customer), „Woran?“ (Project);
  - eingeklappt Sprache und Zeitzone, aus dem Browser vorbelegt.
- „Loslegen“ speichert Settings, Customer und Project. Danach folgt der Zeit-Screen; „Neuer Eintrag“ belegt das einzige Project vor, wenn diese Woche noch nichts gestartet wurde.
- Kein Flag, kein Status-Endpunkt: Das Anlegen des Customers beendet das Onboarding.

### Home-Bildschirm

- Kein Service Worker. Statisches `manifest.webmanifest` mit `name`, Icons 192 und 512 px, `start_url`, `display: standalone`, dazu `apple-touch-icon`.

Quellen: [UI-Richtung](wayfinder/tickets/06-ui-richtung.md), [Time Entry als Datum und Dauer](wayfinder/tickets/12-time-entry-als-datum-und-dauer.md), [Betrieb und Distribution](wayfinder/tickets/07-betrieb-und-distribution.md), [Offline-Sync-Modell](wayfinder/tickets/03-offline-sync-modell.md).

## 8. Visuelles Design

- Struktur aus `design/*.png`, Stil aus `design/style/` (lokal, nicht im Repo). Kein Auftritt von Harvest: keine Farben, Schriften, Header oder Logo von Harvest und kein 1:1-Nachbau der Stil-Referenz.
- Richtung: schlicht und schnell, aber modern und farbig. Heller, warmer Grund; ein dunkles, sattes Grün als Hauptfarbe; ein kräftiges Lime als Akzent für den Timer; weich gerundete Flächen; Pillen für Umschalter und Chips; große Dauern mit Tabellenziffern. Hell und dunkel.
- Projektfarben werden aus der Project-ID abgeleitet (OKLCH).
- Die Tokens (Farben, Typografie, Abstände, Radien) entstehen zu Beginn der Umsetzung als Tailwind-Theme, abgeleitet aus `design/style/`, und werden am ersten Screen (Zeit) abgestimmt. Kein eigener Prototyp vorab.
- Name „Dreck“ als Wortmarke in der Oberfläche. Das Icon für Home-Bildschirm und Favicon entsteht mit den Tokens.

Quelle: [Visuelles Design](wayfinder/tickets/09-visuelles-design.md).

## 9. Tests und CI

### Ebenen

- **Unit** (`bun test`): nur reine Funktionen mit vielen Fällen: Rounding und Betrag, Parser für `h:mm`, „heute“ in einer Zeitzone.
- **API** (`bun test`): in-process über `app.request()`, ohne HTTP-Server und ohne Mocks. Vor jedem Test eine frische `:memory:`-DB mit `migrate()`. Echte Dateien in einem Temp-Verzeichnis nur dort, wo Dateien nötig sind: Start, Backup und Rotation, `/data/secret`, `GET /backup`, Migration der Fixture-DB.
- **Browser** (Playwright Test, Chromium, Desktop- und Handy-Viewport), ca. 5 Kernabläufe:
  - Timer starten und stoppen
  - Eintrag nachtragen
  - vergessener Timer (über `POST /timer/start` mit `at` vor 11 h)
  - „Keine Verbindung“ mit Retry
  - Login und Onboarding
  - Ziel ist der gebaute Server mit Temp-DB, gestartet über `webServer`. `workers: 1`. Ein Setup-Projekt macht Login und Onboarding und speichert `storageState`. Die Tests legen ihre Daten über die API an. Kein Reset-Endpunkt, keine Retries, Trace bei Fehlern.
- Keine Komponenten-Tests. Chrome DevTools MCP bleibt die Prüfung des Agents nach UI-Änderungen.
- Tests als `*.test.ts` neben dem Code, Playwright unter `e2e/`.

### Regeln

- Zeit in Tests über `setSystemTime()` (`bun:test`) bzw. `page.clock`.
- Keine Coverage-Schwelle. Jede Regel dieser Spec (Rechenregel, Fehlercode, Timer-Regel) hat mindestens einen Test, jeder Bugfix einen Regressionstest.
- Snapshot von `/openapi.json` per `toMatchSnapshot()`.
- Ab 1.0 pro Release eine Fixture-DB unter `api/test/fixtures/<version>.db`. Ein Test migriert eine Kopie und prüft Daten und Backup. Rotation und Abbruch bei neuerer DB haben eigene Tests.

### Werkzeuge und CI

- Biome für Lint und Format, dazu `tsc --noEmit`. Scripts im Root: `bun run check`, `bun run test`, `bun run test:e2e`. Keine Git-Hooks.
- GitHub Actions `.github/workflows/ci.yml` bei Push auf `main` und `pull_request`, `concurrency` bricht ältere Läufe ab. Die Bun-Version liest die CI aus dem `Dockerfile`. Drei parallele Jobs, danach `publish`:
  - `check`: `bun install --frozen-lockfile`, `biome ci`, `tsc --noEmit`, `bun test`.
  - `docker`: Image lokal unter dem Namen aus `compose.yaml` bauen, App-Service mit leerem Volume und gesetztem `DRECK_SECRET` starten, `/api/health` abfragen. Ohne Caddy, nichts wird veröffentlicht.
  - `e2e`: Playwright gegen den gebauten Server, Trace als Artefakt.
  - `publish`: nur bei Push auf `main`, wenn alle drei grün sind. Baut per Buildx für `linux/amd64` und `linux/arm64` (Build-Stage nativ, nur die Final-Stage per QEMU) und pusht `latest` und `sha-<kurzer Commit>` nach `ghcr.io` mit `GITHUB_TOKEN`.

Quelle: [Teststrategie und CI](wayfinder/tickets/10-teststrategie-und-ci.md).

## 10. Repo, Lizenz und Releases

- **Lizenz:** AGPL-3.0-only. `LICENSE` mit dem unveränderten Text von gnu.org, Copyright-Hinweis „Copyright (C) 2026 Julian Handl“ in der README.
  - `package.json`: `"license": "AGPL-3.0-only"`, `"version": "0.0.0"`.
- **Keine Code-Beiträge von außen**, keine CLA. Der Owner bleibt alleiniger Copyright-Inhaber und darf die Cloud proprietär betreiben.
- Schutz gegen Fremdhosting nur über die Marke „Dreck“ und das Icon, nicht über die Lizenz. README-Abschnitt „Trademark“: keine Markenrechte nach AGPL §7(e); erlaubt sind Eigenbetrieb unter dem Namen und „based on Dreck“; Forks und Dienste für Dritte müssen Namen und Icon ersetzen. Kein ®, solange die Marke nicht eingetragen ist.
- **Sprache im Repo:** Englisch für README, `CONTRIBUTING.md`, `SECURITY.md`, Issues, PRs und Commits. Deutsch für `docs/spec.md` und `GLOSSARY.md`.
- **Dateien:**
  - `CONTRIBUTING.md`: Issues willkommen, PRs werden ungelesen geschlossen, Sicherheitslücken über `SECURITY.md`.
  - `SECURITY.md`: Private vulnerability reporting von GitHub (aktivieren).
  - Ein Issue-Formular für Bugs (Version bzw. Commit, Browser, Log-Auszug). Keine PR-Vorlage, kein Code of Conduct, keine Discussions.
  - `.github/dependabot.yml`: npm, GitHub Actions, Docker, wöchentlich, gruppiert pro Ökosystem.
- **README (Englisch):**
  1. Einleitung: „**Dreck** (German for “dirt”, and a slightly misspelled “track”) is an extremely simple time and expense tracker for one person.“ Dazu ein Screenshot und der Hinweis „Under development until 1.0, use at your own risk, no guaranteed upgrade path.“
  2. Quickstart (`docker run`)
  3. Setup mit Docker Compose (`compose.yaml` inline)
  4. Update und Rollback
  5. Backup und Restore
  6. Secret
  7. API (Bearer, `/api/v1/openapi.json`)
  8. Lizenz (Copyright-Hinweis, AGPL-3.0, Pflicht zur Offenlegung bei geändertem Betrieb als Netzwerkdienst) und Security

  Kein Setup zum Entwickeln.
- **Versionen:** Bis 1.0 keine Tags und keine Releases, Nutzer laufen auf `latest` (= `main`). Ab 1.0 SemVer aus Sicht des Betreibers:
  - Major: Das Update verlangt mehr als `docker compose pull && docker compose up -d` oder ändert `/api/v1` inkompatibel (dann `/api/v2` daneben).
  - Minor: Features, auch mit automatischer Migration.
  - Patch: Fehlerbehebungen.

  Release Notes nur als GitHub Release, keine `CHANGELOG.md`.

### Checkliste für 1.0

- Marke „Dreck“ samt Icon eingetragen (Klassen 9 und 42), vor der ersten öffentlichen Ankündigung.
- Image-Tags nach SemVer beim Git-Tag, zusätzlich zu `latest`.
- Branch Protection auf `main`: PR-Pflicht, Required Status Checks `check`, `docker`, `e2e`, kein Review-Zwang, Admin-Bypass, Squash-Merge.
- Fixture-DB pro Release.

Quelle: [Hygiene des öffentlichen Repos](wayfinder/tickets/11-hygiene-des-open-source-projekts.md), [Recherche zur Lizenz](wayfinder/research/lizenz.md).

## 11. Bei der Zusammenführung geklärt

Lücken zwischen den Tickets, hier ohne eigenes Ticket entschieden:

- `from`/`to` bei `GET /time-entries` und `GET /expenses` optional, damit die Rückfrage zur Hourly Rate „leer = alle“ abfragen kann.
- Sortierung der Time Entries: `date` absteigend, innerhalb eines Tages `id` aufsteigend (Tagesliste nach Anlegen).
- `POST /customers` und `POST /projects` ohne Rate übernehmen die Rate aus der Kopierkette.
- „Zeitzone“ ist eine Instanz-Einstellung, die auch der Server nutzt (Datum des Timers). Die Aussage „reine Anzeige-Einstellung“ aus Ticket 00 gilt nicht mehr.
- Customers werden auf dem Projects-Screen verwaltet, eigener Screen entfällt.
