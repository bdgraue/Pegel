# Pegel: Design

As of: 2026-11-24. Status: approved.

## Intent

Pegel is a small KDE program with a tray icon. A click on the icon shows the
quota of all AI coding accounts of the user: how much each limit window has
used, when it resets and whether usage is running faster than time.

The occasion: an earlier Plasma widget showed the numbers permanently in the
panel and collected the data itself. The presentation of a status bar extension
for herdr was liked better, but it is tied to herdr. Pegel takes over its
presentation into a standalone program following the pattern of
[Hafen](https://github.com/bdgraue/Hafen).

## Key data

| | |
|---|---|
| Name | Pegel |
| Program | `pegel` |
| App ID | `io.github.bdgraue.Pegel` |
| QML module | `Pegel` |
| Settings | `~/.config/pegel/pegel.conf` |
| First version | 0.1.0 |
| Template | Hafen, branch `feature/ui-tests` (state 0.3.1 with UI tests) |

## Goals

1. The tray icon shows the state without numbers. One click opens the window,
   a second one closes it.
2. The window shows, per account, all limit windows with bar, percentage,
   time marker, time until the reset and pace.
3. Several accounts of the same provider, above all several Claude
   subscriptions, appear as separate entries with their own name.
4. Missing, old and uncertain values are recognizable as such.
5. There is a `.deb` for Ubuntu 26.04 and 26.10, built as in Hafen.

## Non-goals

- Pegel does not collect data itself. It calls no provider API and reads no
  credentials. All numbers come from `quota-axi`.
- No numbers in the panel and no Plasma widget.
- No sign-in with providers. At most, Pegel shows the command that `quota-axi`
  names as the remedy, and does not run it.
- No history and no charts.
- No recommendation which account or model to use next.
- No support for `claude-swap` (`QUOTA_AXI_CLAUDE_SWAP`) in 0.1.
- Pegel does not install `quota-axi`.
- No update check against GitHub in 0.1.

## What must not happen

- A window without a real percentage appears as "0 %".
- Two accounts of the same provider merge or cannot be told apart.
- An old reading looks like a fresh one.
- Pegel triggers a keychain prompt or consumes quota. The flags
  `--allow-keychain-prompt` and `--allow-claude-inference` are never
  passed.
- Real account data ends up in the public repository (see below).

## Constraints

### Public repository

The repository is public. It follows that:

- Test data, screenshots, documents and commit messages contain no real
  email addresses, organization names, account IDs or home paths. The
  test scenarios are invented `quota-axi` responses with `example.com`.
- Settings with account names and paths live in `~/.config/pegel/` and are
  excluded via `.gitignore`, as in Hafen.
- The repository contains no provider logos. A provider appears as a
  colored abbreviation. Anyone who wants logos puts `<provider>.svg` into
  `~/.local/share/pegel/icons/`; Pegel uses a file that exists there.
- License: GPL-3.0-or-later, like Hafen.
- The presentation is modeled on the herdr mod "quota" (MIT, Copyright
  Lakris2407). Pegel rewrites the logic; the README names the original.

### Data source

`quota-axi` (MIT, npm package `quota-axi`, needs Node ≥ 22.19) returns, with
`quota-axi --json --full`, a JSON object with `schemaVersion` 5 or 6 and a
list `providers`. Measured with version 0.1.69:

- A read takes about 3 seconds and queries the providers every time.
- Each row has `provider`, `label`, `plan`, `windows`, `state` and
  `accountKeys`. With several accounts, `accountKey` and `accountLocator` are
  added.
- `state.status` is `fresh`, `stale`, `unavailable`, `auth_required`,
  `rate_limited` or `error`. Where needed, `error`, `reason`, `remedyCommand`,
  `retryAfter`, `refreshedAt` and `untrustedWindowIds` are added.
- Providers that are not set up carry `notSetUp: true`.
- A window has `id`, `label` and `kind` (`session`, `weekly`, `monthly`,
  `model`, `credits`, `unknown`). `percentUsed`, `resetsAt`, `startsAt`,
  `windowSeconds`, `shareOf`, `pace` and money or credit amounts are
  optional.
- `quotaSemantics.effectiveAvailability` names, for each scope (`scope`), the
  effective remainder and, under `runway`, whether the quota lasts until the
  reset.

### Technology

Qt ≥ 6.5 with Kirigami, KF6 StatusNotifierItem and KF6 DBusAddons, CMake, C++20.
This matches Hafen. The logic lives in `src/model.mjs` and runs in Qt's
JavaScript engine and under Node. Qt's engine knows neither object spread nor
`Array.prototype.flatMap`, which is why the same test cases run in both.

## Approaches

**A. Standalone app with tray icon (chosen).** Built like Hafen. The app
reads in the background, can notify, runs on any desktop with a tray and
takes over build, tray class, packaging and test setup from Hafen. The window
is placed by the window manager; it is not attached to the icon. The app needs
an autostart.

**B. Plasma widget with icon only.** The popup would sit directly at the panel,
and there would be no separate process. In return it would run only under
Plasma, would be harder to test and could take over almost nothing from Hafen.

A was chosen: an app like Hafen was wanted, and the only advantage of B is the
anchored popup.

**Rejected: own collector.** The old widget had a Python helper with
2,500 lines for three providers. `quota-axi` covers 19 providers and knows
several Claude profiles.

## Structure

```
Tray icon ── click ──▶ window (Main.qml)
                          │  renders
                          ▼
                    model.mjs: rows ─▶ entries, levels, texts, notifications
                          ▲
                          │  JSON
                    Quota (C++): starts quota-axi, finds Claude profiles
```

- `src/quota.{h,cpp}`: starts `quota-axi` without blocking and reports exit
  code, output and error output back, following the pattern of
  `Docker::run` in Hafen. Also provides the raw data for the profile search.
- `src/tray.{h,cpp}`: Hafen's `Tray` without the project menu, but with a
  drawn icon.
- `src/launcher.{h,cpp}`: autostart as in Hafen.
- `src/model.mjs`: all calculating and deciding, without a Qt dependency.
- `src/Main.qml`: window and settings.

## Behavior

### Entries

An entry is an account with a provider. Its key is
`<provider>/<accountKey>`; if `accountKey` is missing, `default` applies. Under
this key Pegel stores name and visibility. If `quota-axi` returns two rows
with the same key, that is a read error.

Order as returned by `quota-axi`. Shown are:

- entries with windows,
- set-up entries with a problem (sign-in required, session expired, rate
  limit, error), with the reason in plain text and, if
  present, the `remedyCommand` for copying. For `rate_limited` with
  `retryAfter` it says "Rate limit until 17:40" there. Pegel does not change
  the read interval because of this.

Entries with `notSetUp` are hidden. The settings state their number and can
show them.

Header of an entry: abbreviation or logo, name, the plan on the right. The name
is the provider label. If there are several entries of the same provider,
Pegel appends a distinguishing mark: the user-assigned name, otherwise the
suffix of the profile folder (`~/.claude-work` becomes "work", `~/.claude`
becomes "Default"). Email and organization appear only in the tooltip.

Below that is a line on the effective remainder if `quota-axi` returns a known
value for the scope `all_models`:

| `runway.status`        | Text                                             |
|------------------------|--------------------------------------------------|
| `through_reset`        | "56 % left · lasts until the reset"              |
| `projected_exhaustion` | "18 % left · empty around 22:37"                 |
| `exhausted_now`        | "used up · free from 17:40"                      |
| `unknown` or missing   | no line                                          |

"Free from" is the reset of the window `limitingWindowId`. "Empty around"
appears only with `projectionConfidence: established`; with `early` only the
remainder is shown.

### Windows of an entry

```
 5 hours    ████████████████░░│░   82 %
            resets in 18 min · 12 % under pace
```

- Label: "5 hours" for `session`, "Week" for `weekly`, "Month" for
  `monthly`, otherwise the `label` of the window. If two windows of an entry
  have the same kind, the `label` applies to both.
- Bar and percentage show `percentUsed`. Color by level: calm below
  60 %, then one warning level each from 60 %, from 80 % and from 92 %.
- The time marker shows how much of the cycle has elapsed. The cycle length is
  `windowSeconds`, otherwise `resetsAt − startsAt`. Without a cycle length
  there is no marker and no pace information.
- Pace is `percentUsed` minus the elapsed share: below 5 points "on
  pace", otherwise "x % over pace" or "x % under pace". In the first 3 % of
  the cycle the information is omitted.
- Windows of kind `model` additionally show "empty around …" if their own
  `pace.projectedExhaustedAt` lies before the reset and the projection is
  `established`.

Special cases:

| Case | Presentation |
|------|-------------|
| `percentUsed` missing | no bar, "—"; amounts as text, e.g. "12.40 of 50.00 $" |
| `shareOf` set | indented as a share of the parent window, does not count for icon and notifications |
| `resetsAt` is before `refreshedAt` (e.g. 1970) | no reset time, no marker |
| `resetsAt` is between `refreshedAt` and now | value grayed out, "no new reading since the reset" |
| window in `untrustedWindowIds` | grayed out with a note, does not count |
| status `stale` or old reading | entry grayed out, "Reading from 3 h ago" |
| `credits` of the entry | line "Credit: …" only with a remainder above 0 or `unlimited` |

A reading is old if the entry's `refreshedAt` lies more than two read
intervals in the past.

### Several Claude accounts

`quota-axi` reports only the profile of the calling process as long as
`QUOTA_AXI_CLAUDE_PROFILES` is not set, and does not search for others
itself. Pegel takes over the search:

- Candidates are `~/.claude` and all folders `~/.claude-*` that contain a file
  `.credentials.json`, a file `settings.json` or a folder `projects`. This
  is the rule of the old widget. A signed-out profile thus stays
  visible instead of silently disappearing.
- In the settings, folders can be added and found ones deselected.
  Paths are resolved, duplicates are dropped.
- Pegel always passes the whole list including `~/.claude`, so that every
  entry has a stable `accountKey`, even if there is only one profile.
- The mapping from entry to folder goes through `accountLocator.path`.

`quota-axi` is started with a cleaned environment: `CLAUDE_CONFIG_DIR`,
`CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` and all
`QUOTA_AXI_*` are removed before Pegel sets `QUOTA_AXI_CLAUDE_PROFILES`.
The result thus does not depend on which terminal Pegel was started
from.

One consequence: `quota-axi` may have only the default profile renewed through
`claude doctor`. If the session of another profile expires, `quota-axi` reports
`credentials_expired` with a `remedyCommand` for exactly that profile. Pegel
then shows the entry as "Session expired" with the command for copying.
The alternative, a separate call per profile with `CLAUDE_CONFIG_DIR`, would
let every profile be renewed, but costs one process per profile and would let a
background program touch sessions that nobody is using at the moment.

### Reads

- At startup immediately, then every 5 minutes (configurable, 1 to 60), also
  with the window closed.
- When the window is opened, if the last attempt is older than 60 seconds.
- Immediately at the press of a button.
- 30 seconds after the reset of a window that had reached the warning
  threshold.
- Never two reads at the same time. Timeout 60 seconds.

Pegel looks for `quota-axi` in this order: path from the settings, then
`PATH`. If both fail, Pegel starts it through the user's login shell, like
the herdr mod, and reads from the first curly brace on.

If a read fails completely (program missing, exit code, no JSON, timeout,
unknown `schemaVersion`), the last good reading stays and is grayed out
as soon as it is old. Above it the error appears immediately with the age
of the reading, and with the installation hint if the program is missing. An unknown `schemaVersion` is an error and
is not displayed on a guess.

### Tray icon

The icon is itself a small level gauge: the fill height shows the highest
counted usage, the color its level. Without data it is empty. On a read
error or an entry with a problem it carries the overlay
`dialog-warning`, as in Hafen. The tooltip names the highest value per
entry.

Counted are windows of the kinds that are checked in the settings.
Default: 5 hours, week and month yes, model limits no. Hidden
entries and old readings do not count.

The context menu offers "Refresh now" and "Settings" above the
entries that `KStatusNotifierItem` brings along itself.

### Notifications

Can be switched off. Per counted window and cycle at most once per event:

- The warning threshold is reached (default 90 %).
- The window is used up.
- A used-up window is free again after the reset.

A cycle is defined by entry, window `id` and `resetsAt`. On the first
read after startup Pegel reports nothing; it only remembers the reading.

### Window and settings

The window is 340 wide as in Hafen and remembers its size. Closing
hides it. A second start brings the running window to the front. `--hidden`
starts only the tray icon.

Header: "Quota · 2 min ago", refresh, settings.

Settings: read interval, notifications and threshold, counted
window kinds, name and visibility per entry, Claude profile folders, show
providers that are not set up, path to `quota-axi`, autostart.

Source texts are English with `qsTr`, plus `i18n/pegel_de.ts`. README,
changelog and all other documents are English, as in Hafen.

## Tests

- `tests/model.cases.mjs` runs under Node (`node --test`) and in Qt. Covered
  are: keys and names with several accounts, every row of the two
  special-case tables, levels, pace, counting for the icon, notifications per
  cycle, profile search, error cases when reading.
- UI tests as in Hafen: the real `Main.qml` against a fake `quota-axi`
  in the test folder, without a screen and on its own D-Bus.
- CI as in Hafen: tests, check metadata, build, `.deb` for both
  Ubuntu versions, release on tag.

## Acceptance

1. With two Claude profiles, the window shows two Claude entries with different
   names and plans, each with its own limit windows.
2. A window without `percentUsed` shows "—" and never "0 %".
3. If `quota-axi` cannot be found, the window says what is missing and how to
   install it. The icon carries the warning overlay.
4. A reading that is older than two read intervals is grayed out, states
   its age and does not count for the icon.
5. Started from a terminal with `CLAUDE_CONFIG_DIR` set, Pegel shows
   the same entries as when started from the menu.
6. Test data and documents name only `example.com` and invented names. No
   path in the repository starts with a real home directory.
7. `ctest` and `node --test tests/*.test.mjs` pass; `cpack -G DEB`
   produces an installable package.

## Left to the implementation

- Look of app icon, tray gauge and abbreviations, the color of the third level.
- Splitting `Main.qml` into further files.
- Exact texts and their translation.
- Whether hidden providers are not read at all via `--provider`.
- Time format for "around 22:37" for points in time on another day.
