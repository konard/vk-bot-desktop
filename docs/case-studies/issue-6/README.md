# Issue 6 Case Study: Install-Tested Desktop Releases

## Summary

Issue #6 reported two macOS release problems after downloading
`VK Bot Desktop 0.9.2-arm64.dmg`: the drag-to-Applications flow had no durable
success signal, and the copied app later failed with `"VK Bot Desktop" is
damaged and can't be opened. You should move it to the Trash.`

The direct root cause visible in this repository was release validation, not bot
runtime behavior. The existing Electron workflow built and uploaded desktop
artifacts, but it explicitly disabled macOS signing and did not install-test or
Gatekeeper-assess any target-platform artifact before publishing.

This PR changes the release contract: release artifacts use stable names for
latest-download links; macOS builds require signing and notarization secrets;
Linux, macOS, and Windows artifacts are smoke-tested after build and before
upload; and a React GitHub Pages download page detects language, theme, and OS
with direct fallback links.

## Captured Data

| File                                                       | Purpose                                         |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `data/issue-6.json`, `data/issue-6-comments.json`          | Primary issue metadata and comments.            |
| `data/install-error-screenshot.png`                        | Screenshot attached to issue #6.                |
| `data/pr-7*.json`                                          | Existing PR metadata, comments, and reviews.    |
| `data/releases-before-fix.txt`                             | Release state before this fix.                  |
| `data/ci-runs-branch-before-fix.json`                      | Branch CI state before implementation.          |
| `data/reproducing-tests-before-fix.txt`                    | Failing regression tests before the fix.        |
| `data/js-template-*.yml`, `data/js-template-file-tree.txt` | JS pipeline template comparison data.           |
| `data/deep-sdk-*.yml`, `data/deep-sdk-file-tree.txt`       | Deep SDK workflow comparison data.              |
| `data/upstream-deep-sdk-issue-url.txt`                     | Upstream issue filed for the matching SDK risk. |
| `../../screenshots/issue-6-pages-desktop.png`              | Desktop render of the new Pages download page.  |
| `../../screenshots/issue-6-pages-mobile.png`               | Mobile render of the new Pages download page.   |

The screenshot attachment was downloaded with GitHub authentication and verified
as a PNG by checking the PNG magic bytes (`89 50 4e 47 0d 0a 1a 0a`).

## Timeline

| Time (UTC)       | Event                                                                                 | Evidence                                |
| ---------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| 2026-05-09 20:22 | `v0.9.2` was published as the latest release.                                         | `data/releases-before-fix.txt`          |
| 2026-05-10 09:03 | Issue #6 reported the damaged macOS app and requested CI/CD, docs, and Pages updates. | `data/issue-6.json`                     |
| 2026-05-10 09:07 | PR #7 existed as a draft placeholder on `issue-6-4b296eea2cf6`.                       | `data/pr-7.json`                        |
| 2026-05-10 09:08 | The issue screenshot was downloaded and validated locally.                            | `data/install-error-screenshot.png`     |
| 2026-05-10 09:08 | JS template and Deep SDK workflow/file-tree snapshots were captured.                  | `data/js-template-*`, `data/deep-sdk-*` |
| 2026-05-10 09:13 | Regression tests reproduced the missing CI/CD and Pages behavior.                     | `data/reproducing-tests-before-fix.txt` |
| 2026-05-10 09:20 | The new Pages site was built and checked in desktop/mobile browser viewports.         | `../../screenshots/issue-6-pages-*.png` |
| 2026-05-10 09:22 | A related Deep SDK issue was filed for missing macOS Gatekeeper release validation.   | `data/upstream-deep-sdk-issue-url.txt`  |

## Requirements

| Requirement                                                     | Resolution                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Add target-platform installation testing after desktop builds.  | Added Linux, macOS, and Windows smoke-test steps before artifact upload.    |
| Fix macOS downloaded-app damage risk.                           | Removed unsigned macOS release path; require signing/notarization secrets.  |
| Improve release download documentation.                         | Added direct latest-release download table to `README.md`.                  |
| Add a React GitHub Pages landing/download page.                 | Added `site/`, `scripts/build-site.mjs`, and `.github/workflows/pages.yml`. |
| Detect user language, theme, and OS on the landing page.        | Implemented browser detection and fallback OS chooser.                      |
| Compare CI/CD with listed templates and capture data.           | Stored JS template and Deep SDK workflow/file-tree snapshots.               |
| Report matching issues upstream when found.                     | Filed `deep-foundation/sdk#20`; JS template had no Electron installer path. |
| Preserve case-study evidence under `docs/case-studies/issue-6`. | Added this directory and raw data/logs.                                     |

## Root Causes

1. **Unsigned macOS release path**: `electron-release.yml` set
   `CSC_IDENTITY_AUTO_DISCOVERY: 'false'`, disabling signing for macOS release
   artifacts.
2. **No Gatekeeper validation**: the workflow uploaded `.dmg` and `.zip`
   artifacts without `codesign`, `spctl`, or `stapler` checks.
3. **No installer smoke tests**: Linux packages and Windows installers were
   built and hashed, but not inspected or installed before upload.
4. **Versioned artifact names**: default electron-builder names made stable
   `/releases/latest/download/...` documentation and Pages links impractical.
5. **No download surface**: there was no Pages workflow or React landing page to
   guide users to the correct artifact when OS detection matters.

## Solution Applied

1. Added tests that fail on the previous workflow and site contract.
2. Configured stable release asset names for macOS, Windows, and Linux targets.
3. Builds both macOS x64 and arm64 artifacts so direct latest DMG links resolve.
4. Added macOS hardened-runtime entitlements and `notarize: true`.
5. Changed macOS release builds to consume `MAC_CSC_LINK`,
   `MAC_CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and
   `APPLE_API_ISSUER` secrets; releases fail clearly if those are missing.
6. Added post-build smoke tests:
   - Linux: inspect `.deb`, extract AppImage, and inspect tarball payload.
   - macOS: mount DMG, copy `.app`, run `codesign`, `spctl`, and `stapler`.
   - Windows: silently run the NSIS installer and check the installed app.
7. Added a React Pages site that fetches the latest GitHub Release, falls back
   to stable direct download links, and reacts to browser language/theme/OS.
8. Added the Pages deployment workflow with official Pages actions and explicit
   timeouts.
9. Updated README, requirements, best-practices docs, and added a changeset.

## Template Comparison

The JS pipeline template already contained the best practices this repo inherited
for fast checks, changesets, timeouts, fresh merge simulation, and docs
validation. It does not build Electron desktop installers, so the damaged DMG
failure does not apply there.

Deep SDK does build Electron macOS artifacts. Its workflow passes a signing
password but leaves certificate and Apple notarization inputs commented in the
macOS build step, then uploads the `.app.zip` without Gatekeeper validation.
That is the same release-validation risk class, so
<https://github.com/deep-foundation/sdk/issues/20> was opened with reproduction
commands, workarounds, and suggested code-level checks.

Deep SDK also has a GitHub Pages workflow using `actions/deploy-pages@v4`; this
PR follows the official Pages artifact pattern and uses the current
`actions/upload-pages-artifact@v4` plus job timeouts.

## Online Research

- Electron documents that macOS apps distributed to users should be code signed
  and notarized, and shows the same "damaged" Gatekeeper class of warning:
  <https://www.electronjs.org/docs/latest/tutorial/code-signing>
- electron-builder documents macOS certificate variables and warns that fully
  disabling signing changes hardened-runtime behavior:
  <https://www.electron.build/code-signing-mac.html>
- electron-builder notarization requires Apple API key, Apple ID, or keychain
  profile credentials:
  <https://www.electron.build/electron-builder.interface.masconfiguration>
- `@electron/notarize` documents `stapler validate` as a way to validate
  notarization:
  <https://github.com/electron/notarize>
- electron-builder DMG options support explicit content placement for the app
  and `/Applications` link:
  <https://www.electron.build/electron-builder.interface.dmgoptions>
- GitHub Pages custom workflows use `configure-pages`,
  `upload-pages-artifact`, and `deploy-pages`:
  <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- The deploy-pages action expects a previously uploaded Pages artifact:
  <https://github.com/actions/deploy-pages>

## Verification

Focused reproduction and fix checks:

```sh
node --test --test-timeout=30000 tests/desktop-release-workflow.test.js tests/pages-site.test.js tests/ci-timeouts.test.js
npm run build:site
```

Browser verification used Playwright MCP against the built `site/dist` at
1180x820 and 390x844. The screenshots are committed in `docs/screenshots/`.
