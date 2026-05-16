---
'vk-bot-desktop': patch
---

Issue #57: fix active avatar attachment lookup for invitation posts:

- `getActiveAvatarAttachment` now omits `user_ids` when calling `users.get`,
  letting VK resolve the current token holder through the documented default
  instead of asking for literal user id `0`.
- The lookup requests both `photo_id` and `crop_photo`, using
  `crop_photo.photo` as an API-only fallback when `photo_id` is missing.
- Missing-avatar diagnostics now include the returned profile count, profile
  id, profile keys, and crop-photo presence without logging access keys.
- `tests/send-invitation-posts.test.js` covers the omitted-`user_ids`
  regression, the `crop_photo` fallback, and the empty-profile response from
  the live issue log.
- `docs/case-studies/issue-57/` records the issue evidence, VK schema extracts,
  root-cause analysis, and verification notes.
