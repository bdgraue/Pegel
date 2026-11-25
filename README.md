# Pegel

Pegel shows the quota of your AI coding accounts in the KDE system tray. The fill level of the icon is the highest usage among the limits you selected. A click opens the account view. There you see the usage per limit and the time until the next reset. The mark in the bar shows how much of the time window has already passed.

## Getting started

Pegel needs [quota-axi](https://github.com/kunchenguid/quota-axi) and a Node version that suits it (at least 22.19 for quota-axi 0.1.69). If the program is missing, install it with `npm install -g quota-axi`. Pegel looks for it at the configured program path first, then in the search path of the desktop and finally in the search path of your login shell.

Open the AMD64 package that matches your Ubuntu version in the package installer. After that you find **Pegel** in the application menu. `pegel --hidden` starts it in the tray. Autostart can be turned on in the settings.

## Accounts and notifications

By default Pegel reads the output of `quota-axi --json --full` every five minutes. The percentages come from the reported limit windows. If a value is missing, Pegel shows a dash. After a read error the last successful reading stays visible together with its age. Old values do not count for the tray icon or the notifications.

Pegel recognises Claude profiles by their usual contents in `~/.claude` and `~/.claude-*`. You can add further folders in the settings and give accounts names of your own. If quota-axi reports an expired session for a secondary profile, the sign-in command it shows can be copied.

In the settings you set the read interval, the kinds of limits that count and the warning threshold. Per account, limit and cycle Pegel reports reaching the threshold, a limit that is used up and its release after the reset. The first successful read serves as the baseline.

You can put your own SVG logos in `~/.local/share/pegel/icons/<provider>.svg`, for example `claude.svg`. Without a logo the provider's initial is shown. The settings are stored in `~/.config/pegel/pegel.conf`.

## Running from source

The build needs CMake, Ninja, a C++20 compiler, Qt 6.5 or later with Qt Quick, Linguist and Quick Test, and KF6 Kirigami, StatusNotifierItem and DBusAddons. The Ubuntu package list is in the [CI workflow](.github/workflows/ci.yml).

```sh
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/pegel
```

## Tests and packaging

```sh
node --test tests/*.test.mjs
ctest --test-dir build --output-on-failure
(cd build && cpack -G DEB)
```

The UI tests use invented accounts, a temporary home directory and a D-Bus session of their own. The screenshots are then in `build/tests/ui/artifacts/`. `cmake --build build --target update_translations` updates the text catalogue for the German translation.

The presentation follows the herdr mod **quota** by Lakris2407 (MIT). The KDE integration follows [Hafen](https://github.com/bdgraue/Hafen). The quota data comes from quota-axi.
