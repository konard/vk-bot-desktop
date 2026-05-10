# Issue #24 — "VK Bot Desktop Not Opened" on macOS

## Summary

Users running macOS 15 Sequoia (reported on 15.7.2) cannot launch the
`vk-bot-desktop` 0.9.12 release because Gatekeeper blocks the first launch
with:

> "VK Bot Desktop" Not Opened — Apple could not verify "VK Bot Desktop"
> is free of malware that may harm your Mac or compromise your privacy.

The DMG and ZIP artifacts are already ad-hoc code-signed in CI
(`identity: '-'`, no notarization) because the project does not have an
Apple Developer ID. On macOS 15+, ad-hoc-signed apps that carry the
`com.apple.quarantine` extended attribute are blocked from launching, and
the historical "Control-click → Open" bypass was removed in Sequoia.

This case study explains the root cause, why a full code fix is not
possible without an Apple Developer ID, the user-facing workflow that
unblocks the app, and the documentation/testing changes that ship this
issue.

## Timeline

| When (UTC)           | Event                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-10 12:11     | Release `v0.9.4` published (most recent prior macOS release in the data we captured).                                                                                         |
| 2026-05-10 13:42     | `v0.9.6` released — ad-hoc signing path already in `js.yml`.                                                                                                                  |
| 2026-05-10 20:50     | `v0.9.12` released, both `.dmg` and `.zip` for macOS arm64/x64 (see `latest-release-assets.json`).                                                                            |
| 2026-05-10 ~21:00    | Issue #24 filed with screenshot of the "VK Bot Desktop Not Opened" dialog on macOS 15.7.2.                                                                                    |
| 2026-05-10 (this PR) | Documented the user-side bypass in README, GitHub Pages download page (EN+RU), and REQUIREMENTS.md; added regression tests; recorded provenance under this case study folder. |

## Reproduction

1. Download `vk-bot-desktop-macos-arm64-0.9.12.dmg` (Apple silicon) or
   `vk-bot-desktop-macos-x64-0.9.12.dmg` (Intel) from
   <https://github.com/konard/vk-bot-desktop/releases/tag/v0.9.12>.
2. Open the DMG and drag `VK Bot Desktop.app` into `/Applications`.
3. Double-click the app from `/Applications` or Launchpad.
4. macOS Gatekeeper shows the dialog captured in
   [`screenshots/macos-not-opened.png`](screenshots/macos-not-opened.png).

The block is independent of architecture and reproduces on every macOS 15
machine because the bytes downloaded from GitHub Releases inherit
`com.apple.quarantine`.

## Root cause

1. The project has no Apple Developer ID, so neither the CI nor any
   local build can produce a Developer-ID-signed and notarized DMG.
2. `electron-builder` is configured to fall back to an ad-hoc signature
   (`identity: '-'`, `timestamp: 'none'`) via
   [`scripts/adhoc-sign-mac.cjs`](../../../scripts/adhoc-sign-mac.cjs).
   This produces a stable code signature, but **not** an Apple Notary
   ticket.
3. Browsers and downloads from `https://github.com/.../releases/...`
   write the `com.apple.quarantine` extended attribute on every file.
4. macOS Sequoia 15.0 removed the "Control-click → Open" Gatekeeper
   bypass for quarantined apps. Sequoia 15.1+ tightened this further,
   so a fresh user cannot allow the app from Finder alone.

The CI workflow's macOS step already documents this fallback explicitly
(`.github/workflows/js.yml`):

```yaml
echo "Building ad-hoc signed macOS artifacts without notarization for direct testing."
```

So the failure mode at v0.9.12 is **expected ad-hoc behavior on Sequoia**,
not a regression introduced by a recent release.

## Why we are not upgrading Electron / electron-builder

The issue asks whether bumping Electron and `electron-builder` to the
latest would help.

- `electron@33.x` → `electron@latest` (42.x at the time of this case
  study) introduces breaking changes around notifications and signing
  that require additional CI rework, and **none of those changes alter
  Gatekeeper behavior for ad-hoc signed apps**. Apple's quarantine
  enforcement is keyed to the presence of a notary ticket, not to the
  Electron runtime version.
- `electron-builder@25.x` → `electron-builder@26.x` has reported
  regressions around mac signing scripts. Our current ad-hoc flow is
  exercised in CI and works.

Conclusion: a major-version bump is not justified for this issue. We
should consider it as a separate, dedicated change with its own CI
smoke-test coverage.

## Solution

There is no code change that can turn an ad-hoc-signed build into a
notarized one without an Apple Developer ID. The solution therefore has
two prongs:

1. **Keep the ad-hoc signing path** as already configured in
   `scripts/adhoc-sign-mac.cjs` and `.github/workflows/js.yml`. This
   gives every macOS artifact a stable code signature (verified by the
   workflow's `codesign --display --verbose=2` smoke test which checks
   for `Signature=adhoc`), even without notarization.
2. **Document the user-side bypass** in two places that a user actually
   reads on first install:
   - The repository [`README.md`](../../../README.md) gains an
     "Open the app on macOS" section after the download table.
   - The GitHub Pages download page
     ([`site/App.jsx`](../../../site/App.jsx) and the matching
     [`site/styles.css`](../../../site/styles.css)) gains a bilingual
     (EN + RU) "Open the app on macOS" section with two expandable
     blocks:
     - **Terminal one-liner** (default-open):
       `sudo xattr -dr com.apple.quarantine "/Applications/VK Bot Desktop.app"`
     - **System Settings (macOS 15 Sequoia)**: the three-step "Open
       Anyway" workflow that replaced the removed Control-click bypass.

Both surfaces explicitly remind the reader to verify the SHA-256
checksum from the release's `SHA256SUMS.txt` first.

## Why both bypass options

- The **Terminal one-liner** is the fastest path for power users and
  removes the quarantine attribute in one shot. It is non-destructive
  beyond the local file's extended attribute.
- The **System Settings flow** is the only Apple-supported path for
  users who do not want to open a Terminal. On macOS 15.0+ this is the
  flow Apple now exposes through _Privacy & Security → Open Anyway_,
  which replaced the long-standing Control-click bypass.

## Requirements update

`docs/REQUIREMENTS.md` gets two updates:

- Requirement 17 (Release And Distribution) now explicitly allows
  ad-hoc signing as the fallback when no Apple Developer ID is
  configured in CI secrets.
- New requirement 25 mandates documenting the macOS Gatekeeper
  first-launch workflow in both the README and the Pages download
  page, in English and Russian on the Pages site, with an explicit
  SHA-256 verification reminder.

## Tests

`tests/pages-site.test.js` gains an assertion that the rendered
download page contains the macOS install copy keys
(`installMacosTitle`, `installMacosTerminalTitle`,
`installMacosSettingsTitle`), the literal command
`xattr -dr com.apple.quarantine`, and both the English and Russian
section headings. This catches regressions where a copy refactor
accidentally drops the install instructions.

## Data captured for this issue

- [`issue-24.json`](issue-24.json) — raw GitHub issue payload at time
  of investigation.
- [`issue-24-comments.json`](issue-24-comments.json) — issue comments.
- [`latest-release-before-fix.json`](latest-release-before-fix.json) —
  full v0.9.12 release metadata.
- [`latest-release-assets.json`](latest-release-assets.json) — asset
  list (DMG, ZIP, AppImage, .deb, .tar.gz, .exe, SHA256SUMS,
  BUILD-PROVENANCE).
- [`releases-before-fix.txt`](releases-before-fix.txt) — recent
  releases timeline.
- [`screenshots/macos-not-opened.png`](screenshots/macos-not-opened.png)
  — the Gatekeeper dialog as seen by users.
- [`screenshots/pages-install-macos-en.png`](screenshots/pages-install-macos-en.png)
  — full rendering of the download page in English with the new
  "Open the app on macOS" section visible.
- [`screenshots/pages-install-macos-ru.png`](screenshots/pages-install-macos-ru.png)
  — same view in Russian.

## Follow-ups (out of scope here)

- When an Apple Developer ID becomes available, wire it through the
  `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_API_KEY`,
  `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` secrets that the workflow
  already reads. The workflow will automatically switch from the
  ad-hoc path to the notarized path with no further code changes.
- Consider a separate Electron/electron-builder major-version bump
  with its own dedicated smoke-test coverage.
- Consider injecting the macOS install hint into the GitHub Release
  body via `scripts/format-release-notes.mjs`.
