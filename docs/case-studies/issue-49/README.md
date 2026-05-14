# Case study — Issue #49: Fixes and improvements

> Source: <https://github.com/konard/vk-bot-desktop/issues/49>
> PR: <https://github.com/konard/vk-bot-desktop/pull/50>
> Branch: `issue-49-ff8c0e53d7c6`
> Related prior case: [`docs/case-studies/issue-41`](../issue-41) — first attempt at
> the `Unknown method passed` (error code 3) family of failures. That case ended
> without a root cause and only added an evidence-capture hook to `vk-client`.
> Issue #49 picks the same threads back up and adds further requirements.

---

## 1. Inputs collected

| Artifact | Path |
|---|---|
| Raw GitHub issue JSON | [`data/issue-49.json`](data/issue-49.json) |
| Issue body (text only) | [`data/issue-49-summary.txt`](data/issue-49-summary.txt) |
| Invitation-post logs | [`data/logs/invitation-posts.md`](data/logs/invitation-posts.md) |
| Invitation-messages logs | [`data/logs/invitation-messages.md`](data/logs/invitation-messages.md) |
| Delete-deactivated logs | [`data/logs/delete-deactivated.md`](data/logs/delete-deactivated.md) |
| Auto-accept logs | [`data/logs/accept-friend-requests.md`](data/logs/accept-friend-requests.md) |
| Set-online logs | [`data/logs/set-online-status.md`](data/logs/set-online-status.md) |
| Birthday logs | [`data/logs/birthday.md`](data/logs/birthday.md) |
| Final notes & process | [`data/logs/final-notes.md`](data/logs/final-notes.md) |
| Upstream `konard/vk-bot` reference (snapshot) | [`upstream-vk-bot/`](upstream-vk-bot) |

---

## 2. Timeline reconstruction

The issue is a multi-section bug report combining live `vk-bot-desktop` UI logs
with screenshots and quoted upstream code. The sequence of in-app observations,
inferred from the log timestamps in `data/logs/*.md`, is:

1. **Invitation posts** — runs every few minutes, accumulates "post already
   present; skipping" entries. Posts that were sent never get rotated out, so
   over time the bot stops posting anything at all even when the actual post
   has dropped out of the community wall's top 10. The avatar referenced in the
   post is also static (a hardcoded `attachments` path on disk in the working
   config) rather than the user's current VK profile avatar.
2. **Invitation messages** — "Reset to default" button click produces no save
   call (no log line, no debounce trigger). User sees the form repopulate
   but the persisted config still contains whatever the user previously typed
   (or, more commonly, an empty array — see §4.B).
3. **Delete deactivated friends** — first iteration of the loop succeeds at
   listing friends with `deactivated` field, then `friends.delete` fails with
   `Unknown method passed` (code 3). Loop continues and re-fails on every
   subsequent candidate, generating 50+ warn lines per run.
4. **Auto-accept friend requests** — `friends.add` fails with code 3 on the
   very first request. Trigger keeps trying through the entire incoming list,
   producing hundreds of `Failed to accept friend request` warnings.
5. **Set online status** — `account.setOnline` fails with code 3 every 14
   minutes. Currently downgraded to a warn line, but never recovers.
6. **Birthday congratulations** — runs once per day; user reports that the same
   friend was re-greeted in a separate window after a manual exchange of
   messages. No dedup check exists.
7. **Final notes** — user asks for `account.getAppPermissions` diagnostics,
   verbose logging, case-study folder, and an upstream issue if applicable.

---

## 3. Requirements list

The issue is intentionally broad. The requirements below are extracted
verbatim where possible and grouped by area for tracking in PR #50.

### A. Invitation post improvements

- **A1** Attach user's *current active* avatar to the invitation post (upstream
  `konard/vk-bot` uploads a snapshot to `wallPhoto` and references it as
  `photo<owner>_<id>`).
- **A2** Save sent post IDs per community in a `.lino` cache file inside the
  application folder.
- **A3** Every cycle (default 9 min, matching upstream) check whether our
  recorded posts are still in the community's top 10.
- **A4** When posting a new one, **delete previous posts** so the cache stays
  at ≤1 entry per community.
- **A5** Update the `.lino` cache: append on send, drop on successful delete —
  the file must not grow unbounded.
- **A6** Use the same "smart, intelligent" timing that upstream uses (9-min
  interval, 10s post-`wall.get`, 5s post-`wall.post`, 60s back-off on captcha
  / posting-blocked errors).

### B. Reset/clear auto-save (Invitation messages)

- **B1** "Reset to default" inside *Invitation messages* must persist the reset
  value (currently silently discarded).
- **B2** All reset/clear buttons across the settings UI must trigger auto-save
  (with the existing 800 ms debounce).
- **B3** Each successfully-saved setting must show a notification toast in the
  UI so the user has visual confirmation.

### C. Delete deactivated / blocked friends

- **C1** Fail-fast on `Unknown method passed` (code 3) — don't iterate through
  100 candidates spamming warnings; stop the trigger for the run.
- **C2** Surface a clear UI/log diagnostic (see G1) explaining the gap.

### D. Auto-accept friend requests

- **D1** Fix `Unknown method passed` — same fail-fast semantics as C1.
- **D2** Honour upstream timing (10 s between `friends.add`, 60 s on rate-limit
  code 29, hard break on code 242 friend-limit). Already partly present.
- **D3** Filter out users for whom we already sent an outgoing request so we
  don't double-fire on every cycle.
- **D4** Provide a UI **Clear log** button alongside the existing *Copy log*
  button.

### E. Keep online status

- **E1** Currently downgraded to a `warn` and re-tried forever. Same fail-fast
  on code 3 — stop scheduling further attempts for the run.

### F. Birthday congratulations

- **F1** Before sending, call `messages.getHistory({ user_id, count: 1 })` and
  skip if the last message is within the last 24 h (regardless of direction).

### G. Final / process

- **G1** Use `account.getAppPermissions` *before* failing on code 3 and include
  the bitmask in the log so we can diagnose the actual scope gap.
- **G2** Compile all logs & data into this `docs/case-studies/issue-49/`
  folder (this document).
- **G3** Deep case study analysis (timeline, requirements, root causes,
  proposed solutions). ← this section.
- **G4** Search online for additional facts about VK API code 3 / Kate Mobile
  permissions / `account.setOnline` quirks.
- **G5** Re-use existing components and libraries; don't write things from
  scratch when an upstream pattern exists.
- **G6** Add debug output and verbose mode where it's missing.
- **G7** If the root cause turns out to live in `vk-io` or any other
  third-party, file an issue upstream with a reproducible example.
- **G8** Deliver everything in PR #50 (no follow-up PRs).

---

## 4. Root-cause analysis

### 4.A — Invitation posts never rotate

`src/bot/triggers/send-invitation-posts.js` checks `alreadyHasInvitationPost`
by scanning the **top 10 wall posts** for any text that contains one of the
configured invitation messages. Two latent failure modes:

1. Once a post drops out of the top 10 we have no record of it, so we can't
   delete it later — and we don't try to.
2. We never call `wall.delete`, so old posts pile up. Eventually the community
   may rate-limit us with code 219/210/15 (currently caught and skipped).

The avatar attachment is loaded from `config.invitationPost.avatarPath` (a
local file path) instead of being downloaded fresh from the active VK profile.
Upstream `konard/vk-bot` actually has the avatar code commented out, but the
intent in issue #49 is to take it further: pull the user's current
`photo_max_orig` from `users.get({ fields: 'photo_max_orig' })`, upload it via
`wall.savePhoto`, and reference the returned `photo<owner>_<id>`.

### 4.B — Reset/clear doesn't save

In `electron/renderer/App.jsx`:

- `listToLines(stored, defaults)` returns `defaults.join('\n')` when `stored`
  is empty/missing.
- On load, the form is populated with `listToLines(config.invitationPost.messages, DEFAULT_INVITATIONS)`.
- `savedConfigRef.current` is set to the serialised form value at the moment
  the config loads (which already equals the defaults).
- "Reset to default" sets the form value back to the defaults string — which
  is exactly what `savedConfigRef.current` already contains, so the auto-save
  effect's diff check (`serialized === savedConfigRef.current`) is **true**
  and the save is skipped.

Result: persisted config still has `invitationPost.messages = []`, the user
believes they reset, but next time the bot starts it again falls through to
the hard-coded defaults (which happen to match — until the user changes them
later and "reset" appears to do nothing).

**Fix direction:** flip the contract so the form serialises the *current
display value* unconditionally and bypasses the diff check on explicit
reset/clear actions. The reset handlers should call `flushSave()` directly.

### 4.C / D / E — VK API code 3 ("Unknown method passed")

Three different methods all return code 3 against the Kate Mobile token used
by this app:

- `friends.delete` (Delete-deactivated, Delete-outgoing, Auto-accept's clean-up)
- `friends.add` (Auto-accept)
- `account.setOnline` (Keep-online)

The case study from issue #41 already ruled out:

- ❌ Method names being spelled wrong — they match `vk-io`'s typed exports.
- ❌ Network/transport — verbose hook shows the exact URL hitting `api.vk.com`
  successfully and getting a JSON error envelope.
- ❌ Token expiry — read methods (`friends.get`, `friends.getRequests`,
  `messages.send`) all succeed in the same run.

What remained un-tested in issue #41 and what we'll add for #49:

- ✅ Call `account.getAppPermissions` once at startup (and once when we first
  hit code 3) and log the bitmask. Kate Mobile's `client_id = 2685278` is
  *supposed* to come with `scope = 1073737727` (all bits set), but if a
  per-user scope drift causes a missing bit we'll see it here.
- ✅ Treat code 3 as a **terminal** error for the trigger run, not a
  per-item warn. Stop the loop and emit a single, very visible diagnostic.
- ✅ Optionally surface the diagnostic in the UI as a banner so the user can
  tell at a glance "this method is unavailable on your token".

The most plausible upstream fact (to confirm in §G4) is that VK has been
quietly removing several write methods from Kate Mobile in 2024–2026 as part
of their long-running closure of "unofficial app" surfaces. Read methods stay
because they're heavily relied on by third-party clients; writes are the ones
they're pruning. If true, the only "real" fix is to either:

- (a) switch to a different OAuth app whose scope still includes those writes;
- (b) document the limitation in the UI and silently skip the trigger.

`vk-bot-desktop` should pick (b) by default and offer (a) as an opt-in.

### 4.F — Birthday duplicates

`src/bot/triggers/send-birthday-congratulations.js` iterates over friends
whose `bdate` matches today's day/month and calls `messages.send` for each.
There's no check for recent conversation, so anyone you've already talked to
today (or who already congratulated you and you responded) will still get
the canned message a few hours later when the trigger fires.

`messages.getHistory({ user_id, count: 1 })` returns the newest item with a
`date` field (unix seconds). Compare to `Date.now() / 1000 - 86400` and skip.

### 4.G — Process / observability

`src/bot/logger.js` already supports `VK_BOT_DESKTOP_VERBOSE`, but there's no
UI toggle, so most users can't enable it. The verbose hook in `vk-client.js`
captures full request/response context — we just need to surface it.

---

## 5. Solution plan

| Req. | Plan | Files touched |
|---|---|---|
| A1 | Fetch active avatar URL via `users.get({ user_ids: 0, fields: 'photo_max_orig' })`, download to a temp file, upload via `upload.wallPhoto`, attach the returned `photo<owner>_<id>`. Cache per-session so we don't re-upload every cycle. | `src/bot/triggers/send-invitation-posts.js`, new `src/bot/triggers/active-avatar.js` |
| A2/A5 | Persist `{ byCommunity: { [id]: [postIds] } }` to `LinoStore.writeCache('invitation-posts', …)` after each successful `wall.post` and after each successful `wall.delete`. | `send-invitation-posts.js`, `src/lino-store.js` (no new API needed) |
| A3 | Per cycle, `wall.get({ owner_id, count: 10 })`. If any cached post is still in the top 10, skip post + skip delete. Else delete *and* post fresh. | `send-invitation-posts.js` |
| A4 | After successful `wall.post`, iterate the cached IDs for that community and `wall.delete` each one (5 s sleep between). | `send-invitation-posts.js` |
| A6 | Interval already matches (9 min). Keep 10 s after wall.get, 5 s after wall.post / wall.delete, 60 s on captcha/post-blocked. | `send-invitation-posts.js` |
| B1/B2 | Reset/clear handlers in `App.jsx` call a new `forceSave(formValue)` helper that bypasses the diff guard and writes directly. Auto-save effect still uses the debounce for typing. | `electron/renderer/App.jsx` |
| B3 | Existing `notif*` helpers — extend with `notifSettingSaved` and call from `forceSave`. Optional: pass the field name into the toast. | `App.jsx`, `electron/renderer/i18n.js` |
| C1/D1/E1 | New helper `isUnknownMethodError(error)` (code 3). Each trigger checks and returns early after logging a single `error('Unknown method passed; stopping trigger', { …, permissions })` line. The runner already isolates triggers per cycle so other triggers keep running. | `src/bot/api-errors.js` (new), `delete-deactivated-friends.js`, `accept-friend-requests.js`, `set-online-status.js`, `delete-outgoing-friend-requests.js`, `send-invitation-posts.js` |
| D2 | Already mostly present (`sleep(10000)` between adds). Add explicit `code === 29` → 60s sleep + break; `code === 242` → break. | `accept-friend-requests.js` |
| D3 | Before adding from priority list, fetch outgoing requests once per run, skip any user already in the outgoing set. | `accept-friend-requests.js` |
| D4 | Add `Clear log` button next to `Copy log`; wires to existing `setLog('')` callback. | `App.jsx`, `i18n.js` |
| F1 | New helper `recentlyMessaged({ vk, userId, withinSeconds })`. Skip the friend if true. | `send-birthday-congratulations.js` |
| G1 | New helper `fetchAppPermissions(vk)` cached for the process lifetime; logged once on first code-3 error. | `src/bot/api-errors.js` |
| G6 | Add a `Verbose mode` toggle in the UI (Settings → Advanced). Persist to config; pass through to `setVerbose()`. | `App.jsx`, `electron/main.cjs`, `src/bot/logger.js` |
| G7 | If the case-study research confirms vk-io is silently re-naming a method, file an issue at <https://github.com/negezor/vk-io/issues>. (Pending verification — see §6.) | `docs/case-studies/issue-49/upstream-report.md` |
| G8 | Single PR #50, single changeset, single version bump. | `.changeset/*.md`, `package.json` |

Test plan:

- Add unit tests for `pickOutgoingToCancel` + new `isUnknownMethodError`,
  `recentlyMessaged`, invitation-post cache rotation logic, and the
  reset/clear save-bypass.
- Keep existing node test runner; no new deps.
- Manually exercise the UI: reset each list, click clear-log, toggle verbose.

---

## 6. Open research (G4 / G7)

Items still to investigate before / during implementation:

1. Whether `vk-io`'s `friends.delete` constructs the URL exactly as VK
   documents. (verbose hook already captures this — we'll diff against the
   VK docs.)
2. Whether Kate Mobile's permission bitmask actually still grants `friends`
   and `wall` writes in 2026. Need to call `account.getAppPermissions` from a
   live token and record the value here.
3. Whether `account.setOnline` is genuinely deprecated for Kate Mobile. (VK
   developer changelogs.)

Findings will be appended to this README as a §7 "Findings" section before
the PR is finalised.

---

## 7. Findings (online research, May 2026)

Concrete evidence collected for G4. **Conclusion: error code 3 on the failing
methods is a deliberate VK server-side restriction against the Kate Mobile
OAuth app (`client_id = 2685278`), not a bug in `vk-io` and not a token-scope
issue we can recover from in-app.**

### 7.1 Direct statement from the Kate Mobile team

- **June 5 2026 — Threads, Kate Mobile community
  ([`@hikkastyle08`](https://www.threads.com/@hikkastyle08/post/DYBahIciIin/)):**
  > «VK закрыл доступ к части API, поэтому в приложении перестали нормально
  > работать лайки, музыка, голосовые, закладки, ответы, **добавление друзей**
  > и другие функции».

  Translation: VK closed part of the API; likes, music, voice messages,
  bookmarks, replies, **adding friends** and other functions stopped working
  in the Kate Mobile client.
- **Apr 28 2026 — smart-lab.ru
  ([article](https://smart-lab.ru/blog/1296700.php)):** Independent
  corroboration listing the same affected method families.
- **Historical precedent — Mar 2018:** VK had already disabled the newsfeed
  API for Kate over an ad dispute ([vc.ru](https://vc.ru/social/34909)). The
  2026 round is broader.

### 7.2 Failure mode

VK chose to return **error code 3 "Unknown method passed"** for the disabled
(token, method) pairs rather than a dedicated `access_denied` error. This is
why issue #41 looked like a name/spelling problem — it isn't. The methods are
spelled correctly, the requests reach VK, VK simply refuses to acknowledge
them for this token.

### 7.3 Why `account.getAppPermissions` won't help

The OAuth scope mask is still `1073737727` (all bits set, as expected for
Kate Mobile). VK enforces the new restriction *above* the scope-check layer,
so `getAppPermissions` will keep reporting "full access" while the methods
fail. We will still call it once on first code-3 hit for the user-facing
diagnostic (so they have evidence the scope itself is intact), but we don't
gate behaviour on its result.

### 7.4 Other affected libraries

- [`python273/vk_api#276`](https://github.com/python273/vk_api/issues/276)
  and [`#219`](https://github.com/python273/vk_api/issues/219) — same class
  of failure: methods that worked on Kate tokens silently start returning
  code-3 / access errors.
- **`negezor/vk-io` — no matching open or closed issue.** Search across the
  repo for "Unknown method passed", "code 3", "friends.add" turns up only
  unrelated changes. The failure is server-side, not in URL construction.

### 7.5 Workarounds (and why we don't ship them by default)

- **VK Admin token** flow is already dead as of April 2026.
- **VK Official Android** (`client_id = 2274003`) and **Boom**
  (`client_id = 548242`) still authenticate via
  [vodka2/vk-audio-token](https://github.com/vodka2/vk-audio-token), but each
  has its own limitations (2FA handling for VK Official; partial API surface
  for Boom). Changing the `v=` parameter does not help — VK enforces per
  (token, method).
- Switching the app's OAuth client_id would be a breaking change for every
  existing user and is out of scope for this PR. We'll add a doc-pointer in
  the UI banner so users can opt-in later.

### 7.6 Action items for PR #50 (revised)

- ✅ G1 / C1 / D1 / E1 — treat code 3 as terminal for the trigger run, log
  once with `account.getAppPermissions` bitmask attached, surface a clean
  user-facing message.
- ✅ G6 — UI verbose toggle.
- ❌ G7 — **No upstream issue needed.** vk-io is not the cause. (Closing
  this requirement in the PR description with a pointer back to this section.)
- ✅ A* — invitation post flow is unaffected by the code-3 restriction
  (`wall.post` still works); we proceed with the avatar + `.lino` rotation
  improvements.
- ✅ F1 — birthday-history dedup; unaffected by code 3.
- ✅ B* — reset/clear save bug is pure UI; unaffected by code 3.

