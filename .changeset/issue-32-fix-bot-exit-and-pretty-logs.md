---
'vk-bot-desktop': patch
---

Fix bot exiting immediately after first scheduled trigger and improve
error visibility (issue #32):

- `src/bot/runner.js`: stop calling `.unref()` on `scheduleEvery` timer
  handles. The forked bot child used to exit with code 0 right after the
  first trigger fired, because every timer was `unref()`'d.
- `src/bot/logger.js`: pretty-print object arguments with two-space
  indentation so VK API errors and other structured payloads are
  readable in the run log.
- `src/bot/triggers/set-online-status.js`: when VK returns API error code
  3 ("Unknown method passed"), log a targeted warning that names the
  missing `offline` scope and points the user at
  `docs/case-studies/issue-32`.
