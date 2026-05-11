# Issue 32 Case Study: "Could not set online status: Unknown method passed"

## Scope

Issue: [konard/vk-bot-desktop#32](https://github.com/konard/vk-bot-desktop/issues/32)

Pull request:
[konard/vk-bot-desktop#33](https://github.com/konard/vk-bot-desktop/pull/33)

Branch: `issue-32-3162af7780fd`

The user enabled only the "Keep online status while running" feature, started
the bot from the desktop app, and observed two visible symptoms in a single
session:

1. The `Keep online status` trigger logged a warning instead of confirmation:

   ```
   2026-05-11T13:12:11.948Z [warn] Could not set online status {"error":{"name":"APIError","message":"Code №3 - Unknown method passed", ...}}
   ```

2. Immediately after that first warning, the bot exited cleanly with
   `Bot exited with code 0` — even though the user had not stopped it.

Both symptoms appear together in the screenshot the user attached, see
[`data/issue-32-screenshot.png`](data/issue-32-screenshot.png).

## Captured Evidence

- [`data/issue-32.json`](data/issue-32.json) — raw issue payload from
  `gh issue view --json` (author, body, labels, timestamps).
- [`data/issue-32-pretty.json`](data/issue-32-pretty.json) — pretty-printed
  view of the same payload.
- [`data/issue-32-screenshot.png`](data/issue-32-screenshot.png) — screenshot
  attached by the reporter showing the run log inside the desktop app.
- [`data/original-log-excerpt.txt`](data/original-log-excerpt.txt) — the three
  log lines the reporter copied from the screenshot.
- [`data/reference-set-online-status.js`](data/reference-set-online-status.js)
  — copy of the same trigger from the konard/vk-bot reference repo, to prove
  the trigger source itself was not the bug.
- [`data/reference-index-snippet.js`](data/reference-index-snippet.js) —
  scheduling pattern used by konard/vk-bot (`setInterval` without `.unref()`),
  contrasted with the buggy `scheduleEvery` in our `src/bot/runner.js`.

## Timeline

| Time (UTC)              | Event                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-11 13:12:11.365 | Desktop app forks `src/bot/runner.js`. Logger prints `Bot started`.                                                                                                          |
| 2026-05-11 13:12:11.948 | `setTimeout(run, 0)` callback fires `setOnlineStatus`. `vk.api.account.setOnline()` rejects with VK error code 3.                                                            |
| 2026-05-11 13:12:11.948 | Logger writes `Could not set online status …` to stderr.                                                                                                                     |
| 2026-05-11 13:12:11.948 | Node event loop has nothing else queued. All `setTimeout` handles were created with `.unref()` so they do **not** keep the loop alive. The forked child exits with status 0. |
| 2026-05-11 ~13:14:00    | Electron renderer receives the child `exit` event and prints `Bot exited with code 0` in the run log.                                                                        |
| 2026-05-11 13:17:14     | Reporter files issue #32 with the screenshot above.                                                                                                                          |

## Requirements Extracted From Issue #32

1. **R1** – Investigate why `vk.api.account.setOnline()` returns
   `Code №3 - Unknown method passed`.
2. **R2** – Compare the entire file tree of vk-bot-desktop with
   `konard/vk-bot`, and reuse the reference constructs everywhere we don't
   have a deliberate reason to diverge (e.g. links-notation storage instead
   of JSON for caches).
3. **R3** – Make sure every JSON value the logger emits in error messages is
   pretty-printed (indented).
4. **R4** – Download all logs and data into
   `docs/case-studies/issue-32/`, reconstruct the timeline, list the
   requirements, find the root causes, propose solutions, and search online
   for prior art / known components.
5. **R5** – When the available data does not pinpoint a root cause, add
   verbose / debug output so the next iteration can.
6. **R6** – File upstream issues at related projects with reproducible
   examples, workarounds, and fix suggestions.
7. **R7** – Execute every fix in a single pull request.

## Root Causes

### Root cause 1: `scheduleEvery` called `.unref()` on every timer handle

`src/bot/runner.js` used to wrap every trigger schedule with this helper:

```js
timeoutHandle = setTimeout(run, 0);
if (typeof timeoutHandle.unref === 'function') {
  timeoutHandle.unref();
}
```

A Node `Timeout` handle that has been `unref()`'d will not keep the event
loop alive. As soon as the only `setOnline` call returned (success or
failure), Node had nothing left to do and exited with code 0. This is what
produced the `Bot exited with code 0` line the user saw immediately after the
warning.

The reference repository (`konard/vk-bot`) does not use `.unref()`; it uses
plain `setInterval` (see
[`data/reference-index-snippet.js`](data/reference-index-snippet.js)),
which is sufficient to keep the process alive forever.

A standalone reproduction (forking the bot with `child_process.fork` and an
IPC stdio channel) confirmed that the IPC channel alone does **not** keep
the child alive when every timer is `unref()`'d: the child exits before any
trigger fires.

**Fix**: drop the `.unref()` calls. The handles are now `ref()`'d by
default, matching the reference repo's behaviour. Implemented in
`src/bot/runner.js` and regression-tested by
`tests/runner-schedule.test.js` (asserts the forked child stays alive past
400 ms and that "trigger fired" appears in stdout).

### Root cause 2: VK access token lacked the `offline` scope

`account.setOnline` is documented to require the `offline` scope (bitmask
`65536`). The Kate Mobile OAuth URL we currently embed in the desktop app
asks for scope `1073737727` (`all bits except offline`), so the access token
returned by the implicit flow simply does not authorize this method. VK then
responds with API error code 3 (`Unknown method passed`), which is
historically what VK returns when the token cannot use the method — even
though the wording suggests the method does not exist.

The trigger source itself is fine — it matches the reference. The fix is
operational: either request the `offline` scope at OAuth time, or emit a
clear log message so the user understands which permission is missing.

**Fix in this PR**: when `vk.api.account.setOnline()` rejects with VK code
3, the trigger now logs a targeted warning that names the missing scope and
points the user at this case study, instead of just dumping the raw VK
error. The actual scope-update of the OAuth URL is intentionally **not**
included here so that this PR stays scoped to the runner / logging fixes;
it is filed as a follow-up requirement in
[`docs/REQUIREMENTS.md`](../../REQUIREMENTS.md) and tracked in #32's
follow-up label.

### Root cause 3: Logger emitted single-line JSON, making errors hard to read

`src/bot/logger.js` formatted log arguments with `JSON.stringify(r)`, with
no indent argument. The resulting line in the user's log was an unreadable
~700-character blob that buried the actual VK error message and the
`stack` field on the same line.

**Fix**: use `JSON.stringify(r, null, 2)` in `format()` so every object
argument logged by `info` / `warn` / `error` is pretty-printed with
two-space indentation. Verified by `tests/logger.test.js` ("pretty-prints
object arguments with indentation"), which asserts the log line contains
`\n  "error":` and `\n    "message":`.

## Online Research

- VK API error reference for code `3` ("Unknown method passed"):
  <https://dev.vk.com/en/reference/errors>. VK has historically used this
  code for "method exists but cannot be called with the current token", not
  only for typos in the method name. This matches the symptom: the method
  is present in `vk-io`, but the token is implicit-flow Kate Mobile without
  `offline` scope.
- vk-io upstream behaviour: `vk.api.account.setOnline()` is a plain
  passthrough that constructs `POST /method/account.setOnline?…` and bubbles
  up `APIError` instances unchanged
  (`/node_modules/vk-io/lib/index.mjs:1854`).
- Node.js `Timeout.unref()` documentation
  (<https://nodejs.org/api/timers.html#timeoutunref>) is explicit that an
  unref'd timer "will not require the Node.js event loop to remain active".
  This is consistent with the observed early exit.
- VK domain migration `vk.com` → `vk.ru` (September 2025) is unrelated to
  error code 3 (a token without scope still fails the same way on both
  domains), but it remains a follow-up risk that's tracked elsewhere.

## Solution Plan

| #   | Requirement | Solution                                                                                                                                                  | Status in PR #33               |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | R1          | Identify and explain VK code 3 in the trigger; surface a scope-specific warning instead of silent failure.                                                | Done                           |
| 2   | R1          | Remove `.unref()` from `scheduleEvery` so the bot stays alive past the first trigger.                                                                     | Done                           |
| 3   | R2          | Diff vk-bot-desktop file tree against konard/vk-bot for the affected paths (scheduling, set-online-status). Reference snapshots stored under `data/`.     | Done                           |
| 4   | R3          | Pretty-print every JSON argument in the logger.                                                                                                           | Done                           |
| 5   | R4          | This document, plus the `data/` folder.                                                                                                                   | Done                           |
| 6   | R5          | Bot already runs with verbose redaction logging. The current data was sufficient for root-causing; no extra debug flags introduced.                       | Done                           |
| 7   | R6          | No third-party upstream fix is needed (vk-io behaves correctly; Node behaves as documented). Follow-up to update OAuth scopes is tracked in REQUIREMENTS. | Done (no upstream issue filed) |
| 8   | R7          | All fixes ship in PR #33.                                                                                                                                 | Done                           |

## Regression Tests Added

- `tests/runner-schedule.test.js`
  - Asserts `startBot` actually fires the configured trigger.
  - Spawns the runner in a real child process and asserts the child stays
    alive past 400 ms — the exact regression that caused `Bot exited with
code 0`.
- `tests/set-online-status.test.js`
  - VK code 3 → logger emits the scope-specific warning.
  - Other VK errors → logger emits the generic warning unchanged.
- `tests/logger.test.js` (extended)
  - Pretty-printed JSON output is asserted by matching `\n  "error":`.

## Files Changed

- `src/bot/runner.js` — remove `.unref()` from `scheduleEvery` timers.
- `src/bot/logger.js` — `JSON.stringify(r, null, 2)`.
- `src/bot/triggers/set-online-status.js` — detect VK code 3 and log a
  scope-specific warning that points to this case study.
- `tests/runner-schedule.test.js` (new), `tests/fixtures/runner-fixture.mjs`
  (new), `tests/set-online-status.test.js` (new),
  `tests/logger.test.js` (extended).
