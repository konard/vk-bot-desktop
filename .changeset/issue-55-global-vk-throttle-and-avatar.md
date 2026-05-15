---
'vk-bot-desktop': patch
---

Issue #55 — Global VK API throttle and lossless avatar attachment:

- `src/bot/vk-rate-limit.js` (new) implements a process-wide pacing barrier
  for every VK API request, picking a random delay per call: **3000–7000 ms**
  for reads (methods whose local name starts with `get` / `search` / `is` /
  `are` / `look`) and **6000–13 000 ms** for writes (everything else, so we
  err on the safer side for unknown methods). The barrier is a single
  Promise chain, so concurrent triggers can never bypass it.
- `src/bot/vk-client.js` now wraps every `APIRequest.prototype.make`
  invocation through that throttle (verbose mode on or off). Tests can inject
  `hook.throttle: (m, fn) => fn()` to bypass the real wait.
- `src/bot/triggers/send-invitation-posts.js` no longer downloads or uploads
  the avatar. A new `getActiveAvatarAttachment` helper reads the user's
  current `photo_id` (`users.get(fields: 'photo_id')`) and its `access_key`
  (`photos.getById`) and builds `photo<owner>_<id>[_<access_key>]`. Likes
  therefore accumulate on a single canonical photo across reposts, matching
  the upstream `konard/vk-bot` behaviour referenced by the issue but working
  for any user, not just the original author.
- Redundant per-trigger inline `await sleep(...)` calls are removed from
  `accept-friend-requests.js`, `delete-deactivated-friends.js`,
  `delete-outgoing-friend-requests.js`, `send-birthday-congratulations.js`,
  and `send-invitation-posts.js` (the global throttle is now the source of
  truth). The 60-second error backoffs on captcha / rate-limit / internal
  errors are kept.
- `tests/vk-rate-limit.test.js` covers classification, delay ranges,
  first-call-no-wait, read-after-write delay choice, concurrent
  serialisation, throw-safety, and `reset()`.
- `tests/send-invitation-posts.test.js` covers `getActiveAvatarAttachment`
  (access-key present, access-key missing, photo lookup throws, no avatar
  set, users.get throws, correct `user_ids: 0` + `photo_id` field).
- `docs/case-studies/issue-55/` collects the upstream `konard/vk-bot`
  snapshots, requirements list, root-cause analysis, library survey,
  and per-trigger interval verification (already matches upstream).
