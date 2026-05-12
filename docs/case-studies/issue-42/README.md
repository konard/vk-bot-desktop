# Issue #42 Case Study: `communities is not iterable`

## Summary

Issue #42 reported that the `send-invitation-posts` trigger crashed on startup
with `TypeError: communities is not iterable`. The crash was reproducible from
the saved Links Notation config path: an empty `invitationPost.communities`
array was serialized as a bare `communities` key, parsed back as `{}`, merged
into runtime config, and then used as the right-hand side of `for...of`.

The fix normalizes schema-defined array fields during `mergeWithDefaults`, so
old and new saved configs keep `communities`, `priorityFriendIds`,
`invitationPost.messages`, and `birthdayGreetings` iterable before triggers run.

## Preserved Evidence

- `artifacts/issue-42.json`: issue body, metadata, and reported stack trace.
- `artifacts/issue-comments.json`: issue comments, empty at investigation time.
- `artifacts/pr-43.json`: draft PR metadata before the fix.
- `artifacts/issue-screenshot.png`: downloaded screenshot from the issue. The
  PNG signature was verified as `89 50 4e 47 0d 0a 1a 0a`.
- `upstream-vk-bot/send-invitation-posts.js.txt`: upstream command wrapper from
  `konard/vk-bot`.
- `upstream-vk-bot/triggers-send-invitation-posts-for-friends.js.txt`: upstream
  trigger used for behavior comparison.
- `artifacts/lino-store-repro-before.log`: failing regression test before the
  fix, showing actual `{}` and expected `[]`.
- `artifacts/lino-store-after.log` and `artifacts/focused-tests-after.log`:
  passing focused tests after the fix.

## Timeline

1. `2026-05-12T15:20:56.317Z`: the reported app session log opened.
2. `2026-05-12T15:20:56.338Z`: the bot started.
3. `2026-05-12T15:20:56.340Z`: the runner checked the
   `send-invitation-posts` trigger.
4. `2026-05-12T15:20:56.340Z`: the trigger threw
   `TypeError: communities is not iterable` at
   `src/bot/triggers/send-invitation-posts.js:75:29` in the packaged app.
5. `2026-05-12T15:21:12.221Z`: the bot was stopped and exited with code `0`.
6. `2026-05-12T15:21:34Z`: issue #42 was opened with the screenshot and log.
7. During this PR, `tests/lino-store.test.js` reproduced the bad shape by
   saving `{ invitationPost: { communities: [] } }`, loading it back, and
   observing `config.invitationPost.communities === {}` before the fix.

## Requirements Checked

- Fix the reported crash in the post friend-request invitations feature.
- Preserve the issue screenshot, metadata, comments, and local reproduction
  logs under `docs/case-studies/issue-42`.
- Compare the desktop implementation against `konard/vk-bot`.
- Reconstruct the sequence of events, requirements, root causes, and solution
  options.
- Add a reproducing automated test before the fix and keep the regression
  covered after the fix.
- Search online for relevant behavior facts and existing components.
- Avoid filing upstream issues unless the root cause belongs to another
  project. No external issue was filed because the defect is local config
  normalization in this repository.

## Upstream Comparison

The original `konard/vk-bot` entrypoint only creates a VK client and executes
`triggers/send-invitation-posts-for-friends.js`.

The upstream trigger differs from the desktop trigger in two important ways:

- It uses a hardcoded `communities` array containing 16 numeric community IDs.
  That value is always iterable.
- It keeps additional behavior that the desktop version intentionally
  simplified, including restricted-community text, audio attachments, search
  for old matching posts, deletion of old posts, and a daily disabled-community
  reset.

The desktop implementation moved communities into user configuration:
`config.invitationPost.communities`. That is the right product direction for a
desktop app, but it introduced a schema boundary that the old hardcoded array
did not have.

## Online Facts

- MDN documents that JavaScript throws `TypeError: x is not iterable` when a
  value used by `for...of` is not an iterable object. It also explicitly notes
  that plain objects are not iterable unless they implement the iterable
  protocol: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/is_not_iterable>.
- Existing repository dependencies already include `lino-objects-codec`, but
  this app uses an inline indented codec because the package helpers only cover
  the flatter shapes documented in `src/lino-store.js`. Adding a full schema
  validator such as Ajv or Zod would be heavier than this issue requires; the
  existing default config already provides the schema needed to normalize array
  fields.

## Root Causes

1. `src/lino-store.js` cannot distinguish an empty array from an empty object in
   the current indented format. It formats an empty array as a bare key, for
   example `communities`, and parses a bare key back as `{}`.
2. `src/bot/config.js` previously performed only a shallow object merge. It
   trusted overlay values, so the parsed `{}` replaced the default `[]`.
3. `src/bot/triggers/send-invitation-posts.js` correctly used `for...of` for
   an array of community IDs, but the malformed merged config supplied a plain
   object.

## Solutions Considered

- Encode empty arrays with a new marker in `.lino` files. This would make the
  file format less human-readable and would not repair already saved configs.
- Teach the parser to convert every childless object into an array. This would
  risk corrupting valid empty objects in cache or state files.
- Add trigger-local guards only in `sendInvitationPosts`. This would stop this
  crash but leave other array-shaped config fields vulnerable.
- Use the default config as the runtime schema during merge. This repairs
  existing saved configs, covers every known array-shaped config field, keeps
  the file format unchanged, and leaves unrelated cache/state parsing alone.

The selected fix is the schema-aware merge.

## Fix

- `mergeWithDefaults` now recursively merges known default config sections
  instead of doing a shallow spread.
- Array defaults now normalize malformed overlay values:
  - `undefined` keeps a cloned default array.
  - `[]` remains `[]`.
  - `{}` becomes `[]`, which handles empty arrays parsed from `.lino`.
  - scalar values become a single-item array for manually edited configs.
- Unknown top-level config fields, such as `mode` and `server`, are still
  preserved.

## Verification

1. Reproducing test before the fix:
   `node --test --test-timeout=30000 tests/lino-store.test.js` failed with
   actual `{}` and expected `[]`.
2. Focused tests after the fix:
   `node --test --test-timeout=30000 tests/bot-config.test.js tests/lino-store.test.js`
   passed.
3. Full project checks are recorded in the PR after implementation.

## References

- Issue #42: <https://github.com/konard/vk-bot-desktop/issues/42>
- PR #43: <https://github.com/konard/vk-bot-desktop/pull/43>
- Upstream wrapper:
  <https://github.com/konard/vk-bot/blob/main/send-invitation-posts.js>
- Upstream trigger:
  <https://github.com/konard/vk-bot/blob/main/triggers/send-invitation-posts-for-friends.js>
- MDN JavaScript iterable error reference:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/is_not_iterable>
