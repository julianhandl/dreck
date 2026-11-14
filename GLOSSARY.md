# Dreck

Einfache, selbst gehostete Zeiterfassung für Einzelunternehmer: Arbeitszeit und Ausgaben auf Projects buchen, je Project und Customer auswerten und als Rechnung abrechnen.

## Language

**Customer**:
Die Person oder Organisation, für die gearbeitet wird. Interne Arbeit läuft über einen eigenen Customer wie „Intern".
_Avoid_: Kunde, Client, Account

**Project**:
Eine Arbeit, die zu genau einem Customer gehört.
_Avoid_: Projekt, Auftrag, Job

**Task**:
Eine Art von Arbeit innerhalb genau eines Projects, z. B. Design oder Entwicklung. Ein Task ist billable oder nicht und hat optional eine eigene Hourly Rate, die statt der des Projects gilt. Ein Task mit Time Entries wird beim Entfernen archiviert.
_Avoid_: Aufgabe, Tätigkeit, Leistung, Activity, Todo

**Default Task**:
Ein Task, den ein neues Project beim Anlegen übernimmt (Name und Billable, keine Rate). Spätere Änderungen betreffen nur neue Projects.
_Avoid_: Standard-Task, Vorlage, globaler Task

**Time Entry**:
Gearbeitete Zeit für ein Project an einem Kalendertag: Datum und Dauer, optional mit Task und Beschreibung, ohne Uhrzeiten. Solange er läuft, wächst seine Dauer; es läuft höchstens einer gleichzeitig. Er trägt die Hourly Rate, die beim Anlegen an seinem Task oder Project galt.
_Avoid_: Buchung, Timesheet, Log, Timer-Eintrag

**Timer**:
Der laufende Time Entry. Ein Timer setzt einen Time Entry von heute fort oder legt einen neuen an; ein neuer Timer stoppt den laufenden.
_Avoid_: Stoppuhr, laufende Buchung

**Ausgabe**:
Ein für genau ein Project ausgegebener Betrag mit Datum und Beschreibung. Eine Ausgabe ist entweder billable (wird an den Customer weiterverrechnet) oder eigene Kosten. Im Code, in der API und in der englischen UI: Expense.
_Avoid_: Expense (im deutschen Text), Kosten, Spesen, Auslage

**Billable**:
Eigenschaft einer Ausgabe oder eines Tasks, die an den Customer weiterverrechnet wird. Ein Time Entry ist billable, wenn sein Task es ist oder er keinen Task hat; das gilt live, nicht kopiert.
_Avoid_: verrechenbar, durchlaufend, Pass-through

**Rounding**:
Die pro Instanz einstellbare Taktung, auf die jeder Time Entry für Reports einzeln aufgerundet wird. Standard ist keine Rounding, also die exakte Dauer.
_Avoid_: Taktung, Abrundung, Intervall

**Hourly Rate**:
Der Geldwert einer Arbeitsstunde. Ein neues Project übernimmt ihn von seinem Customer, ein neuer Time Entry von seinem Task, falls der eine eigene hat, sonst von seinem Project. Ändert er sich an Customer oder Project, entscheidet der User, ob bestehende Time Entries ihn übernehmen; von Hand korrigierte bleiben dabei unberührt, außer er überschreibt sie ausdrücklich.
_Avoid_: Stundensatz, Tarif, Preis

**Default Hourly Rate**:
Die Hourly Rate, die ein neuer Customer beim Anlegen übernimmt. Spätere Änderungen betreffen nur neue Customers.
_Avoid_: Standardsatz, globaler Satz

**Report**:
Die Auswertung von Stunden, Beträgen und Ausgaben für einen Zeitraum, gegliedert nach Customer und Project.
_Avoid_: Auswertung, Statistik, Abrechnung

**Rechnung**:
Die Abrechnung an genau einen Customer mit Nummer, Positionen, Steuer und Rabatt. Sie ist Entwurf (Draft), Gesendet (Sent) oder Bezahlt (Paid); nur ein Entwurf lässt sich ändern. Im Code, in der API und in der englischen UI: Invoice.
_Avoid_: Invoice (im deutschen Text), Faktura, Beleg, Bill; „Rechnung“ im Sinn von Berechnung

**Position**:
Eine Zeile einer Rechnung: Beschreibung, Menge, Einzelpreis. Aus erfasster Zeit entstanden, hält sie ihre Time Entries und Ausgaben fest. Im Code und in der API: Invoice Item.
_Avoid_: Line Item, Rechnungsposten

**Abgerechnet**:
Zustand eines Time Entries oder einer Ausgabe, die zu einer Position gehört. Er ist gesperrt, bis die Position gelöscht wird. Im Code und in der API: invoiced.
_Avoid_: verrechnet, gebucht, Billed (verwechselbar mit Billable)

**Archived**:
Der Zustand eines Customers, Projects oder Tasks, der aus Auswahllisten verschwindet und in Reports erhalten bleibt.
_Avoid_: Inaktiv, gelöscht
