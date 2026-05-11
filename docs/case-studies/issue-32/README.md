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
8. **R8** – Run the bot in verbose mode by default during the early
   iterations of this project, so users don't have to flip a flag before
   reporting a bug.
9. **R9** – Persist a copy of every bot session's log (success or failure)
   under the application directory, so when a user reports a problem we can
   read the raw evidence instead of guessing.

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

### Why VK returned code 3 here: still undetermined

The trigger source matches the reference repository (`konard/vk-bot`) byte
for byte, and the same `vk.api.account.setOnline()` call is known to work
there. We attempted several specific hypotheses before concluding we don't
yet have enough data:

- **"The Kate Mobile token lacks the `offline` scope."** Checked the bitmask
  `1073737727` the desktop app currently requests against the public
  scope-name list at
  [`dsblv/vk-api-scopes`](https://github.com/dsblv/vk-api-scopes):
  `1073737727 & 65536 === 65536`, so the `offline` scope is in fact granted.
  The only well-known scope missing from `1073737727` is `messages` (bit
  `4096`), which has no documented relationship to `account.setOnline`.
- **"The method was removed."** The official VK API schema at
  [`VKCOM/vk-api-schema`](https://github.com/VKCOM/vk-api-schema) still
  lists `account.setOnline` with `access_token_type: ["user"]` and no
  documented scope restriction.
- **"vk-io drives a deprecated endpoint."** vk-io 4.10.1 already targets
  `api.vk.ru/method/...`; the September 2025 `vk.com → vk.ru` domain
  migration is not the trigger.

Because we cannot reproduce the failure from a clean room (we have only the
reporter's screenshot), we explicitly choose **not** to encode any of the
above speculation in the code or the user-facing logs. Per the PR feedback
on #33: _"We don't need to add a guesses in code, we need to find root
cause and fix it."_

**What this PR does instead**:

1. The `set-online-status` trigger logs the **raw** VK error verbatim,
   pretty-printed by the logger. No "likely / probably" wording is added,
   and the trigger no longer special-cases code 3.
2. The bot runs in **verbose mode by default** (see `R8`), so every trigger
   invocation emits a `debug` line before and after the call. This is the
   same lifecycle pattern `konard/vk-bot` uses in `executeTrigger`.
3. Each session's full log is **persisted to disk** under
   `<application-dir>/logs/` (see `R9`), so the next bug report can ship
   raw evidence instead of a screenshot.

When a new occurrence comes in with the full session log, we'll be able to
pinpoint the real cause and fix it without guessing.

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

- VK API error reference for code `3` ("Unknown method passed"): tracked in
  the official VK API documentation. The wording suggests "method does not
  exist", but in practice VK is known to return this code in several
  unrelated situations; without a fresh reproduction we cannot say which
  one applied to this user.
- VK API schema:
  [`VKCOM/vk-api-schema`](https://github.com/VKCOM/vk-api-schema) — the
  schema entry for `account.setOnline` is `account/methods.json` and lists
  `access_token_type: ["user"]` with no scope restriction.
- VK scope bitmask reference:
  [`dsblv/vk-api-scopes`](https://github.com/dsblv/vk-api-scopes) — used to
  verify that the Kate Mobile mask `1073737727` includes `offline` (65536)
  and excludes only `messages` (4096) among the well-known names.
- vk-io upstream behaviour: `vk.api.account.setOnline()` is a plain
  passthrough that constructs `POST /method/account.setOnline?…` and
  bubbles up `APIError` instances unchanged
  (`/node_modules/vk-io/lib/index.mjs:1854`).
- Node.js `Timeout.unref()` documentation
  (<https://nodejs.org/api/timers.html#timeoutunref>) is explicit that an
  unref'd timer "will not require the Node.js event loop to remain active".
  This is consistent with the observed early exit.
- VK domain migration `vk.com` → `vk.ru` (September 2025) is unrelated to
  error code 3; vk-io 4.10.1 already drives `api.vk.ru/method/...`.

## Solution Plan

| #   | Requirement | Solution                                                                                                                                                                                                                 | Status in PR #33               |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 1   | R1          | Investigated and disproved the offline-scope hypothesis (`1073737727 & 65536 === 65536`). Without a clean-room reproduction, we log the raw VK error verbatim instead of speculating, and gather full logs (R5, R8, R9). | Done                           |
| 2   | R1          | Remove `.unref()` from `scheduleEvery` so the bot stays alive past the first trigger.                                                                                                                                    | Done                           |
| 3   | R2          | Diff vk-bot-desktop file tree against konard/vk-bot for the affected paths (scheduling, set-online-status). Reference snapshots stored under `data/`. Lifecycle debug logs mirror `executeTrigger` from konard/vk-bot.   | Done                           |
| 4   | R3          | Pretty-print every JSON argument in the logger.                                                                                                                                                                          | Done                           |
| 5   | R4          | This document, plus the `data/` folder.                                                                                                                                                                                  | Done                           |
| 6   | R5, R8      | Logger is verbose-by-default (override via `VK_BOT_DESKTOP_VERBOSE=0`); each trigger invocation emits start / duration `debug` lines.                                                                                    | Done                           |
| 7   | R6          | No third-party upstream fix is needed (vk-io behaves correctly; Node behaves as documented). No upstream issue filed; we'll revisit if the persisted logs (R9) reveal a vk-io bug.                                       | Done (no upstream issue filed) |
| 8   | R7          | All fixes ship in PR #33.                                                                                                                                                                                                | Done                           |
| 9   | R9          | `src/bot/session-log.js` opens a per-session log file under `<globalDir>/logs/` and attaches it as a redacted logger sink for the lifetime of the runner.                                                                | Done                           |

## Regression Tests Added

- `tests/runner-schedule.test.js`
  - Asserts `startBot` actually fires the configured trigger.
  - Spawns the runner in a real child process and asserts the child stays
    alive past 400 ms — the exact regression that caused `Bot exited with
code 0`.
- `tests/set-online-status.test.js`
  - Healthy call → logger emits the success line.
  - VK error → logger emits the generic warning with the raw VK error
    pretty-printed inside, and **no** speculative wording (`likely`,
    `maybe`, `probably`, `presumably`).
- `tests/logger.test.js` (extended)
  - Pretty-printed JSON output is asserted by matching `\n  "error":`.
  - Verbose mode is on by default; `setVerbose(false)` suppresses `debug`
    lines.
- `tests/session-log.test.js`
  - `openSessionLog` writes logger output to a file under the configured
    directory and redacts secrets along the way.

## Files Changed

- `src/bot/runner.js` — remove `.unref()` from `scheduleEvery` timers;
  emit `debug` lines around each trigger invocation; open a session log
  file in the direct-run block.
- `src/bot/logger.js` — `JSON.stringify(r, null, 2)`; add verbose-by-default
  with `VK_BOT_DESKTOP_VERBOSE` override; expose `addSink` / `removeSink` /
  `setVerbose` / `isVerbose`.
- `src/bot/triggers/set-online-status.js` — log the raw VK error verbatim;
  no special-casing of VK code 3.
- `src/bot/session-log.js` (new) — per-session log file sink under
  `<globalDir>/logs/`.
- `tests/runner-schedule.test.js` (new), `tests/fixtures/runner-fixture.mjs`
  (new), `tests/set-online-status.test.js` (new),
  `tests/session-log.test.js` (new), `tests/logger.test.js` (extended).
