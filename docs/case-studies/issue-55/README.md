# Case study — Issue #55: Global VK API throttle + lossless avatar attachment

> Source: <https://github.com/konard/vk-bot-desktop/issues/55>
> PR: <https://github.com/konard/vk-bot-desktop/pull/56>
> Branch: `issue-55-6c7480de67c0`
> Prior cases referenced:
>
> - [`docs/case-studies/issue-49`](../issue-49) — first pass at invitation-post
>   rotation; introduced per-community caching and inline sleeps but uploaded a
>   fresh `wallPhoto` for the avatar.
> - [`docs/case-studies/issue-41`](../issue-41) — added the verbose
>   request/response evidence hook in `vk-client`; this PR plugs the global
>   throttle into that same hook.

---

## 1. Inputs collected

| Artifact                                                   | Path                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Raw GitHub issue JSON                                      | [`data/issue-55.json`](data/issue-55.json)                                                                             |
| Upstream `konard/vk-bot` invitation trigger (SHA 175d2d13) | [`upstream-vk-bot/send-invitation-posts-for-friends.js.txt`](upstream-vk-bot/send-invitation-posts-for-friends.js.txt) |
| Upstream accept-friend trigger                             | [`upstream-vk-bot/accept-friend-requests.js.txt`](upstream-vk-bot/accept-friend-requests.js.txt)                       |
| Upstream delete-deactivated trigger                        | [`upstream-vk-bot/delete-deactivated-friends.js.txt`](upstream-vk-bot/delete-deactivated-friends.js.txt)               |
| Upstream delete-outgoing trigger                           | [`upstream-vk-bot/delete-outgoing-requests.js.txt`](upstream-vk-bot/delete-outgoing-requests.js.txt)                   |
| Upstream birthday trigger                                  | [`upstream-vk-bot/send-birthday-congratulations.js.txt`](upstream-vk-bot/send-birthday-congratulations.js.txt)         |
| Upstream set-online trigger                                | [`upstream-vk-bot/set-online-status.js.txt`](upstream-vk-bot/set-online-status.js.txt)                                 |
| Upstream `index.js` (trigger scheduler / intervals)        | [`upstream-vk-bot/index.js.txt`](upstream-vk-bot/index.js.txt)                                                         |
| Upstream `utils.js` (priority friends, time units)         | [`upstream-vk-bot/utils.js.txt`](upstream-vk-bot/utils.js.txt)                                                         |
| Upstream `time-units.js`                                   | [`upstream-vk-bot/time-units.js.txt`](upstream-vk-bot/time-units.js.txt)                                               |

All upstream snapshots are pinned to commit `175d2d13218d9e791ae2f3e824a0d24f10319dcb` — the exact reference the issue cites for the avatar attachment line.

---

## 2. Requirements list

Extracted verbatim from the issue and grouped by area.

### A. Global VK API throttle

- **A1** Enforce a **randomised minimum gap between every outgoing VK API
  request** that applies process-wide, not per-trigger.
- **A2** **Read** methods (e.g. `users.get`, `friends.get`, `wall.get`,
  `wall.search`, `friends.getRequests`, `photos.getById`, `friends.getMutual`,
  `messages.getHistory`) wait **3000–7000 ms** picked uniformly at random.
- **A3** **Write** methods (e.g. `friends.add`, `friends.delete`, `wall.post`,
  `wall.delete`, `messages.send`, `account.setOnline`) wait **6000–13 000 ms**
  picked uniformly at random.
- **A4** The throttle must **serialise concurrent callers** so two triggers
  firing simultaneously never both bypass the gap.
- **A5** Per-trigger interval defaults must continue to match `konard/vk-bot`'s
  upstream `index.js` (14 min online, 20 min accept friends, 30 min delete
  deactivated, 8 min delete outgoing, 9 min invitation posts, 23 h birthday).

### B. Lossless avatar attachment

- **B1** The bot must **never upload** the avatar to VK again — every new
  invitation post must reuse the user's existing avatar photo so that likes
  accumulate on a single photo over time.
- **B2** The bot must **never download** the avatar from VK; no temp-file IO,
  no `fetch()`-from-photo URL.
- **B3** The attachment string passed to `wall.post` must work for **any
  user**, not just the issue author. Format observed in upstream:
  `photo<owner>_<id>_<access_key>` (see
  [`upstream-vk-bot/send-invitation-posts-for-friends.js.txt`](upstream-vk-bot/send-invitation-posts-for-friends.js.txt#L86)).

### C. Process / documentation

- **C1** Collect issue-related material into `./docs/case-studies/issue-55/`
  and write a deep case-study analysis with a list of requirements, solution
  plans, and references to known libraries that solve similar problems.

---

## 3. Root cause / why this matters

VK's anti-abuse system replies with the following error codes when a token
issues bursts:

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| 29   | Rate limit reached                                       |
| 14   | Captcha needed                                           |
| 10   | Internal server error — try later                        |
| 219  | Advertisement post recently added                        |
| 210  | Access to wall's post denied                             |
| 15   | Wall is disabled                                         |
| 177  | User not found (also triggered by anti-abuse heuristics) |

The previous `vk-bot-desktop` design relied on **per-trigger inline sleeps**
(10 s after `wall.get`, 5 s after `wall.post`, etc.). Three pathologies follow:

1. **No floor on independent triggers**: two concurrent triggers (e.g.
   set-online running on its 14-min schedule while accept-friends is mid-loop)
   could fire VK calls back-to-back with no inter-call delay at all.
2. **No randomisation**: deterministic gaps are pattern-recognised by VK's
   anti-abuse system, which is why upstream's working version uses
   `getRandomElement` style jitter in places.
3. **First call after a long idle window still hit at full speed** — fine in
   isolation, dangerous when the scheduler bunches triggers together.

The issue author confirmed that upstream `konard/vk-bot` ran for months
without rate-limit hits using a **single shared pacing barrier** plus
randomised intervals. We are porting that property as a first-class concern.

For the **avatar**, the previous implementation called
`vk.upload.wallPhoto(...)` on every cycle. That created a brand-new VK photo
each time, so likes scattered across thousands of one-off uploads instead of
concentrating on the one canonical avatar. The issue author asked us to mimic
upstream's behaviour where one hard-coded photo attachment was reused, but
make it derived per-user instead of hard-coded.

---

## 4. Solution

### 4.1 New module: `src/bot/vk-rate-limit.js`

Implements `createThrottle({ random, sleep, now, readRange, writeRange })`
returning `{ throttle(method, fn), reset() }`. The throttle:

- **Classifies** the method as `read` or `write` via the heuristic
  `^(get|search|is|are|look)` against the local name (after the dot). When the
  method is empty, missing or non-string we err on the side of the longer
  delay (write) — safer in face of unknown methods.
- **Picks a delay** uniformly at random inside the relevant range each time it
  is invoked, using `pickDelay(range, random)`.
- **Serialises concurrent callers** through a single Promise chain. Each
  call reserves a "slot" promise that resolves only after both the wait and
  the wrapped function complete; the next caller waits on that slot before
  reading `lastEndedAt`. This makes the chain race-free even when multiple
  triggers fire `throttle()` in the same micro-task batch.
- **Skips the gap for the very first call** (`lastEndedAt === null`). Real
  VK clients always start cold and one immediate call won't move the needle.
- **Updates `lastEndedAt` in a `finally`** so even rejected calls extend the
  pacing barrier — otherwise an erroring call would let the next caller fire
  immediately.

Exports `READ_DELAY_RANGE_MS = { min: 3000, max: 7000 }` and
`WRITE_DELAY_RANGE_MS = { min: 6000, max: 13000 }` for tests and other
modules.

A process-wide singleton (`getGlobalThrottle()` / `setGlobalThrottle()` /
`resetGlobalThrottle()`) is exposed so the `vk-client` integration uses one
shared chain regardless of which trigger calls it.

### 4.2 Wiring in `src/bot/vk-client.js`

The existing `installRawHttpHook` already patched `APIRequest.prototype.make`
for verbose logging (issue #41 evidence capture). We now wrap the inner
`originalMake.apply(this, args)` invocation inside
`throttleFn(this.method, ...)` — verbose mode on or off — so **every** VK
request that flows through `vk-io` is paced. `hookOptions.throttle` is an
injection seam: tests pass `(_method, fn) => fn()` to bypass the wait.

### 4.3 Avatar attachment without upload/download

`src/bot/triggers/send-invitation-posts.js` exposes a new helper:

```js
export async function getActiveAvatarAttachment({ vk }) {
  /* ... */
}
```

It calls `users.get({ user_ids: 0, fields: 'photo_id' })` to read the
**current profile photo's** `<owner>_<id>` string (VK populates `photo_id`
only when the user has an avatar set), then `photos.getById({ photos: photoId,
extended: 0 })` to fetch the matching `access_key`. The final attachment is
either `photo<owner>_<id>_<access_key>` (when the key is present) or
`photo<owner>_<id>` (when it is not — VK doesn't always emit one for fully
public photos).

Result: every new invitation post references **the same canonical avatar**
that the user already has. Likes accumulate on that one photo over time, just
like upstream. No bytes are uploaded or downloaded.

### 4.4 Removal of per-trigger inline sleeps

Now that the global throttle covers every VK call, the redundant
`await sleep(5000)` / `await sleep(10000)` calls inside trigger loops are
deleted from:

- `src/bot/triggers/accept-friend-requests.js`
- `src/bot/triggers/delete-deactivated-friends.js`
- `src/bot/triggers/delete-outgoing-friend-requests.js`
- `src/bot/triggers/send-birthday-congratulations.js`
- `src/bot/triggers/send-invitation-posts.js`

The **error-backoff sleeps** (1 minute on captcha / rate-limit / internal
errors) remain — they are qualitatively different from a pacing barrier:
they're a recovery delay that intentionally exceeds the throttle.

### 4.5 Per-trigger interval verification

`src/bot/runner.js` already schedules triggers at upstream-matching intervals
(verified against [`upstream-vk-bot/index.js.txt`](upstream-vk-bot/index.js.txt)):

| Trigger                           | Interval | Matches upstream? |
| --------------------------------- | -------- | ----------------- |
| `set-online-status`               | 14 min   | yes               |
| `accept-friend-requests`          | 20 min   | yes               |
| `delete-deactivated-friends`      | 30 min   | yes               |
| `delete-outgoing-friend-requests` | 8 min    | yes               |
| `send-invitation-posts`           | 9 min    | yes               |
| `send-birthday-congratulations`   | 23 h     | yes               |

No interval changes needed for this PR.

---

## 5. Prior art / libraries surveyed

| Library / Pattern                                     | Considered for                             | Verdict for this PR                                                                                        |
| ----------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `bottleneck` (npm)                                    | rate-limited job scheduler with reservoirs | Overkill: we don't need reservoirs, weights, or distributed mode. Our barrier is a one-line Promise chain. |
| `p-throttle` (npm)                                    | functional throttling by interval+limit    | Doesn't model **two delay families** (read vs write) on the same shared chain.                             |
| `vk-io`'s built-in `apiMode` / `apiRateLimit` options | letting `vk-io` rate-limit for us          | `vk-io` v4 caps to ~3 req/s; the issue asks for a **slower** pace (3–13 s) — exact opposite direction.     |
| The upstream `konard/vk-bot` `sleep(...)` pattern     | replicate by hand                          | This is the _baseline_. We now do it once globally instead of N times per trigger.                         |
| `async-sema` / `await-semaphore`                      | mutex/semaphore primitives                 | Too low-level; we still need the timestamp bookkeeping to pace by _elapsed time_, not just concurrency.    |

Decision: keep the implementation in-house, **~50 LOC, zero new dependencies**.
The throttle is small enough to test exhaustively and avoids dragging in a
heavy scheduler for what is effectively two sleep ranges plus a chain.

---

## 6. Test coverage

| Test file                             | What it locks in                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/vk-rate-limit.test.js`         | method classification heuristic, `pickDelay` range bounds, first-call-no-wait, read-after-write picks read delay, concurrent-serialisation, reset(), throw-safety. |
| `tests/vk-client.test.js`             | verifies the patched `APIRequest.make` still logs / redacts and the bypass throttle injection works.                                                               |
| `tests/send-invitation-posts.test.js` | new `getActiveAvatarAttachment` cases (key present, key missing, photos.getById throws, no photo_id, users.get throws, correct `user_ids: 0` + `photo_id` field).  |

All three suites are in `node --test`. CI uses both Node and Deno; no test
relies on Electron, the network, or real timers.

---

## 7. Open follow-ups not in scope here

- **Adaptive backoff** on repeated 29/14 errors (currently a flat 60 s).
- **Per-method throttle overrides** (e.g. messages.send may benefit from a
  longer floor; out of scope until evidence accumulates).
- **Telemetry / counters** for how often the throttle actually slept and for
  how long — useful for tuning the ranges but not requested by issue #55.
