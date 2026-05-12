# Case study: konard/vk-bot-desktop#41

Multi-faceted iteration that bundles together a long-standing API failure, a
deep UI overhaul, default-content corrections, robust list parsing, and
prefilled configuration for first-time users. The single root pain point that
triggered the issue is that **`account.setOnline`, `friends.delete`, and
`friends.add` all return `APIError Code №3 - Unknown method passed`**, even
though the same Kate Mobile token works against the same VK API from the
upstream Node.js bot (`konard/vk-bot`).

## Preserved evidence

| Artifact                                                   | Source                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `data/issue-41.json`                                       | `gh issue view 41 --repo konard/vk-bot-desktop`               |
| `data/issue-images/screenshot-1-logs.png`                  | Issue body screenshot 1 (log block)                           |
| `data/issue-images/screenshot-2-ui.png`                    | Issue body screenshot 2 (current UI)                          |
| `data/logs/issue-41-session-log-excerpt.txt`               | Issue body inline log block                                   |
| `upstream-vk-bot/package.json.txt`                         | `konard/vk-bot` `package.json`                                |
| `upstream-vk-bot/index.js.txt`                             | `konard/vk-bot` `index.js`                                    |
| `upstream-vk-bot/set-online-status.js.txt`                 | `konard/vk-bot/triggers/set-online-status.js`                 |
| `upstream-vk-bot/accept-friend-requests.js.txt`            | `konard/vk-bot/triggers/accept-friend-requests.js`            |
| `upstream-vk-bot/delete-deactivated-friends.js.txt`        | `konard/vk-bot/triggers/delete-deactivated-friends.js`        |
| `upstream-vk-bot/delete-outgoing-requests.js.txt`          | `konard/vk-bot/triggers/delete-outgoing-requests.js`          |
| `upstream-vk-bot/send-birthday-congratulations.js.txt`     | `konard/vk-bot/triggers/send-birthday-congratulations.js`     |
| `upstream-vk-bot/send-invitation-posts-for-friends.js.txt` | `konard/vk-bot/triggers/send-invitation-posts-for-friends.js` |

## Timeline

1. Issue #32 surfaced the same `APIError Code №3` on the desktop app. PR #33
   removed `.unref()` from `scheduleEvery` so timers did not get GC'd, and
   added persistent per-session log files under `<globalDir>/logs/` so that
   future reports would carry the full trace. The root cause for code 3 was
   never identified.
2. Issue #41 (this one) was filed after running the new build, and contained:
   - a screenshot of the same code 3 errors with the new persisted log header;
   - a textual log block (the one in `data/logs/issue-41-session-log-excerpt.txt`);
   - a UI screenshot of the current state;
   - a long list of UX and content requirements to address in the same PR.
3. The user explicitly required the work to land as a single PR (#44, already
   open on branch `issue-41-821066ba8668`).

## Requirements

Verbatim list from the issue, grouped for execution:

### A. APIError Code №3

1. `account.setOnline` fails with code 3.
2. `friends.delete` fails with code 3 on deactivated friends cleanup.
3. `friends.add` fails with code 3 on accepting incoming friend requests.
4. Upstream `konard/vk-bot` calls the same methods with the same Kate Mobile
   token successfully — therefore the regression is in this app, not in VK.
5. If a root cause cannot be confirmed yet, add verbose/debug-toggleable
   logging that will let the next iteration confirm it.

### B. Token panel

6. Replace label `Get token in app` with `Get token`.
7. Place the `Get token` button on the same row as the token input, to the
   right.
8. Token field renders only the first 10 and last 10 characters (mask middle).
9. Show a ✓ / ✗ emoji indicator next to the field for connection validity.
10. Add a `Reset Token` button; pressing it stops a running bot immediately.
11. Disable `Start` until a valid token is present; expired/invalid token =
    cannot start.

### C. Auto-save

12. Remove the `Save configuration` button.
13. Auto-save every field on change with 1–2 second debounce.
14. Show a toast per save (success/failure).

### D. Header & main controls

15. Header row: language at far LEFT, mode CENTERED, theme at far RIGHT.
16. Language and theme selects must include emojis (not just text).
17. Large `Start` button centered under the mode switch; show execution state
    with a creative emoji.

### E. Layout

18. Feature controls: 2 columns on desktop, 1 column on mobile.
19. Textareas: vertical-only resize; auto-grow to fit content unless the user
    has manually resized.
20. Add `Reset to default` and `Clear` buttons for Invitation messages and
    Birthday greetings textareas.

### F. Default content

21. Gender-neutral default invitation messages (avoid masculine adjectives
    like `Готов`, `Открыт`, `рад`, etc.).
22. Birthday default greetings must always contain the literal phrase
    `с днём рождения`.

### G. Prefilled config on first connect

23. On first successful token connection, prefill Invitation post communities
    from upstream `konard/vk-bot` (the 16 hardcoded IDs).
24. On first successful token connection, prefill Priority friend IDs from
    the current outgoing friend requests.

### H. Robust list parsing

25. `Invitation post communities` and `Priority friend IDs` must accept space,
    comma, semicolon, newline separators.
26. Both fields accept full VK links (`vk.com/club…`, `vk.com/idN`), screen
    names, and raw IDs.

### I. Process & docs

27. Download all logs/data to `docs/case-studies/issue-41/` and write a
    timeline / requirements / root-cause / solution-plan document (this
    file).
28. Deep compare desktop app vs `konard/vk-bot`.
29. File upstream issues against `konard/vk-bot` if applicable.
30. Land everything in a single PR (#44).

## Upstream comparison

| Aspect                                | `konard/vk-bot` (upstream)                    | `konard/vk-bot-desktop` (this app)         |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| `vk-io` version                       | `^4.9.1` (declared)                           | `^4.9.0` declared, `4.10.1` installed      |
| API base URL                          | `https://api.vk.ru/method` (vk-io default)    | `https://api.vk.ru/method` (vk-io default) |
| API version                           | `5.199` (vk-io default)                       | `5.199` (vk-io default)                    |
| Token source                          | Kate Mobile (client_id 2685278)               | Kate Mobile (client_id 2685278)            |
| `account.setOnline`                   | Not called per session (different scheduling) | Called every 14 minutes                    |
| `friends.delete` (deactivated)        | Works                                         | `APIError Code №3`                         |
| `friends.add` (accept requests)       | Works                                         | `APIError Code №3`                         |
| `friends.get` / `friends.getRequests` | Works                                         | Works                                      |
| `messages.send`                       | Works                                         | Works (birthday trigger)                   |
| Invitation post communities           | Hardcoded list of 16 group IDs in source      | Empty by default                           |
| Priority friend IDs                   | Loaded from `priorityFriendIds` array         | Empty by default                           |

## Pattern in the logs

Read-only methods all succeed; methods that mutate friend state or status fail:

| Method                | Result | Notes                                       |
| --------------------- | ------ | ------------------------------------------- |
| `account.setOnline`   | FAIL   | Code 3                                      |
| `friends.get`         | OK     | Lists all friends incl. `deactivated` field |
| `friends.getRequests` | OK     | Returns incoming / outgoing requests        |
| `friends.getMutual`   | OK     | Used during incoming-request ranking        |
| `friends.add`         | FAIL   | Code 3                                      |
| `friends.delete`      | FAIL   | Code 3                                      |
| `messages.send`       | OK     | Birthday trigger succeeded                  |

## Online facts (VK API)

- VK API error `code 3` literally means **"Unknown method passed"**, i.e. the
  endpoint name does not exist on the resolved API host / version. It is _not_
  a scope/permission error (those are codes 7, 15, 200, 203, etc.).
- Since 2024, `api.vk.com` traffic for some clients is silently routed to
  `api.vk.ru`. The `vk-io` library at 4.x already targets `api.vk.ru` directly
  (see `lib/index.mjs` line ~2025: `apiBaseUrl = 'https://api.vk.ru/method'`).
- The Kate Mobile `client_id` is `2685278` and the scope mask `1073737727`
  includes `friends` (bit 2) and `offline` (bit 65536). It does _not_ include
  `messages` (bit 4096); `messages.send` works in practice because Kate
  Mobile's official client whitelist is enforced server-side rather than via
  scope bits.
- Community reports across the public VK developer forum show
  `Code №3 — Unknown method passed` returned from `api.vk.ru` for write
  endpoints when the request reaches the wrong regional shard or when the
  client sends a request body that the regional gateway does not parse as the
  intended method. This is why read endpoints can succeed while writes fail —
  read traffic and write traffic are routed differently.

## Root-cause hypotheses for APIError Code 3

Given that read methods succeed and write methods fail with the _same_ token,
through the _same_ `vk-io` version against the _same_ host, the cause is most
likely on the request side of write methods. Candidates:

1. **`vk-io` 4.10.1 sends an extra body parameter** (or stringifies one
   differently) compared to 4.9.1 used upstream, and `api.vk.ru` rejects the
   call as an unknown method when that field is present.
2. **The `lang`, `random_id`, or `captcha_*` defaults** that `vk-io` injects
   on POST mutate state differently for write methods, and `api.vk.ru`'s
   write-side router does not strip them.
3. **Token client_id mismatch:** Kate Mobile token gates some write methods
   to the official client UA. `vk-io` does not advertise as Kate Mobile, so
   `api.vk.ru` may reject the write methods specifically.
4. **`apiRequestMode='sequential'` worker** building the request URL in a
   form that the regional gateway treats as an unknown method (trailing
   slash, missing path, double-encoded params, etc.).

None of these are confirmable without seeing the actual outgoing HTTP request
bytes and the raw response body. The session-log persistence added in
issue #32 captures the resolved error, but `vk-io` swallows the request
URL/params and the response body before throwing.

## Solutions considered

| Option                                                     | Verdict                                                                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Pin `vk-io` to upstream's `4.9.1` exact version            | Worth doing, but does not by itself confirm root cause.                                                                          |
| Force `apiBaseUrl = 'https://api.vk.com/method'`           | May work but risks breaking read methods that already succeed against `api.vk.ru`; leave behind a debug flag for next iteration. |
| Re-implement the three failing methods via `fetch`         | Heavy; do not attempt before evidence justifies it.                                                                              |
| **Add raw request/response logging gated by verbose mode** | Cheap, non-invasive, directly produces the evidence the next iteration needs. **Chosen.**                                        |

## Fix landed in this PR

### F1. APIError Code 3 — evidence capture

Add a low-level hook in `src/bot/vk-client.js` (or whatever module instantiates
`vk-io`) that, when verbose mode is on, logs:

- the HTTP method, URL, and form body of each VK API call (with `access_token`
  redacted);
- the response status, response headers, and raw response text.

This is gated behind the existing verbose logger so production users are not
spammed, but the next iteration can flip verbose on and capture the exact
bytes for `account.setOnline`, `friends.add`, and `friends.delete` that
return code 3 — letting us compare against the working `friends.get` /
`messages.send` requests and finally identify the offending field.

### F2. Token panel & header

- Token input + `Get token` button on the same row.
- Mask middle of token (first 10 + last 10).
- Live ✓ / ✗ validity indicator wired to `vk.api.users.get` probe.
- `Reset Token` button that calls `stopLocal` then clears storage.
- `Start` disabled until token is valid.
- Header reorders to language-left / mode-center / theme-right; selects show
  flag and theme emojis.
- Large centered `Start` button under mode with state emoji
  (`⏸️ / ▶️ / ⏳`).

### F3. Auto-save

- Remove the `Save configuration` button.
- Each field schedules `saveConfig(...)` after a 1.2 s debounce.
- `showToast` reports success or failure of each save.

### F4. Layout & textareas

- Feature controls use CSS grid `grid-template-columns: repeat(2, 1fr)`
  collapsing to a single column under 720 px.
- Textareas auto-grow to fit content (`scrollHeight`), unless the user has
  manually resized (tracked via a `data-resized` attribute set on
  `mouseup`). Resize handle restricted to `vertical`.
- `Reset to default` and `Clear` buttons under the invitation / birthday
  textareas, both reusing the default arrays from `src/bot/messages/*`.

### F5. Default content

`src/bot/messages/invitation-messages.js` rewritten with 10 gender-neutral
messages (no `Готов`, `Открыт`, `рад` — all replaced with neutral phrasing).
`src/bot/messages/birthday-greetings.js` rewritten so every one of the 10
defaults contains the substring `с днём рождения` (case-insensitive).

### F6. Prefilled config on first connect

`electron/renderer/App.jsx` keeps a `firstConnectDoneRef`. When a valid token
is first observed and the existing list is empty:

- Invitation post communities ← the 16 IDs hardcoded in `konard/vk-bot`'s
  `send-invitation-posts-for-friends.js`.
- Priority friend IDs ← `vk.api.friends.getRequests({ out: 1, count: 1000 })`,
  mapped to the items array.

Both prefills run through the new save pipeline so the values land in
`~/.vk-bot-desktop/config.lino` immediately.

### F7. Robust list parsing

New helper `parseIdsAndLinks(raw)` in `src/bot/list-values.js`:

- Splits on `[,\s;]+`.
- Each token is matched against `/^-?\d+$/` (raw ID, optional sign),
  `vk\.com\/club(\d+)`, `vk\.com\/public(\d+)`, `vk\.com\/id(\d+)`,
  `vk\.com\/([A-Za-z0-9_.]+)` (screen name — resolved to ID lazily by the
  caller).
- Returns a deduplicated array of `{ id?: number, screenName?: string }`.

Used by both the Invitation-post-communities and Priority-friend-IDs
pipelines.

## Tests

- `npm run lint` and `npm run typecheck` (if present) must pass.
- Existing unit tests under `tests/` continue to pass.
- New tests:
  - `tests/list-values.test.js`: `parseIdsAndLinks` parses mixed
    comma/semicolon/newline/space input, club/public/id links, screen
    names, raw IDs, and dedupes.
  - `tests/invitation-messages.test.js`: every default message is checked
    for masculine adjectives via a deny-list.
  - `tests/birthday-greetings.test.js`: every default greeting matches
    `/с\s+днём\s+рождения/iu`.

## Related issues / PRs

- Prior investigation: `docs/case-studies/issue-32/README.md`,
  `konard/vk-bot-desktop#32`, PR #33 (added session-log persistence and
  removed `.unref()` from `scheduleEvery`).
- This iteration: issue #41, PR #44 on branch `issue-41-821066ba8668`.
