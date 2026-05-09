---
'vk-bot-desktop': minor
---

Initial release of vk-bot-desktop, a cross-platform Electron + React wrapper for `konard/vk-bot`.

- Single-window UI with mode switch (local / SSH+Docker server), Start/Stop control, light/dark/auto theme, en/ru i18n auto-detection.
- Six default behaviours from vk-bot: keep online, auto-accept friend requests with the top-10% mutual rule (mutuals-only above 10000 friends), delete deactivated friends, cancel outgoing requests, post invitation messages with the user avatar, and birthday greetings.
- Layered configuration in Links Notation (`lino-objects-codec`) with local-folder-overrides-global, plus cache and state in the same format.
- CLI options via `lino-arguments` (`--token`, `--mode`, `--config`).
- Server mode generates an idempotent install script that uses `link-foundation/start`'s `$` wrapper to run the bot under `--isolated docker` or `--isolated screen`.
- Verbose logging by default with token/password/cookie redaction across logs and IPC.
- GitHub Actions workflow that builds Electron artifacts for Linux, macOS and Windows on tag pushes and uploads them with a `SHA256SUMS.txt` for verification.

Stats, stable acceptance rate, and configurable defaults:

- Persistent stats in `stats/` (total + per-month + per-week ISO files), with the in-app banner showing accepted-friends counters once the bot has accepted at least one request.
- Records initial friends count on first run.
- Stable 10% acceptance rule: `floor(totalIncomingSeen * 0.10) - totalAcceptedEver` capped by remaining capacity (10 000 friends) and the per-run limit.
- Outgoing friend requests are only cancelled when capacity is required for incoming acceptance, never for users on the priority list.
- Mutual exclusion across local and server: starting one mode stops the other (`$ --status` / `$ --stop`). Default isolation is `screen` on both sides.
- Floating mid-viewport notifications confirm Start/Stop/Switch actions.
- Settings split into expandable sections that ship with sensible defaults: 10 random invitation messages, 10 random birthday greetings, and a one-click "fill from current outgoing requests" button for the priority list.
