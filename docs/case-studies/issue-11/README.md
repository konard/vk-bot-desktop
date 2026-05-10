# Issue 11 Case Study: Website Download Links Pointed To Missing Assets

## Summary

Issue: https://github.com/konard/vk-bot-desktop/issues/11

The public website linked to
`https://github.com/konard/vk-bot-desktop/releases/download/v0.9.4/vk-bot-desktop-macos-arm64.dmg`,
but that release asset did not exist. By the time this investigation ran,
`v0.9.5` had been published at `2026-05-10T12:49:05Z`, so the requested release
was present. The installation bug remained because the latest release still did
not include macOS DMG assets while the website and documentation synthesized
direct macOS asset URLs.

The fix changes the Pages site to read GitHub's latest Release API response and
render direct download links only for assets that are actually attached to the
release. Missing macOS assets are now shown as unavailable instead of as broken
links, Pages e2e checks compare rendered links against release metadata, and the
release workflow verifies published asset URLs after upload.

## Captured Data

- `artifacts/issue-11.json` and `artifacts/issue-11-comments.json`: issue
  details and comments.
- `artifacts/pr-12.json`: pull request state before this fix.
- `artifacts/site-download-page.png`: issue screenshot of the website download
  page.
- `artifacts/broken-release-link.png`: issue screenshot of the GitHub 404 page.
- `artifacts/release-v0.9.4.json`: release metadata showing the original broken
  macOS link target did not exist.
- `artifacts/release-v0.9.5.json` and `artifacts/latest-release-api.json`:
  latest release metadata used to validate the fixed behavior.
- `artifacts/direct-latest-link-checks-v0.9.5.txt`: HTTP checks showing macOS
  direct links returned `404` while Linux, Windows, and checksum links returned
  `200`.
- `ci-logs/electron-release-v0.9.4-25628289463.log`: successful `v0.9.4`
  release workflow log.
- `ci-logs/electron-release-v0.9.5-25629042968.log`: successful `v0.9.5`
  release workflow log.
- `ci-logs/pages-main-25628940953.log`: Pages workflow log that passed before
  the broken asset contract was detected.
- `artifacts/repro-pages-e2e-before-fix.log`: local browser e2e reproduction
  that failed on synthesized missing macOS links.
- `artifacts/live-pages-e2e-before-fix.log`: live Pages reproduction against
  the deployed site before this PR is deployed.
- `artifacts/pages-e2e-after-fix.log`: local browser e2e verification after the
  fix.
- `template-data/*`: CI/CD template repository metadata, file inventories, and
  release workflow files used for comparison.

## Requirements Reconstructed

1. Make the website installation flow work from the public Pages URL.
2. Stop linking to release assets that are not attached to the latest release.
3. Keep macOS signing policy intact: do not publish unsigned macOS installer
   artifacts as a workaround.
4. Detect this class of broken website link in automated browser tests.
5. Preserve release and Pages workflow logs for review.
6. Compare the JavaScript, Rust, Python, and C# CI/CD templates and report an
   upstream issue only if the same defect exists there.

## Timeline

- `2026-05-10T12:06:02Z`: `Electron release` run `25628289463` started for
  `v0.9.4`.
- `2026-05-10T12:11:50Z`: `v0.9.4` was published. It contained Linux, Windows,
  checksum, and provenance assets, but no macOS DMG assets.
- `2026-05-10T12:38:28Z`: `GitHub Pages` run `25628940953` started.
- `2026-05-10T12:40:30Z`: the previous Pages e2e check passed against the
  deployed website even though it did not verify release asset availability.
- `2026-05-10T12:43:30Z`: `Electron release` run `25629042968` started for
  `v0.9.5`.
- `2026-05-10T12:43:51Z`: the macOS job reported missing signing and
  notarization secrets.
- `2026-05-10T12:49:05Z`: `v0.9.5` was published. It contained Linux, Windows,
  checksum, and provenance assets, but no macOS DMG assets.
- `2026-05-10T12:55Z`: direct latest-link checks showed `404` for both macOS
  DMG URLs and `200` for Linux, Windows, and `SHA256SUMS.txt`.

## Root Causes

### The latest release was present, but macOS assets were absent

Issue 11 reported that there was no `0.9.5` release. That was accurate before
the release workflow completed, but by `2026-05-10T12:49:05Z` the release did
exist. The remaining installation failure was narrower: both `v0.9.4` and
`v0.9.5` lacked macOS DMG assets.

The `v0.9.5` release log records that `MAC_CSC_LINK`,
`MAC_CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and
`APPLE_API_ISSUER` were not configured
(`ci-logs/electron-release-v0.9.5-25629042968.log:1018`). The workflow then
published the safe non-macOS assets. The release metadata confirms that
`v0.9.5` included Linux, Windows, checksum, and provenance files only.

### The website synthesized direct asset URLs

The Pages site and README used stable
`/releases/latest/download/<asset-name>` URLs for every supported platform. That
is safe only when the asset is guaranteed to exist. For macOS, the workflow can
validly skip asset creation when signing and notarization secrets are absent, so
the website generated direct links to files GitHub could not serve.

The captured direct checks show:

- `404` for `vk-bot-desktop-macos-arm64.dmg`
- `404` for `vk-bot-desktop-macos-x64.dmg`
- `200` for all Linux, Windows, and checksum assets attached to `v0.9.5`

### Pages e2e validated the page, not the release contract

The previous Pages workflow loaded the website before and after deployment and
passed (`ci-logs/pages-main-25628940953.log:227` and
`ci-logs/pages-main-25628940953.log:544`). It did not compare rendered download
links with the latest GitHub Release API assets, so the browser test could pass
while the macOS links led to GitHub 404 pages.

### Link checking ignored the risky URL pattern

`.lycheeignore` ignored direct release download URL patterns, which masked the
same class of defect in static documentation.

## Fix

1. Added `site/downloads.js` as the single source of download asset names and
   release URL resolution.
2. Updated the Pages app to fetch GitHub's latest Release API and use each
   asset's `browser_download_url` instead of synthesizing direct URLs.
3. Rendered missing platform assets as unavailable non-links.
4. Extended browser e2e coverage so local tests mock a partial release without
   macOS assets and live tests compare links against the real latest release.
5. Added unit coverage for release download helper behavior.
6. Added post-upload release workflow validation that confirms uploaded assets
   are present in release metadata and return HTTP `200`.
7. Removed broad `.lycheeignore` entries for release download assets.
8. Updated README and requirements to state that direct links are allowed only
   for assets actually attached to the latest release.

## Template Comparison

The JavaScript, Rust, Python, and C# CI/CD templates were checked for release
workflow patterns, direct `latest/download` asset URL generation, Electron
Builder macOS signing behavior, and browser-level Pages release-asset checks.
The same defect was not present: the template release workflows do not publish
this Electron app's macOS assets and do not include the website download link
contract that failed here. No upstream template issue was opened.

## External References

- GitHub REST API release and release asset endpoints:
  https://docs.github.com/rest/releases
- GitHub REST release responses include `browser_download_url` for assets:
  https://docs.github.com/en/rest/releases/releases
- GitHub Actions deployment documentation:
  https://docs.github.com/actions/deployment/deploying-with-github-actions
- `actions/deploy-pages` documentation:
  https://github.com/actions/deploy-pages/blob/main/README.md
- Electron Builder macOS code signing documentation:
  https://www.electron.build/code-signing-mac

## Verification

- Before fix: `npm run test:pages:e2e -- --site-dir site/dist` failed with
  `Page links to release assets that are absent from the latest release:
vk-bot-desktop-macos-arm64.dmg, vk-bot-desktop-macos-x64.dmg`.
- After fix: `npm run test:pages:e2e -- --site-dir site/dist` passed with the
  mocked partial release.
- Manual browser verification captured desktop and mobile screenshots in
  `docs/screenshots/issue-11-pages-desktop.png` and
  `docs/screenshots/issue-11-pages-mobile.png`.
