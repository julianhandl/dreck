# Dreck

Einfache, selbst gehostete Zeiterfassung für Einzelunternehmer: Arbeitszeit und Expenses auf Projects buchen und je Project und Customer auswerten.

## Language

**Customer**:
Die Person oder Organisation, für die gearbeitet wird. Interne Arbeit läuft über einen eigenen Customer wie „Intern".
_Avoid_: Kunde, Client, Account

**Project**:
Eine Arbeit, die zu genau einem Customer gehört.
_Avoid_: Projekt, Auftrag, Job

**Time Entry**:
Gearbeitete Zeit für ein Project an einem Kalendertag: Datum und Dauer, optional mit Beschreibung, ohne Uhrzeiten. Solange er läuft, wächst seine Dauer; es läuft höchstens einer gleichzeitig. Er trägt die Hourly Rate, die beim Anlegen an seinem Project galt.
_Avoid_: Buchung, Timesheet, Log, Timer-Eintrag

**Timer**:
Der laufende Time Entry. Ein Timer setzt einen Time Entry von heute fort oder legt einen neuen an; ein neuer Timer stoppt den laufenden.
_Avoid_: Stoppuhr, laufende Buchung

**Expense**:
Eine einzelne Ausgabe mit Datum, Betrag und Beschreibung, die zu genau einem Project gehört. Sie ist entweder billable (wird an den Customer weiterverrechnet) oder eigene Kosten.
_Avoid_: Ausgabe, Kosten, Spesen

**Billable**:
Eigenschaft einer Expense, die an den Customer weiterverrechnet wird.
_Avoid_: verrechenbar, durchlaufend, Pass-through

**Rounding**:
Die pro Instanz einstellbare Taktung, auf die jeder Time Entry für Reports einzeln aufgerundet wird. Standard ist keine Rounding, also die exakte Dauer.
_Avoid_: Taktung, Abrundung, Intervall

**Hourly Rate**:
Der Geldwert einer Arbeitsstunde. Ein neues Project übernimmt ihn von seinem Customer, ein neuer Time Entry von seinem Project. Ändert er sich an Customer oder Project, entscheidet der User, ob bestehende Time Entries ihn übernehmen; von Hand korrigierte bleiben dabei unberührt, außer er überschreibt sie ausdrücklich.
_Avoid_: Stundensatz, Tarif, Preis

**Default Hourly Rate**:
Die Hourly Rate, die ein neuer Customer beim Anlegen übernimmt. Spätere Änderungen betreffen nur neue Customers.
_Avoid_: Standardsatz, globaler Satz

**Report**:
Die Auswertung von Stunden, Beträgen und Expenses für einen Zeitraum, gegliedert nach Customer und Project.
_Avoid_: Auswertung, Statistik, Abrechnung

**Archived**:
Der Zustand eines Customers oder Projects, der aus Auswahllisten verschwindet und in Reports erhalten bleibt.
_Avoid_: Inaktiv, gelöscht
