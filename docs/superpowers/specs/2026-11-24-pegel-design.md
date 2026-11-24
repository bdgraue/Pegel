# Pegel: Entwurf

Stand: 2026-11-24. Status: freigegeben.

## Absicht

Pegel ist ein kleines KDE-Programm mit Tray-Icon. Ein Klick auf das Icon zeigt
die Kontingente aller KI-Coding-Konten des Benutzers: wie viel jedes
Limit-Fenster verbraucht hat, wann es zurückgesetzt wird und ob der Verbrauch
schneller läuft als die Zeit.

Der Anlass: Ein früheres Plasma-Widget zeigte die Zahlen dauerhaft im Panel und
sammelte die Daten selbst. Die Darstellung einer Statusleisten-Erweiterung für
herdr gefiel besser, sie ist aber an herdr gebunden. Pegel übernimmt deren
Darstellung in ein eigenständiges Programm nach dem Muster von
[Hafen](https://github.com/bdgraue/Hafen).

## Kenndaten

| | |
|---|---|
| Name | Pegel |
| Programm | `pegel` |
| App-ID | `io.github.bdgraue.Pegel` |
| QML-Modul | `Pegel` |
| Einstellungen | `~/.config/pegel/pegel.conf` |
| Erste Version | 0.1.0 |
| Vorlage | Hafen, Zweig `feature/ui-tests` (Stand 0.3.1 mit UI-Tests) |

## Ziele

1. Das Tray-Icon zeigt den Zustand ohne Zahlen. Ein Klick öffnet das Fenster,
   ein zweiter schließt es.
2. Das Fenster zeigt je Konto alle Limit-Fenster mit Balken, Prozentwert,
   Zeitmarke, Zeit bis zum Reset und Tempo.
3. Mehrere Konten desselben Anbieters, vor allem mehrere Claude-Abos, stehen als
   getrennte Einträge mit eigenem Namen da.
4. Fehlende, alte und unsichere Werte sind als solche erkennbar.
5. Es gibt ein `.deb` für Ubuntu 26.04 und 26.10, gebaut wie bei Hafen.

## Nicht-Ziele

- Pegel sammelt keine Daten selbst. Es ruft keine Anbieter-API auf und liest
  keine Zugangsdaten. Alle Zahlen kommen von `quota-axi`.
- Keine Zahlen im Panel und kein Plasma-Widget.
- Keine Anmeldung bei Anbietern. Pegel zeigt höchstens den Befehl, den
  `quota-axi` zur Behebung nennt, und führt ihn nicht aus.
- Kein Verlauf und keine Diagramme.
- Keine Empfehlung, welches Konto oder Modell als Nächstes zu nutzen ist.
- Keine Unterstützung für `claude-swap` (`QUOTA_AXI_CLAUDE_SWAP`) in 0.1.
- Pegel installiert `quota-axi` nicht.
- Keine Update-Prüfung gegen GitHub in 0.1.

## Was nicht passieren darf

- Ein Fenster ohne echten Prozentwert erscheint als „0 %“.
- Zwei Konten desselben Anbieters verschmelzen oder sind nicht zu unterscheiden.
- Ein alter Stand sieht aus wie ein frischer.
- Pegel löst eine Schlüsselbund-Abfrage aus oder verbraucht Kontingent. Die
  Schalter `--allow-keychain-prompt` und `--allow-claude-inference` werden nie
  übergeben.
- Echte Kontodaten landen im öffentlichen Repository (siehe unten).

## Rahmenbedingungen

### Öffentliches Repository

Das Repository ist öffentlich. Daraus folgt:

- Testdaten, Screenshots, Dokumente und Commit-Texte enthalten keine echten
  E-Mail-Adressen, Organisationsnamen, Konto-IDs oder Home-Pfade. Die
  Test-Szenarien sind erfundene `quota-axi`-Antworten mit `example.com`.
- Einstellungen mit Kontonamen und Pfaden liegen in `~/.config/pegel/` und sind
  per `.gitignore` ausgeschlossen, wie bei Hafen.
- Das Repository enthält keine Anbieter-Logos. Ein Anbieter erscheint als
  farbiges Kürzel. Wer Logos will, legt `<anbieter>.svg` nach
  `~/.local/share/pegel/icons/`; Pegel nimmt eine dort vorhandene Datei.
- Lizenz: GPL-3.0-or-later, wie Hafen.
- Die Darstellung lehnt sich an die herdr-Mod „quota“ an (MIT, Copyright
  Lakris2407). Pegel schreibt die Logik neu; das README nennt die Vorlage.

### Datenquelle

`quota-axi` (MIT, npm-Paket `quota-axi`, braucht Node ≥ 22.19) liefert mit
`quota-axi --json --full` ein JSON-Objekt mit `schemaVersion` 5 oder 6 und einer
Liste `providers`. Gemessen an Version 0.1.69:

- Ein Lesevorgang dauert rund 3 Sekunden und fragt jedes Mal die Anbieter.
- Jede Zeile hat `provider`, `label`, `plan`, `windows`, `state` und
  `accountKeys`. Mit mehreren Konten kommen `accountKey` und `accountLocator`
  dazu.
- `state.status` ist `fresh`, `stale`, `unavailable`, `auth_required`,
  `rate_limited` oder `error`. Dazu kommen bei Bedarf `error`, `reason`,
  `remedyCommand`, `retryAfter`, `refreshedAt` und `untrustedWindowIds`.
- Nicht eingerichtete Anbieter tragen `notSetUp: true`.
- Ein Fenster hat `id`, `label` und `kind` (`session`, `weekly`, `monthly`,
  `model`, `credits`, `unknown`). `percentUsed`, `resetsAt`, `startsAt`,
  `windowSeconds`, `shareOf`, `pace` und Geld- oder Credit-Beträge sind
  optional.
- `quotaSemantics.effectiveAvailability` nennt je Geltungsbereich (`scope`) den
  effektiven Rest und unter `runway`, ob das Kontingent bis zum Reset reicht.

### Technik

Qt ≥ 6.5 mit Kirigami, KF6 StatusNotifierItem und KF6 DBusAddons, CMake, C++20.
Das entspricht Hafen. Die Logik liegt in `src/model.mjs` und läuft in Qts
JavaScript-Engine und unter Node. Qts Engine kennt weder Objekt-Spread noch
`Array.prototype.flatMap`, darum laufen dieselben Testfälle in beiden.

## Wege

**A. Eigenständige App mit Tray-Icon (gewählt).** Bauweise wie Hafen. Die App
liest im Hintergrund, kann benachrichtigen, läuft auf jedem Desktop mit Tray und
übernimmt Build, Tray-Klasse, Paketierung und Testaufbau von Hafen. Das Fenster
platziert der Fenstermanager, es hängt nicht am Icon. Die App braucht einen
Autostart.

**B. Plasma-Widget nur mit Icon.** Das Popup säße direkt am Panel, und es gäbe
keinen eigenen Prozess. Dafür liefe es nur unter Plasma, ließe sich schwerer
testen und könnte von Hafen fast nichts übernehmen.

Gewählt wurde A: Gewünscht war eine App wie Hafen, und der einzige Vorteil von B
ist das verankerte Popup.

**Verworfen: eigener Sammler.** Das alte Widget hatte einen Python-Helfer mit
2.500 Zeilen für drei Anbieter. `quota-axi` deckt 19 Anbieter ab und kennt
mehrere Claude-Profile.

## Aufbau

```
Tray-Icon ── Klick ──▶ Fenster (Main.qml)
                          │  rendert
                          ▼
                    model.mjs: Zeilen ─▶ Einträge, Stufen, Texte, Meldungen
                          ▲
                          │  JSON
                    Quota (C++): startet quota-axi, findet Claude-Profile
```

- `src/quota.{h,cpp}`: startet `quota-axi` ohne zu blockieren und meldet
  Exit-Code, Ausgabe und Fehlerausgabe zurück, nach dem Muster von
  `Docker::run` in Hafen. Liefert außerdem die Rohdaten zur Profilsuche.
- `src/tray.{h,cpp}`: Hafens `Tray` ohne das Projektmenü, dafür mit
  gezeichnetem Icon.
- `src/launcher.{h,cpp}`: Autostart wie bei Hafen.
- `src/model.mjs`: alles Rechnen und Entscheiden, ohne Qt-Abhängigkeit.
- `src/Main.qml`: Fenster und Einstellungen.

## Verhalten

### Einträge

Ein Eintrag ist ein Konto bei einem Anbieter. Sein Schlüssel ist
`<provider>/<accountKey>`; fehlt `accountKey`, gilt `default`. Unter diesem
Schlüssel speichert Pegel Namen und Sichtbarkeit. Liefert `quota-axi` zwei
Zeilen mit demselben Schlüssel, ist das ein Lesefehler.

Reihenfolge wie von `quota-axi` geliefert. Angezeigt werden:

- Einträge mit Fenstern,
- eingerichtete Einträge mit einem Problem (Anmeldung nötig, Sitzung
  abgelaufen, Rate-Limit, Fehler), mit dem Grund im Klartext und, falls
  vorhanden, dem `remedyCommand` zum Kopieren. Bei `rate_limited` mit
  `retryAfter` steht dort „Rate-Limit bis 17:40“. Das Leseintervall ändert
  Pegel deswegen nicht.

Einträge mit `notSetUp` sind ausgeblendet. Die Einstellungen nennen ihre Anzahl
und können sie einblenden.

Kopfzeile eines Eintrags: Kürzel oder Logo, Name, rechts der Tarif. Der Name
ist das Anbieter-Label. Gibt es mehrere Einträge desselben Anbieters, hängt
Pegel ein Unterscheidungsmerkmal an: den selbst vergebenen Namen, sonst die
Endung des Profilordners (`~/.claude-work` wird „work“, `~/.claude` wird
„Standard“). E-Mail und Organisation stehen nur im Tooltip.

Darunter steht eine Zeile zum effektiven Rest, wenn `quota-axi` für den Bereich
`all_models` einen bekannten Wert liefert:

| `runway.status`        | Text                                             |
|------------------------|--------------------------------------------------|
| `through_reset`        | „noch 56 % · reicht bis zum Reset“               |
| `projected_exhaustion` | „noch 18 % · leer gegen 22:37“                   |
| `exhausted_now`        | „aufgebraucht · frei ab 17:40“                   |
| `unknown` oder fehlt   | keine Zeile                                      |

„Frei ab“ ist der Reset des Fensters `limitingWindowId`. „Leer gegen“ erscheint
nur bei `projectionConfidence: established`; bei `early` steht nur der Rest.

### Fenster eines Eintrags

```
 5 Stunden  ████████████████░░│░   82 %
            Reset in 18 Min · 12 % unter Tempo
```

- Beschriftung: „5 Stunden“ für `session`, „Woche“ für `weekly`, „Monat“ für
  `monthly`, sonst das `label` des Fensters. Haben zwei Fenster eines Eintrags
  dieselbe Art, gilt für beide das `label`.
- Balken und Prozentwert zeigen `percentUsed`. Farbe nach Stufe: ruhig unter
  60 %, dann ab 60 %, ab 80 % und ab 92 % je eine Warnstufe.
- Die Zeitmarke zeigt, wie viel des Zyklus verstrichen ist. Zykluslänge ist
  `windowSeconds`, sonst `resetsAt − startsAt`. Ohne Zykluslänge gibt es keine
  Marke und keine Tempo-Angabe.
- Tempo ist `percentUsed` minus verstrichener Anteil: unter 5 Punkten „im
  Tempo“, sonst „x % über Tempo“ oder „x % unter Tempo“. In den ersten 3 % des
  Zyklus entfällt die Angabe.
- Fenster der Art `model` zeigen zusätzlich „leer gegen …“, wenn ihr eigenes
  `pace.projectedExhaustedAt` vor dem Reset liegt und die Prognose
  `established` ist.

Sonderfälle:

| Fall | Darstellung |
|------|-------------|
| `percentUsed` fehlt | kein Balken, „—“; Beträge als Text, etwa „12,40 von 50,00 $“ |
| `shareOf` gesetzt | eingerückt als Anteil am Elternfenster, zählt nicht für Icon und Meldungen |
| `resetsAt` liegt vor `refreshedAt` (etwa 1970) | keine Reset-Zeit, keine Marke |
| `resetsAt` liegt zwischen `refreshedAt` und jetzt | Wert ausgegraut, „seit dem Reset kein neuer Stand“ |
| Fenster in `untrustedWindowIds` | ausgegraut mit Hinweis, zählt nicht |
| Status `stale` oder alter Stand | Eintrag ausgegraut, „Stand von vor 3 Std“ |
| `credits` des Eintrags | Zeile „Guthaben: …“ nur bei Rest über 0 oder `unlimited` |

Ein Stand ist alt, wenn `refreshedAt` des Eintrags mehr als zwei
Leseintervalle zurückliegt.

### Mehrere Claude-Konten

`quota-axi` meldet nur das Profil des aufrufenden Prozesses, solange
`QUOTA_AXI_CLAUDE_PROFILES` nicht gesetzt ist, und sucht selbst nicht nach
weiteren. Pegel übernimmt die Suche:

- Kandidaten sind `~/.claude` und alle Ordner `~/.claude-*`, die eine Datei
  `.credentials.json`, eine Datei `settings.json` oder einen Ordner `projects`
  enthalten. Das ist die Regel des alten Widgets. Ein abgemeldetes Profil
  bleibt so sichtbar, statt still zu verschwinden.
- In den Einstellungen lassen sich Ordner ergänzen und gefundene abwählen.
  Pfade werden aufgelöst, doppelte entfallen.
- Pegel übergibt immer die ganze Liste einschließlich `~/.claude`, damit jeder
  Eintrag einen stabilen `accountKey` hat, auch wenn es nur ein Profil gibt.
- Die Zuordnung von Eintrag zu Ordner läuft über `accountLocator.path`.

`quota-axi` wird mit bereinigter Umgebung gestartet: `CLAUDE_CONFIG_DIR`,
`CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` und alle
`QUOTA_AXI_*` werden entfernt, bevor Pegel `QUOTA_AXI_CLAUDE_PROFILES` setzt.
Das Ergebnis hängt so nicht davon ab, aus welchem Terminal Pegel gestartet
wurde.

Eine Folge davon: Nur das Standardprofil darf `quota-axi` über `claude doctor`
erneuern lassen. Läuft die Sitzung eines anderen Profils ab, meldet `quota-axi`
`credentials_expired` mit einem `remedyCommand` für genau dieses Profil. Pegel
zeigt den Eintrag dann als „Sitzung abgelaufen“ mit dem Befehl zum Kopieren.
Die Alternative, je Profil ein eigener Aufruf mit `CLAUDE_CONFIG_DIR`, ließe
jedes Profil erneuern, kostet aber einen Prozess je Profil und ließe ein
Hintergrundprogramm Sitzungen anfassen, die gerade niemand nutzt.

### Lesen

- Beim Start sofort, danach alle 5 Minuten (einstellbar, 1 bis 60), auch bei
  geschlossenem Fenster.
- Beim Öffnen des Fensters, wenn der letzte Versuch älter als 60 Sekunden ist.
- Auf Knopfdruck sofort.
- 30 Sekunden nach dem Reset eines Fensters, das die Warnschwelle erreicht
  hatte.
- Nie zwei Lesevorgänge gleichzeitig. Zeitlimit 60 Sekunden.

`quota-axi` sucht Pegel in dieser Reihenfolge: Pfad aus den Einstellungen, dann
`PATH`. Schlägt beides fehl, startet Pegel es über die Login-Shell des
Benutzers, wie die herdr-Mod, und liest ab der ersten geschweiften Klammer.

Scheitert ein Lesevorgang ganz (Programm fehlt, Exit-Code, kein JSON, Zeitlimit,
unbekannte `schemaVersion`), bleibt der letzte gute Stand stehen und wird
ausgegraut, sobald er alt ist. Darüber steht sofort der Fehler mit dem Alter
des Stands, bei fehlendem Programm mit dem Installationshinweis. Eine unbekannte `schemaVersion` ist ein Fehler und
wird nicht auf Verdacht dargestellt.

### Tray-Icon

Das Icon ist selbst ein kleiner Pegel: Die Füllhöhe zeigt den höchsten
gezählten Verbrauch, die Farbe dessen Stufe. Ohne Daten ist es leer. Bei einem
Lesefehler oder einem Eintrag mit Problem trägt es das Overlay
`dialog-warning`, wie bei Hafen. Der Tooltip nennt je Eintrag den höchsten
Wert.

Gezählt werden Fenster der Arten, die in den Einstellungen angehakt sind.
Vorgabe: 5 Stunden, Woche und Monat ja, Modell-Limits nein. Ausgeblendete
Einträge und alte Stände zählen nicht.

Das Kontextmenü bietet „Jetzt aktualisieren“ und „Einstellungen“ über den
Einträgen, die `KStatusNotifierItem` selbst mitbringt.

### Benachrichtigungen

Abschaltbar. Je gezähltem Fenster und Zyklus höchstens einmal je Ereignis:

- Die Warnschwelle ist erreicht (Vorgabe 90 %).
- Das Fenster ist aufgebraucht.
- Ein aufgebrauchtes Fenster ist nach dem Reset wieder frei.

Ein Zyklus ist bestimmt durch Eintrag, Fenster-`id` und `resetsAt`. Beim ersten
Lesen nach dem Start meldet Pegel nichts, es merkt sich nur den Stand.

### Fenster und Einstellungen

Das Fenster ist 340 breit wie bei Hafen und merkt sich seine Größe. Schließen
versteckt es. Ein zweiter Start holt das laufende Fenster nach vorn. `--hidden`
startet nur das Tray-Icon.

Kopfzeile: „Kontingente · vor 2 Min“, Aktualisieren, Einstellungen.

Einstellungen: Leseintervall, Benachrichtigungen und Schwelle, gezählte
Fensterarten, je Eintrag Name und Sichtbarkeit, Claude-Profilordner, nicht
eingerichtete Anbieter anzeigen, Pfad zu `quota-axi`, Autostart.

Quelltexte sind englisch mit `qsTr`, dazu `i18n/pegel_de.ts`. README und
Changelog sind deutsch, wie bei Hafen.

## Tests

- `tests/model.cases.mjs` läuft unter Node (`node --test`) und in Qt. Abgedeckt
  sind: Schlüssel und Namen bei mehreren Konten, jede Zeile der beiden
  Sonderfall-Tabellen, Stufen, Tempo, Zählung für das Icon, Meldungen je
  Zyklus, Profilsuche, Fehlerfälle beim Lesen.
- UI-Tests wie bei Hafen: das echte `Main.qml` gegen ein falsches `quota-axi`
  im Testordner, ohne Bildschirm und auf einem eigenen D-Bus.
- CI wie bei Hafen: Tests, Metadaten prüfen, bauen, `.deb` für beide
  Ubuntu-Versionen, Release beim Tag.

## Abnahme

1. Mit zwei Claude-Profilen stehen zwei Claude-Einträge mit verschiedenen Namen
   und Tarifen im Fenster, jeder mit eigenen Fenstern.
2. Ein Fenster ohne `percentUsed` zeigt „—“ und nie „0 %“.
3. Ist `quota-axi` nicht auffindbar, steht im Fenster, was fehlt und wie man es
   installiert. Das Icon trägt das Warn-Overlay.
4. Ein Stand, der älter ist als zwei Leseintervalle, ist ausgegraut, nennt
   sein Alter und zählt nicht für das Icon.
5. Aus einem Terminal mit gesetztem `CLAUDE_CONFIG_DIR` gestartet, zeigt Pegel
   dieselben Einträge wie aus dem Menü gestartet.
6. Testdaten und Dokumente nennen nur `example.com` und erfundene Namen. Kein
   Pfad im Repository beginnt mit einem echten Home-Verzeichnis.
7. `ctest` und `node --test tests/*.test.mjs` laufen durch; `cpack -G DEB`
   erzeugt ein installierbares Paket.

## Dem Bau überlassen

- Aussehen von App-Icon, Tray-Pegel und Kürzeln, die Farbe der dritten Stufe.
- Aufteilung von `Main.qml` in weitere Dateien.
- Genaue Texte und ihre Übersetzung.
- Ob ausgeblendete Anbieter per `--provider` gar nicht erst gelesen werden.
- Zeitformat für „gegen 22:37“ bei Zeitpunkten an einem anderen Tag.
