---
'vk-bot-desktop': minor
---

Stats, stable acceptance rate, and configurable defaults.

- Persistent stats in `stats/` (total + per-month + per-week ISO files), with the in-app banner showing accepted-friends counters once the bot has accepted at least one request.
- Records initial friends count on first run.
- Stable 10% acceptance rule: `floor(totalIncomingSeen * 0.10) - totalAcceptedEver` capped by remaining capacity (10 000 friends) and the per-run limit.
- Outgoing friend requests are only cancelled when capacity is required for incoming acceptance, never for users on the priority list.
- Mutual exclusion across local and server: starting one mode stops the other (`$ --status` / `$ --stop`). Default isolation is `screen` on both sides.
- Floating mid-viewport notifications confirm Start/Stop/Switch actions.
- Settings split into expandable sections that ship with sensible defaults: 10 random invitation messages, 10 random birthday greetings, and a one-click "fill from current outgoing requests" button for the priority list.
