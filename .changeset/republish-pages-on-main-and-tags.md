---
'vk-bot-desktop': patch
---

Always rebuild and republish the GitHub Pages download page on every push to `main` and every release tag, so the published page never goes stale relative to the latest GitHub Release. Fix `scripts/detect-code-changes.mjs` to select its git diff strategy from `$GITHUB_EVENT_NAME` instead of HEAD's parent count, so a real "Merge pull request" landing on `main` is no longer misclassified as a `pull_request` synthetic merge commit. Add an opt-in `CI_DETECT_VERBOSE` debug mode for after-the-fact diagnosis.
