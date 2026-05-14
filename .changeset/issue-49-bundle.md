---
'vk-bot-desktop': minor
---

Issue #49 bundle:

- Invitation posts now attach the active VK avatar dynamically, cache sent
  post IDs per community in a `.lino` file, skip the run when the cached
  post is still in the community's top 10, and delete the previous
  invitation post after publishing the next one.
- All "Reset to default" and "Clear" buttons now persist the new state
  immediately and show a toast notification instead of silently no-opping
  when the form already matched the defaults.
- Triggers that hit VK error code 3 ("Unknown method passed") now halt
  for the cycle and report `account.getAppPermissions` instead of looping
  forever.
- Auto-accept friend requests respects existing outgoing requests and
  stops on code 3.
- Birthday congratulations are skipped when the user already had a
  conversation with the recipient in the last 24 hours.
- New "Clear log" button next to "Copy log".
- New "Verbose log" toggle in the log section that gates debug-level
  output through `setVerbose` in the bot runner.
- Renderer dictionary gains the new strings in both English and Russian
  with parity enforced by a test.
