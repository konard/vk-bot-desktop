# Issue 26 Case Study: Token Flow and Download UX

## Scope

Issue: [konard/vk-bot-desktop#26](https://github.com/konard/vk-bot-desktop/issues/26)

Pull request:
[konard/vk-bot-desktop#27](https://github.com/konard/vk-bot-desktop/pull/27)

Branch: `issue-26-13d5d785ff12`

The issue combines desktop app usability, OAuth token entry, landing page
alignment, download verification, and research preservation.

## Captured Evidence

Local evidence files:

- `data/issue-26.json` - original issue body and metadata.
- `data/issue-26-comments.json` - issue comments at investigation time.
- `data/pr-27-before.json` - prepared draft PR state before implementation.
- `data/pr-27-review-comments-before.json` - PR inline comments before work.
- `data/pr-27-conversation-comments-before.json` - PR conversation comments
  before work.
- `data/pr-27-reviews-before.json` - PR reviews before work.
- `data/latest-release-before.json` - latest release metadata before changes.
- `data/related-pr-12.json`, `data/related-pr-16.json`, and
  `data/related-pr-25.json` - recent related PR context.
- `data/konard-oauth-code-search.txt` and
  `data/konard-app-preview-code-search.txt` - GitHub code search snapshots.
- `screenshots/token-screen-before.png` - issue screenshot for token entry.
- `screenshots/start-stop-before.png` - issue screenshot for start/stop state.
- `screenshots/site-mode-reference.png` - website segmented control reference.
- `screenshots/downloads-before.png` - issue screenshot for download buttons.

Implementation screenshots:

- [`../../screenshots/issue-26-pages-en-dark.png`](../../screenshots/issue-26-pages-en-dark.png)
  - English dark landing page with the app preview visible.
- [`../../screenshots/issue-26-downloads-verification.png`](../../screenshots/issue-26-downloads-verification.png)
  - grouped downloads after the new layout.
- [`../../screenshots/issue-26-verification-ui.png`](../../screenshots/issue-26-verification-ui.png)
  - UI-first checksum verification with one-row expandable sections.

## Online Research

The implementation keeps to platform APIs and existing browser capabilities:

- Electron exposes `shell.openExternal`, which is the app-side primitive used to
  open the VK OAuth authorization URLs in the user's browser:
  <https://www.electronjs.org/docs/latest/api/shell/>.
- Browser JavaScript can read the redirect fragment through the URL `hash`
  property. That matters for the experimental localhost flow because the OAuth
  token is returned after `#access_token=...`, so the served callback page reads
  the fragment and posts the token back to the local Electron callback endpoint:
  <https://developer.mozilla.org/en-US/docs/Web/API/URL/hash>.
- The download verification form uses the browser-native Web Crypto
  `SubtleCrypto.digest()` method for SHA-256 instead of introducing a new
  checksum library:
  <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest>.

## Requirements Checklist

| Requirement                                  | Implementation                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kate Mobile token link/button                | Added `KATE_MOBILE_TOKEN_URL` and a desktop button that opens the exact issue-provided URL through a whitelisted IPC channel.                           |
| Accept full VK redirect URL as token         | Added `extractVkAccessToken()` and wired the token input to normalize pasted redirect URLs from `#access_token=...` or query strings.                   |
| Accept raw token                             | The same helper preserves raw tokens after trimming whitespace.                                                                                         |
| Auto-save token changes and notify user      | Token changes debounce through `saveConfig`, update the saved token reference, and show saved/cleared/failure notifications.                            |
| Discard previous token                       | Pasting a full redirect URL replaces the field with only the extracted token, so stale URL metadata and previous token text are not retained.           |
| Experimental localhost redirect button       | Added `LOCALHOST_TOKEN_URL`, a separate button, a local callback server on `127.0.0.1:26852`, and IPC handoff back into the renderer.                   |
| Single start/stop toggle                     | Replaced separate start and stop actions with one run toggle whose label and style reflect the running state.                                           |
| Background execution status tracking         | Added `vkbot:get-status`, `vkbot:status` events, polling fallback, and a visible execution status indicator.                                            |
| Centered local/remote mode switch            | Rebuilt mode selection as a larger centered segmented control that mirrors the landing page language switch pattern.                                    |
| Desktop UI style aligned with landing page   | Updated renderer spacing, surfaces, controls, palette, and responsive behavior to match the landing page more closely.                                  |
| Landing screenshot changes by language/theme | Added locale/theme-specific preview image selection with generated `en/ru` and `light/dark` assets.                                                     |
| README English dark landing screenshot       | Added the English dark landing screenshot near the README introduction.                                                                                 |
| macOS section defaults to System Settings    | Reordered and opened the System Settings details block by default; Terminal is still available as the secondary path.                                   |
| Verification prefers UI-based flow           | Added a browser-based SHA-256 checker and made that details block open by default; command-line verification remains available below it.                |
| Expandable areas one per row                 | Changed macOS and verification details containers to one-column grids.                                                                                  |
| Download buttons grouped by default artifact | Added grouped download families: macOS DMG with zip chips, Windows installer/portable groups, and Linux AppImage primary buttons with `.deb`/tar chips. |
| Case-study data preserved                    | Preserved issue, PR, release, search, screenshot, test, build, and console evidence in `docs/case-studies/issue-26`.                                    |

## Solution Options Considered

For token acquisition, the lowest-risk path was to keep using the user's browser
for VK OAuth and only parse the resulting redirect URL in the app. Embedding an
OAuth webview would increase security and maintenance risk. A plain external
browser flow also keeps token handling explicit.

For localhost redirect support, opening a localhost OAuth URL alone is not
enough because the access token is returned as a URL fragment. The selected
experimental flow starts a local server, serves a callback page, lets that page
read `window.location.hash`, and posts the token to the local endpoint. This
keeps the port-bound feature small and easy to disable by simply not using the
button.

For download verification, a UI-first SHA-256 form is more approachable than
asking regular users to copy terminal commands. The CLI path remains in a
collapsed advanced section for users who want provenance or GitHub attestation
commands.

For downloads, flat lists made every artifact equally prominent. Grouping by
default artifact reduces decision load while preserving alternate formats and
architectures as smaller nearby actions.

For app previews, generated real screenshots were selected instead of static
mockups so language, theme, and UI alignment remain visually tied to the actual
desktop renderer.

## Verification Strategy

Automated checks:

- `tests/vk-token.test.js` verifies the exact OAuth URLs, full redirect URL
  parsing, localhost redirect parsing, and raw token support.
- `tests/oauth-callback.test.js` verifies the localhost callback page and token
  handoff endpoint.
- `tests/site-downloads.test.js` verifies download family grouping.
- `tests/pages-site.test.js` verifies landing page source expectations for the
  preview images, verification UI, and macOS details ordering.
- `tests/i18n.test.js` verifies renderer translation coverage.

Saved local logs:

- `data/reproducing-token-test-before.log` - failing reproduction before the
  token helper existed.
- `data/vk-token-test-after.log` - focused token helper test pass.
- `data/oauth-callback-test-after.log` - localhost callback token handoff test
  pass.
- `data/site-downloads-test-after.log` - download grouping test pass.
- `data/pages-site-test-after.log` - landing page source test pass.
- `data/i18n-test-after.log` - renderer translation test pass.
- `data/npm-test-after.log` - full unit test suite pass.
- `data/npm-check-after.log` - lint, format, and duplication checks pass.
- `data/pages-e2e-after.log` - browser e2e check pass against `site/dist`.
- `data/build-renderer-after.log` - renderer build pass.
- `data/build-site-after.log` and `data/build-site-after-preview-assets.log` -
  Pages build passes.
- `data/playwright-site-console-current.txt` - browser console capture after
  rendering the built Pages site.

## Follow-Up Risks

The localhost callback listens only when the experimental button is used and
closes after a token is received. If the configured port is already occupied,
the app falls back to a notification that the token page could not be opened.

The verification UI checks SHA-256 against `SHA256SUMS.txt`, but it does not
replace provenance or attestation checks. Those remain in the advanced section.

Generated preview images are committed so GitHub Pages can render them without a
runtime screenshot service. They should be regenerated when the desktop renderer
changes materially.
