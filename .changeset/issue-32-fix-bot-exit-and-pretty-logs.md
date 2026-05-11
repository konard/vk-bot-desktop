---
'vk-bot-desktop': patch
---

Fix bot exiting immediately after first scheduled trigger and improve
error visibility (issue #32):

- `src/bot/runner.js`: stop calling `.unref()` on `scheduleEvery` timer
  handles. The forked bot child used to exit with code 0 right after the
  first trigger fired, because every timer was `unref()`'d. Each trigger
  invocation now emits `debug` lifecycle lines mirroring konard/vk-bot's
  `executeTrigger`. The direct-run entry point now opens a per-session
  log file.
- `src/bot/logger.js`: pretty-print object arguments with two-space
  indentation so VK API errors and other structured payloads are
  readable in the run log. Verbose mode is on by default and can be
  disabled with `VK_BOT_DESKTOP_VERBOSE=0`.
- `src/bot/triggers/set-online-status.js`: log the raw VK error
  verbatim. No speculative wording is added; we couldn't prove a root
  cause without a clean-room reproduction, so we'll gather verbose logs
  on the next occurrence instead.
- `src/bot/session-log.js` (new): persist each session's redacted log
  under `<globalDir>/logs/<timestamp>-<pid>.log` so bug reports can
  ship raw evidence.
