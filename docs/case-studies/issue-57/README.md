# Case study - Issue #57: Active avatar photo_id missing or malformed

> Source: <https://github.com/konard/vk-bot-desktop/issues/57>
> PR: <https://github.com/konard/vk-bot-desktop/pull/58>
> Branch: `issue-57-45b3603fd1b8`
> Regression source: PR #56, which introduced the lossless avatar attachment.

## 1. Inputs collected

| Artifact                      | Path                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Raw issue JSON                | [`data/issue-57.json`](data/issue-57.json)                                   |
| Issue body and session log    | [`data/issue-57-body.md`](data/issue-57-body.md)                             |
| Issue comments                | [`data/issue-57-comments.json`](data/issue-57-comments.json)                 |
| PR metadata                   | [`data/pr-58.json`](data/pr-58.json)                                         |
| PR review comments            | [`data/pr-58-review-comments.json`](data/pr-58-review-comments.json)         |
| PR reviews                    | [`data/pr-58-reviews.json`](data/pr-58-reviews.json)                         |
| VK schema: `users.get`        | [`data/vk-schema-users-get.json`](data/vk-schema-users-get.json)             |
| VK schema: `photos.getById`   | [`data/vk-schema-photos-getById.json`](data/vk-schema-photos-getById.json)   |
| VK schema: `wall.post`        | [`data/vk-schema-wall-post.json`](data/vk-schema-wall-post.json)             |
| VK schema: `photos_photo`     | [`data/vk-schema-photos-photo.json`](data/vk-schema-photos-photo.json)       |
| Focused test output after fix | [`data/focused-test-after-fix.txt`](data/focused-test-after-fix.txt)         |
| Full test output after fix    | [`data/npm-test-after-fix.txt`](data/npm-test-after-fix.txt)                 |
| Bun test output after fix     | [`data/bun-test-after-fix.txt`](data/bun-test-after-fix.txt)                 |
| Deno test output after fix    | [`data/deno-test-after-fix.txt`](data/deno-test-after-fix.txt)               |
| Local check output after fix  | [`data/npm-check-after-fix.txt`](data/npm-check-after-fix.txt)               |
| Changeset status after fix    | [`data/changeset-status-after-fix.txt`](data/changeset-status-after-fix.txt) |

The VK schema files are extracted from <https://github.com/VKCOM/vk-api-schema>,
the public VK API 5.199 schema repository.

## 2. Timeline

1. PR #56 replaced avatar download/re-upload with a lossless attachment
   builder: `users.get({ user_ids: 0, fields: 'photo_id' })`,
   `photos.getById`, and then `wall.post` with
   `photo<owner>_<id>[_<access_key>]`.
2. The issue log from May 16 2026 shows the first live run after that change:
   `wall.get` succeeds, then `users.get` is called with `user_ids: 0`.
3. VK returns an empty `users.get` response, so `photo_id` is missing and the
   trigger posts text-only (`attachments: ""`).

## 3. Requirements

- Attach the user's latest active VK avatar directly to invitation posts.
- Reuse the existing VK photo object so likes accumulate on the real avatar,
  not a re-uploaded copy.
- Prefer the VK API route; use browser reverse engineering only if the API path
  cannot produce a correct attachment.
- Improve diagnostics if the avatar reference cannot be resolved.
- Preserve all issue evidence and analysis in `docs/case-studies/issue-57/`.

## 4. Root cause

The bad assumption was that `user_ids: 0` means "current user". The VK API
schema says `users.get.user_ids` defaults to the current user when the
parameter is omitted. In practice, sending `0` is not equivalent to omitting
the parameter: the live log shows VK returning an empty profile list.

The rest of the attachment strategy is still correct:

- `users.get` exposes `photo_id` as a profile field.
- `photos.getById.photos` accepts `<owner_id>_<photo_id>[_<access_key>]`.
- `wall.post.attachments` accepts `photo<owner_id>_<media_id>` entries.
- `photos_photo.access_key` is the right field to append when VK provides it.

## 5. Solution

`getActiveAvatarAttachment` now calls `users.get({ fields:
'photo_id,crop_photo' })` without `user_ids`, allowing VK to resolve the token
holder according to the documented default.

It still prefers `photo_id`, then asks `photos.getById` for the access key.
It also uses `crop_photo.photo` as an API-only fallback when `photo_id` is
missing but VK already returned the active avatar photo object. That fallback
means no image download, no upload, and no Electron browser reverse engineering
is needed for this issue.

The missing-avatar log now includes the profile count, profile id, returned
profile keys, and whether `crop_photo.photo` was present. It deliberately logs
only `hasAccessKey`, not the access key itself.

## 6. Regression coverage

`tests/send-invitation-posts.test.js` now locks in:

- no `user_ids` parameter is sent for the current token holder;
- both `photo_id` and `crop_photo` are requested;
- `crop_photo.photo` can form `photo<owner>_<id>_<access_key>` without
  `photos.getById`;
- an empty profile list returns `null` with diagnostics instead of throwing;
- existing `photo_id` + `photos.getById` attachment behavior is preserved.

Focused verification:

```text
node --test --test-timeout=30000 tests/send-invitation-posts.test.js
```

Result: 24 tests passed.

Full local verification also passed:

```text
npm test
bun test --timeout 30000
deno test --allow-read
npm run check
```

Results: 305 Node tests passed, 397 Bun tests passed, 151 Deno tests passed,
and lint, Prettier, and duplication checks passed.

## 7. Related projects

No upstream issue was filed. The failure is in this repository's VK API
parameter choice, not in `vk-io` request construction and not in VK's schema.
