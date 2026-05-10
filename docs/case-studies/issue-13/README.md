# Case Study: macOS Release Availability Without an Apple Developer Account

## Issue Reference

- Issue: [konard/vk-bot-desktop#13](https://github.com/konard/vk-bot-desktop/issues/13)
- Pull request: [konard/vk-bot-desktop#14](https://github.com/konard/vk-bot-desktop/pull/14)
- Symptom: the GitHub Pages download page showed `Not available in latest release` for macOS.

## Captured Data

- Issue details: `data/issue-13.json`
- Issue comments: `data/issue-13-comments.json`
- Reported screenshot: `artifacts/macos-download-unavailable.png`
- Latest release metadata: `data/latest-release.json`
- Electron release runs: `data/electron-release-runs.json`
- Release logs: `ci-logs/electron-release-25630150785.log` and `ci-logs/electron-release-25629042968.log`

## Timeline

- 2026-05-10 13:42 UTC: release `v0.9.6` was published without macOS assets.
- 2026-05-10 13:49 UTC: issue #13 reported that macOS could not be downloaded from <https://konard.github.io/vk-bot-desktop/>.
- 2026-05-10 14:23 UTC: PR #14 was opened as the prepared work branch.

## Root Causes

1. The Electron release workflow treated Apple signing and notarization secrets as mandatory for macOS artifacts. When the secrets were absent, the macOS job uploaded only provenance and no `.dmg` or `.zip` files.
2. The publish job did not require macOS filenames in the final stable asset list, so a release could be considered complete even when the download page had no macOS asset to link.
3. The built-site e2e fixture omitted macOS assets, so the local Pages check did not reproduce the user-visible `Not available in latest release` state.
4. The release verifier used `HEAD` with a short retry window against newly uploaded large release assets. The 2026-05-10 13:37 UTC run uploaded the assets but failed verification with HTTP 404 on the AppImage URL.

## Technical Notes

Electron Builder can build macOS artifacts without discovering Apple signing certificates when `CSC_IDENTITY_AUTO_DISCOVERY=false` is set. For the fallback path, the workflow disables notarization and routes signing through a local custom sign hook that calls `@electron/osx-sign` with the macOS ad-hoc identity `-`.

Ad-hoc signed builds are not notarized. macOS users should still expect Gatekeeper warnings for direct testing, but the DMG can be downloaded and installed without requiring this project to own an Apple Developer account.

## Implemented Plan

1. Keep the existing signed and notarized path when all Apple signing secrets are configured.
2. Add an ad-hoc macOS fallback when those secrets are missing:
   - `CSC_IDENTITY_AUTO_DISCOVERY=false`
   - `-c.mac.notarize=false`
   - `-c.mac.sign=./scripts/adhoc-sign-mac.cjs`
3. Smoke-test macOS DMG and ZIP artifacts in both modes, including bundle identity, executable presence, and code-signature verification.
4. Require stable macOS DMG and ZIP filenames before publishing a GitHub release.
5. Add macOS DMGs to the built-site e2e fixture so a missing macOS release asset fails the Pages test.
6. Replace release URL `HEAD` probes with ranged `GET` checks and stronger retries.

## Verification

The regression coverage is in:

- `tests/desktop-release-workflow.test.js`
- `tests/pages-site.test.js`
- `scripts/adhoc-sign-mac.cjs`
- `scripts/test-pages-e2e.mjs`

The PR should be verified with `npm test`, `npm run build:site`, `npm run test:pages:e2e -- --site-dir site/dist`, and `npm run check`.

## References

- Electron Builder macOS signing documentation: <https://www.electron.build/code-signing-mac.html>
- Electron Builder macOS configuration reference: <https://www.electron.build/electron-builder.interface.macconfiguration>
