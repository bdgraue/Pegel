# Pegel

Pegel zeigt die Kontingente deiner KI-Coding-Konten im KDE-Systemabschnitt. Die Füllhöhe des Symbols entspricht dem höchsten Verbrauch unter den ausgewählten Limits. Ein Klick öffnet die Kontenansicht. Dort siehst du den Verbrauch pro Limit und die Zeit bis zum nächsten Reset. Der Strich im Balken markiert den bereits verstrichenen Anteil des Zeitfensters.

## Starten

Pegel benötigt [quota-axi](https://github.com/kunchenguid/quota-axi) und eine dafür geeignete Node-Version (für quota-axi 0.1.69 mindestens 22.19). Falls das Programm fehlt, installiere es mit `npm install -g quota-axi`. Pegel sucht zuerst am eingestellten Programmpfad, dann im Suchpfad des Desktops und schließlich im Suchpfad deiner Login-Shell.

Öffne das zu deiner Ubuntu-Version passende AMD64-Paket im Paketinstaller. Anschließend findest du **Pegel** im Anwendungsmenü. Mit `pegel --hidden` startet es im Tray. Der Autostart lässt sich in den Einstellungen aktivieren.

## Konten und Meldungen

Pegel liest standardmäßig alle fünf Minuten die Ausgabe von `quota-axi --json --full`. Die Prozentwerte stammen aus den gemeldeten Limit-Fenstern. Fehlt ein Wert, zeigt Pegel einen Gedankenstrich. Nach einem Lesefehler bleibt der letzte erfolgreiche Stand mit seinem Alter sichtbar. Alte Werte zählen für das Tray-Symbol und die Benachrichtigungen nicht mit.

Claude-Profile erkennt Pegel an den üblichen Merkmalen in `~/.claude` und `~/.claude-*`. Weitere Ordner kannst du in den Einstellungen ergänzen und Konten eigene Namen geben. Meldet quota-axi eine abgelaufene Sitzung für ein Nebenprofil, lässt sich der angezeigte Anmeldebefehl kopieren.

In den Einstellungen legst du das Leseintervall, die gezählten Limit-Arten und die Warnschwelle fest. Pro Konto, Limit und Zyklus meldet Pegel das Erreichen der Schwelle, ein aufgebrauchtes Limit und die Freigabe nach dem Reset. Der erste erfolgreiche Abruf dient als Ausgangsstand.

Eigene SVG-Logos kannst du unter `~/.local/share/pegel/icons/<anbieter>.svg` ablegen, etwa als `claude.svg`. Ohne Logo erscheint das Kürzel des Anbieters. Die Einstellungen liegen in `~/.config/pegel/pegel.conf`.

## Aus dem Quellcode starten

Der Build benötigt CMake, Ninja, einen C++20-Compiler, Qt ab 6.5 mit Qt Quick, Linguist und Quick Test sowie KF6 Kirigami, StatusNotifierItem und DBusAddons. Die Ubuntu-Paketliste steht im [CI-Workflow](.github/workflows/ci.yml).

```sh
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/pegel
```

## Tests und Paketbau

```sh
node --test tests/*.test.mjs
ctest --test-dir build --output-on-failure
(cd build && cpack -G DEB)
```

Die Oberflächentests verwenden erfundene Konten, ein temporäres Benutzerverzeichnis und einen eigenen D-Bus. Die Bildschirmfotos liegen danach unter `build/tests/ui/artifacts/`. Mit `cmake --build build --target update_translations` aktualisierst du den Textkatalog für die deutsche Übersetzung.

Die Darstellung orientiert sich an der herdr-Mod **quota** von Lakris2407 (MIT). Die KDE-Integration folgt [Hafen](https://github.com/bdgraue/Hafen). Die Kontingentdaten liefert quota-axi.
