---
'vk-bot-desktop': minor
---

Issue #51 — Auto-regenerate preview images on release:

- New `scripts/update-preview-images.mjs` drives `browser-commander` +
  Playwright to recapture the four locale × theme preview tiles
  (`site/assets/app-preview-{en,ru}-{light,dark}.png`), the share-image
  fallback (`site/assets/app-preview.png`), and the README landing image
  (`docs/screenshots/issue-26-pages-en-dark.png`). Exposed as
  `npm run preview:update`. Honours `PREVIEW_VERBOSE=1` for diagnostic
  logging on CI.
- New `preview-regen` job in `.github/workflows/js.yml` runs on push to
  `main`, on release tag pushes (`refs/tags/v*`), and on
  `workflow_dispatch` with `release_mode=checks`. It regenerates the
  images and, on drift, commits them back to `main` with `[skip ci]`.
- Hoists `flushSave` + `applyAndSave` declarations in
  `electron/renderer/App.jsx` so the `onResetToken` / `onClearPriority` /
  `onResetInvitationMessages` (and siblings) `useCallback` deps no longer
  trigger a temporal-dead-zone error at render time.
- Adds case study at `docs/case-studies/issue-51/` documenting the
  inventory, root-cause analysis, link-foundation template parity survey,
  and acceptance criteria.
