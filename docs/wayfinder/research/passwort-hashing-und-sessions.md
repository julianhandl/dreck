# Passwort-Hashing und Sessions pro User in Bun/Hono

Stand: 2026-11-19. Ticket: `.scratch/team/issues/02-password-sessions-research.md` (Map „Team-Setup"). Installiert: Bun 1.3.7, `hono` ^4.13.17, `@hono/zod-openapi` ^1.6.3, `drizzle-orm` ^0.45.4. Der Text liefert Fakten und eine Empfehlung. Die Entscheidung fällt in der Spec `.specs/team.md`.

## Kurzfassung

- **`Bun.password` reicht, ohne neue Dependency.** Default ist argon2id mit `m=65536,t=2,p=1` (64 MiB, 2 Iterationen). Das liegt über dem OWASP-Minimum `m=19456,t=2,p=1`. Die async-Variante läuft in einem Worker Thread, Output ist ein PHC-String, `verify` erkennt den Algorithmus aus dem Hash.
- **Zwei Fallen:** `Bun.password.hash('')` wirft, und `verify` wirft bei einem ungültigen Hash-String, statt `false` zu liefern. Beides wurde lokal geprüft.
- **Empfehlung für Sessions: Variante (b), eine serverseitige `sessions`-Tabelle.** Der Cookie trägt einen zufälligen Token (256 Bit), die DB speichert nur dessen SHA-256. Variante (a) braucht pro Request ohnehin einen DB-Lookup (User aktiv? Session-Version?), kann aber keine einzelne Session widerrufen. Logout bliebe dort rein clientseitig. (b) kostet denselben Lookup und deckt alle Fälle ab.
- **Persönliche API-Tokens:** `dreck_` + 32 Zufallsbytes base64url, gespeichert als SHA-256 (fast hash). Ein Password Hash ist hier falsch: Er ist pro Request zu langsam, und gesalzene Hashes lassen sich nicht per Index nachschlagen.
- **Hono:** Die Cookie-Helper (`setCookie`, `setSignedCookie`, `prefix: 'host'`) genügen. `hono/jwt` ist zustandslos und bringt keinen Widerruf. `@hono/session` wäre eine neue Dependency (`jose`) und erspart die eigene Storage nicht.
- **Throttle:** `login-throttle.ts` zählt heute global. Mit mehreren Usern kann ein Angreifer damit alle aussperren. OWASP und NIST verlangen einen Zähler pro Account. Empfehlung: pro Username zählen und einen höheren globalen Deckel als DoS-Bremse für argon2 behalten.

## 1. `Bun.password`

Quellen: [Bun Docs „Hashing"](https://bun.com/docs/runtime/hashing), Typdefinitionen [`packages/bun-types/bun.d.ts`](https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-types/bun.d.ts) (Namespace `Password`, `const password`), lokale Messung mit Bun 1.3.7.

| Punkt | Fakt | Quelle |
|---|---|---|
| Algorithmen | `"argon2id" \| "argon2d" \| "argon2i"` und `"bcrypt"` | bun.d.ts `Password.Argon2Algorithm`, `BCryptAlgorithm` |
| Default | „The default is argon2." `@default "argon2id"` | bun.d.ts `hash` |
| argon2-Parameter | `memoryCost` „Memory usage, in kibibytes. Minimum 8.", `timeCost` „Number of iterations". Ein Default steht nicht in den Typen. | bun.d.ts |
| Tatsächlicher Default | `$argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>` | lokal gemessen; dasselbe Beispiel steht in bun.d.ts bei `verify` |
| bcrypt | `cost` „A number between 4 and 31", `@default 10`. Über 72 Bytes: „hashed with SHA-512 before being passed to bcrypt" | bun.d.ts |
| API | `hash(password, algorithm?): Promise<string>`, `verify(password, hash, algorithm?): Promise<boolean>`, `hashSync`, `verifySync` (synchron) | bun.d.ts |
| async vs sync | „Password hashing functions are necessarily slow, so the asynchronous functions run in a worker thread." Sync: „Warning: password hashing is slow. Prefer Bun.password.hash" | bun.d.ts |
| Implementierung | „provided by the `rust-argon2` and `bcrypt` Rust crates" | bun.d.ts |
| Format | argon2 im PHC-Format, bcrypt im Modular Crypt Format. „The algorithm used to create the hash is stored in the hash itself." | Bun Docs |
| Salt | „generates a salt automatically and includes it in the hash" | Bun Docs |
| Leeres Passwort | `hash`: „If empty, this function throws an error". `verify`: „If empty, always returns false" | bun.d.ts; lokal: `password must not be empty` |
| Ungültiger Hash | `verify`: „@throws If the hash is invalid". Lokal wirft `verify('x', 'not-a-hash')` die Meldung `Password verification failed with error "UnsupportedAlgorithm"` | bun.d.ts, lokal |
| Laufzeit | `hash` ≈ 50 ms, `verify` ≈ 45 ms mit dem Default auf dem Entwicklungsrechner (Apple Silicon). Keine Garantie für schwächere Server. | lokal |

Einordnung gegen [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html):

- Minimum für Argon2id ist unter anderem „m=19456 (19 MiB), t=2, p=1". Bun liegt mit 64 MiB bei gleichem `t` darüber. **Die Defaults lassen sich übernehmen, ohne Parameter zu setzen.**
- bcrypt nur „for legacy systems", Work Factor „minimum of 10". Für Dreck ist bcrypt nicht nötig.
- Parameter-Upgrade: „wait until the user next authenticates", dann neu hashen. Bun hat kein `needsRehash`. Weil die Parameter im PHC-String stehen, genügt bei Bedarf ein Vergleich des Präfixes `$argon2id$v=19$m=65536,t=2,p=1$`. Das wird erst gebraucht, wenn sich der Default ändert, also heute nicht.
- Pepper: optional, „stored separately from the password database". Das Instance Secret könnte als Pepper dienen. Dann wären aber bei jeder Secret-Rotation alle Passwörter ungültig. **Empfehlung: kein Pepper.**

Passwortregeln ([OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)):

- NIST: Passwörter als einziger Faktor „SHALL … be a minimum of 15 characters in length", Maximum „SHOULD permit … at least 64 characters".
- OWASP: ohne MFA „shorter than 15 characters are considered to be weak", „Allow usage of all characters including unicode and whitespace", keine Composition Rules, „Do not silently truncate passwords".
- Passwortwechsel: „Current password verification" (OWASP).
- Folge für das Zod-Schema: `min(15)` als Vorschlag, `max` großzügig (z. B. 256), keine Zeichenregeln. Damit fängt das Schema auch den `hash('')`-Fall ab. Der genaue Wert gehört in die Decisions-Tabelle der Spec.

## 2. Sessions: (a) zustandsloser Cookie mit Version vs. (b) Sessions-Tabelle

Ist-Zustand, im Code geprüft (`packages/backend/src/features/auth/session-cookie.ts`, `auth.middleware.ts`, `auth.routes.ts`):

- `startSession` setzt per `setSignedCookie` den Cookie `dreck_session`. Er enthält nur `expiresAt` (Unix-Sekunden) und ist mit `HMAC-SHA256(secret, 'dreck-session')` signiert. `maxAge` beträgt 90 Tage, dazu `httpOnly`, `SameSite=Strict`, und `secure` gilt außer auf `localhost`/`127.0.0.1`.
- `hasValidSession` prüft Signatur und Ablauf. `endSession` löscht nur den Cookie. **Ein kopierter Cookie bleibt also nach dem Logout bis zu 90 Tage gültig.** Widerruf geht nur über einen Wechsel des Instance Secret (alle Sessions).
- `requireAuth` akzeptiert `Authorization: Bearer <Instance Secret>` (über SHA-256 + `timingSafeEqual`) oder den Session-Cookie.

### Was die Quellen fordern

[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html):

- Session IDs „must have at least 64 bits of entropy". Eigene IDs per CSPRNG „with a size of at least 128 bits".
- „The session ID content (or value) must be meaningless". Variante (a) verstößt dagegen, weil sie die User-ID trägt.
- „The session ID must be renewed or regenerated … after any privilege level change", ausdrücklich auch bei Login und „password changes".
- Logout: Die Anwendung „must invalidate the session at least on server side". **Das erfüllt weder der Ist-Zustand noch Variante (a)** (außer per Versions-Bump, der alle Geräte abmeldet).
- Speicherung: Der Server speichert „the full SHA-256 hash of the verifier". „A fast hash is sufficient for these random verifiers; password hashing algorithms are unnecessary." Begründung: Schutz bei „read-only disclosure of session records and backups". Relevant für Dreck, weil Backups die DB enthalten.
- Cookie: `SameSite=Strict` „preferred". `__Host-` Prefix empfohlen (Secure, kein Domain, `Path=/`).
- Timeouts: idle und absolute Timeout. Feste Werte nennt OWASP nur als Beispiele. NIST nennt für Reauthentifizierung bei AAL1 „no more than 30 days" (SHOULD).

### Vergleich

| Kriterium | (a) signierter Cookie `userId.sessionVersion.expiresAt` | (b) `sessions`-Tabelle, Cookie = Zufallstoken |
|---|---|---|
| DB-Zugriff pro Request | 1 Lookup (User: aktiv? Version? Role) | 1 Lookup (Session ⋈ User) |
| User deaktivieren | ja (`active` prüfen) | ja (Sessions löschen und `active` prüfen) |
| Passwortwechsel meldet andere Geräte ab | ja, aber auch das aktuelle Gerät, außer der Cookie wird mit neuer Version neu gesetzt | ja, `DELETE … WHERE user_id = ? AND id <> current` |
| Einzelne Session widerrufen / Logout serverseitig | **nein** | ja |
| Liste aktiver Sessions („Geräte") | nein | möglich (nur wenn gewünscht) |
| Cookie-Inhalt bedeutungslos (OWASP) | nein | ja |
| Neue Spalten / Tabellen | `users.session_version` | Tabelle `sessions` |
| Abhängigkeit vom Instance Secret | Signaturschlüssel bleibt | keine (Token wird gegen die DB geprüft) |
| Aufräumen | entfällt | abgelaufene Zeilen löschen, z. B. beim Login (ohne Timer, wie `login-throttle.ts`) |

Bewertung: Der eigentliche Vorteil von zustandslosen Sessions (kein DB-Zugriff) entfällt in (a), weil Deaktivierung und Passwortwechsel ohnehin den User aus der DB brauchen. Die Rolle muss auch für die Rechteprüfung pro Request aus der DB kommen. Dann ist (b) kaum teurer, erfüllt aber zusätzlich den serverseitigen Logout. **Empfehlung: (b).**

### Skizze für (b)

Das ist eine Skizze für die Spec, kein fertiges Design.

- Token: `crypto.getRandomValues(new Uint8Array(32))`, base64url-kodiert (256 Bit, über OWASPs 128 Bit). `randomBytes` aus `node:crypto` wird in `load-secret.ts` schon genutzt und geht genauso.
- Tabelle `sessions`: `id text primary key` (= SHA-256-Hex des Tokens), `user_id` FK auf `users` mit `on delete cascade`, `created_at`, `expires_at` (beides not null). Kein Klartext-Token in der DB („Do not persist the raw verifier alongside its hash", OWASP).
- Lookup per `id = sha256(token)` über den Primärschlüssel. OWASP beschreibt ein Split aus öffentlichem Identifier und Verifier mit constant-time compare. **Eigene Einschätzung, nicht durch eine Quelle belegt:** Das Nachschlagen direkt über den SHA-256 des ganzen Tokens leakt per Timing höchstens Bits des Hashes, nicht des Tokens. Das reicht hier und spart Spalte und Vergleich. Wer der Quelle wörtlich folgen will, nimmt den Split.
- Cookie: einfacher `setCookie` genügt, weil der Token selbst gegen die DB geprüft wird. `setSignedCookie` kann bleiben, bringt aber keinen Schutz zusätzlich. Optionen wie heute. `prefix: 'host'` nur setzen, wenn `secure` gilt, denn Hono wirft bei `__Host-` ohne `secure`, und auf `localhost` ist `secure` heute aus.
- Login erzeugt immer eine neue Zeile. Damit ist die Session-ID nach dem Login neu und Session Fixation ausgeschlossen. Logout löscht Zeile und Cookie. Passwortwechsel löscht alle anderen Sessions des Users. Deaktivieren löscht alle. Ein Role-Wechsel braucht nichts, weil die Role pro Request aus der DB kommt.
- Ablauf: heute 90 Tage absolut. NIST AAL1 empfiehlt höchstens 30 Tage. Das ist eine Produktentscheidung für die Decisions-Tabelle. Sliding Expiry würde pro Request einen Write kosten und ist nicht nötig.
- Ob der Bearer-Zugang mit dem Instance Secret bleibt (als Admin-Zugang oder Notfallzugang) oder entfällt, klärt Ticket 01 (Login, Setup, Migration).

## 3. Hono: was eingebaut ist

Quellen: [Hono Cookie Helper](https://hono.dev/docs/helpers/cookie), Quellcode [`src/utils/cookie.ts`](https://raw.githubusercontent.com/honojs/hono/main/src/utils/cookie.ts), [JWT Middleware](https://hono.dev/docs/middleware/builtin/jwt), [Third-party Middleware](https://hono.dev/docs/middleware/third-party), [`@hono/session` README](https://raw.githubusercontent.com/honojs/middleware/main/packages/session/README.md).

- `setSignedCookie` / `getSignedCookie`: „HMAC SHA-256 signatures" über WebCrypto. Die Prüfung läuft im Code über `crypto.subtle.verify`, nicht über einen String-Vergleich. Bei falscher Signatur liefert `getSignedCookie` `false`, bei fehlendem oder unsigniertem Cookie `undefined`. Format: `value.signature` (base64, 44 Zeichen), URL-kodiert.
- Optionen: `domain`, `expires`, `httpOnly`, `maxAge`, `path`, `secure`, `sameSite`, `priority`, `prefix` (`'secure' | 'host'`), `partitioned`. Hono wirft, wenn `maxAge` über 400 Tagen liegt, bei `__Secure-`/`__Host-` ohne `secure` und bei `__Host-` mit `path` ≠ `/` oder mit `domain`.
- `hono/jwt` (eingebaut): kann den Token aus einem Cookie lesen (`cookie`-Option), die Seite sagt nichts zu Widerruf. Er ist zustandslos wie (a) und hilft hier nicht.
- `@hono/session` (in honojs/middleware, auf hono.dev als Third-party gelistet): „Session middleware for Hono using encrypted JSON Web Tokens", „depends on jose". Eine Storage ist optional über `useSessionStorage({ get, set, delete })`. „By default, session cookies do not expire." **Nicht empfohlen:** Das wäre eine neue Dependency, und den Storage-Adapter für SQLite müsste Dreck trotzdem selbst schreiben.

## 4. Persönliche API-Tokens (Bearer)

- **Erzeugung:** 32 Bytes aus dem CSPRNG (256 Bit). NIST verlangt für Look-up Secrets eine Sicherheitsstärke von mindestens 112 Bit, OWASP für Session-IDs mindestens 128 Bit CSPRNG.
- **Format mit Präfix:** z. B. `dreck_<base64url>`. GitHub begründet Präfix und Unterstrich so: „An underscore is not a Base64 character", Doppelklick markiert den ganzen Token, Secret Scanning sinkt auf „0.5%" False Positives ([GitHub Engineering Blog](https://github.blog/engineering/platform-security/behind-githubs-new-authentication-token-formats/)). Die CRC32-Prüfsumme von GitHub dient nur dem Offline-Scanning. Für Dreck ist das spekulativ, also weglassen.
- **Speicherung:** SHA-256-Hex des ganzen Tokens, `unique` indiziert. NIST: Look-up Secrets „SHALL be stored in a hashed form using an approved hashing function". Nur Secrets unter 112 Bit brauchen ein Password-Hashing-Verfahren. OWASP sagt für zufällige Verifier: „A fast hash is sufficient". **Argon2 wäre falsch:** ≈ 50 ms und 64 MiB pro API-Request, und wegen des Salts gibt es keinen Lookup per Index, also müsste jede Zeile geprüft werden.
- **Tabelle `api_tokens`:** `id`, `user_id` FK mit `on delete cascade`, `name` (vom User vergeben), `token_hash` unique, `created_at`, `last_used_at` nullable, `expires_at` nullable. Widerruf = Zeile löschen. Der Klartext wird nur einmal bei der Erstellung angezeigt.
- **Middleware:** `Bearer <token>` → SHA-256 → Lookup → Join auf `users`, wobei `active` gelten muss. Das ist derselbe Weg wie bei der Session, also eine gemeinsame Hilfsfunktion für Token, Hash und Lookup. Ob Sessions und API-Tokens eine Tabelle mit `kind` teilen, entscheidet die Spec. Zwei Tabellen sind klarer, weil `name` und `last_used_at` nur bei API-Tokens Sinn ergeben.

## 5. Timing-safe Vergleiche und Login-Throttle

- **Lookup über den Hash** (Sessions, API-Tokens): Im App-Code findet kein Vergleich eines Geheimnisses statt, `timingSafeEqual` entfällt dort. `matchesSecret` (SHA-256 beider Seiten + `timingSafeEqual`) bleibt nur, solange der Instance Secret als Bearer zählt.
- **`Bun.password.verify`** vergleicht intern. Ob das constant-time geschieht, sagen weder Bun-Docs noch Typen. Ungeprüft, aber bei argon2 auch nicht entscheidend, weil der Angreifer den Hash nicht kennt.
- **User Enumeration per Antwortzeit** (OWASP Authentication): Unbekannter Username, falsches Passwort und deaktivierter User brauchen dieselbe Antwort („Login failed; Invalid user ID or password", gleicher Status) und annähernd gleiche Laufzeit. OWASP: „This code will go through the same process no matter what the user or the password is." Umsetzung: Fehlt der User, wird trotzdem `Bun.password.verify` gegen einen beim Start einmal erzeugten Dummy-Hash ausgeführt.
- **Throttle pro Account:** OWASP: „The counter of failed logins should be associated with the account itself, rather than the source IP address", und Lockouts dürfen nicht zum DoS werden. NIST: höchstens 100 aufeinanderfolgende Fehlversuche pro Account. Das heutige `createLoginThrottle()` ist ein einziger globaler Zähler (10 Fehler pro Minute sperren jeden Versuch). Mit Team sperrt ein Angreifer mit 10 Fehlversuchen pro Minute alle User aus. Vorschlag: denselben Mechanismus als `Map<username, number[]>` führen und auch unbekannte Usernames zählen (sonst Enumeration über das Throttle-Verhalten). Zusätzlich einen höheren globalen Deckel behalten, weil jeder Fehlversuch argon2 mit 64 MiB und rund 50 ms kostet. Er bleibt in-memory und pro Instanz, wie heute.
- **Bearer-Throttle:** Bei 256-Bit-Tokens ist Raten aussichtslos. Ein globaler Zähler für falsche Bearer-Tokens lässt ein falsch konfiguriertes Skript alle API-Clients des Teams sperren. Vorschlag: den Bearer-Fehlerzähler vom Login-Zähler trennen oder ganz streichen. Eine Entscheidung für die Spec.

## Nicht geprüft

- Constant-time-Verhalten von `Bun.password.verify` und `crypto.subtle.verify` in Bun.
- Laufzeit von argon2 mit Default-Parametern auf schwacher Hardware (z. B. Raspberry Pi). Sie wurde nur auf dem Entwicklungsrechner gemessen.
- NIST SP 800-63B Abschnitt 5 (Session Management) wurde nicht vollständig gelesen.
