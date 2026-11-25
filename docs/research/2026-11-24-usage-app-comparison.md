# Comparison with other usage apps

As of 24 November 2026. The READMEs of the projects themselves were read, not reports about them. "Not stated" means the README says nothing about it.

## Sources

- CodexBar (macOS, plus a linked Qt 6 app for Linux): <https://raw.githubusercontent.com/steipete/CodexBar/main/README.md>
- UsageBar (macOS): <https://raw.githubusercontent.com/methol/usage-bar/main/README.md>
- ClaudeBar (macOS): <https://raw.githubusercontent.com/tddworks/ClaudeBar/main/README.md>
- ai-gauge 1.7.0 (Linux/Waybar, macOS): <https://cdn.jsdelivr.net/npm/ai-gauge@1.7.0/README.md>
- quota-axi: `quota-axi --help` of the installed version 0.1.69 and <https://raw.githubusercontent.com/kunchenguid/quota-axi/main/README.md> (only the first 40,000 characters or so were read verbatim)

## What the others have

| Feature | CodexBar | UsageBar | ClaudeBar | ai-gauge | Pegel 0.1 |
|---|---|---|---|---|---|
| Limit windows with reset countdown | yes | yes | yes | yes | yes |
| Pace and forecast "lasts until the reset / empty around" | not stated as a core feature | not stated | yes | not stated | yes |
| Notification before the limit | yes, no threshold given | not stated | yes, levels without percentages | yes, at 80 %, cleared below 50 % | yes, threshold configurable from 50 to 99 % |
| Warning before a reset with unused quota | yes (Codex) | not stated | not stated | not stated | no |
| History as a chart | burndown from stored readings | 1 h to 30 days, kept for 30 days | not stated | not stated | no (non-goal) |
| Cost and tokens from local logs | yes | extra usage in USD | "today next to yesterday" | extra spend in the tooltip | no (non-goal) |
| Provider incidents (status page) | yes, badge in the menu and on the icon | not stated | not stated | not stated | no |
| Several accounts of one provider | not stated as a general feature | not stated | several Codex accounts | no, switches token sources | several Claude profiles |
| Numbers or countdown directly in the bar | configurable | dual bar | up to three providers with percentage and countdown | five display modes | no (non-goal) |
| "Copy usage summary" in the menu | not stated | not stated | not stated | yes | no |
| Interface for scripts | CLI with JSON | not stated | URL scheme, webhooks | WebSocket, `usage.json` | no |
| Own sources as extensions | not stated | not stated | manifest plus script | not stated | no |
| Update notice | not stated | Sparkle | not stated | yes | no (non-goal in 0.1) |

## What quota-axi 0.1.69 offers for this

- `QUOTA_AXI_CLAUDE_SWAP=1` reports one entry per `claude-swap` account (help text).
- `update --check` reports the installed against the latest version (help text).
- `--max-age` allows reusing a recent reading (help text).
- There is no variable for several Codex accounts in 0.1.69: searching the installed package for `QUOTA_AXI_CODEX_HOMES` found nothing.
- quota-axi does not deliver history, cost, tokens or incident reports; the help names neither a command nor a flag for them.
