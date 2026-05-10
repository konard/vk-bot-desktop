# Issue 8 Case Study: Electron Release Did Not Publish

## Summary

Issue: https://github.com/konard/vk-bot-desktop/issues/8

PR 7 merged successfully at `2026-05-10T09:47:09Z`, then the release
automation bumped `package.json` to `0.9.3` on main. The follow-up
`Electron release` workflow failed at `2026-05-10T09:51:38Z`, so the latest
GitHub Release stayed at `v0.9.2` from `2026-05-09T20:22:59Z`.

## Captured Data

- `data/issue-8.json` and `data/issue-8-comments.json`: issue details.
- `data/pr-7.json` and `data/pr-9.json`: related pull request context.
- `data/recent-runs.json`: recent workflow runs around the failure.
- `data/releases-before-fix.txt`: release list before this fix.
- `data/electron-release-25625660967.json`: failed workflow metadata.
- `ci-logs/electron-release-25625660967.log`: failed workflow log.
- `data/*-workflow-script-files.txt`: CI/CD template workflow and script
  inventories for JavaScript, Rust, Python, and C# templates.
- `data/link-foundation-code-search.txt`: related code search results.

## Requirements Reconstructed

1. Restore GitHub Release publishing after the PR 7 release workflow failure.
2. Preserve signed/notarized macOS artifact policy: do not publish unsigned DMGs.
3. Keep Linux, Windows, checksum, and provenance artifact publishing working.
4. Keep stable direct latest-download filenames for README and Pages links.
5. Add browser-level GitHub Pages checks with `link-foundation/browser-commander`
   before deployment and after the published Pages URL is available.
6. Preserve data and logs for a reproducible case study.
7. Compare CI/CD template practices and report upstream only if the same issue is
   present there.

## Timeline

- `2026-05-10T09:47:09Z`: PR 7 merged into `main`.
- `2026-05-10T09:47:12Z`: `Checks and release` started on merge commit
  `81c5d9d`.
- `2026-05-10T09:51:38Z`: dispatched `Electron release` run `25625660967`
  started on version commit `8838b3c`.
- `2026-05-10T09:52:11Z`: Linux build failed while validating
  electron-builder configuration.
- `2026-05-10T09:51:58Z`: macOS build failed because signing/notarization
  secrets were absent.
- `2026-05-10T09:53:54Z`: Windows build failed on the same electron-builder
  configuration error.
- `2026-05-10T09:53:57Z`: publish job was skipped because matrix builds failed.

## Root Causes

### Unsupported electron-builder `tar` config

`package.json` used a top-level `build.tar.artifactName`. Electron-builder
25.1.8 rejected that key. The failed log shows:

- Linux: `configuration has an unknown property 'tar'` in
  `ci-logs/electron-release-25625660967.log:389`.
- Windows: the same error in
  `ci-logs/electron-release-25625660967.log:173`.

Electron-builder documents `artifactName` as a common platform-specific option,
and the valid root keys listed in the failure include `linux`, `appImage`, and
`deb`, but not `tar`.

### Missing macOS signing secrets blocked the whole release

The macOS job intentionally rejected unsigned release artifacts, but because the
job failed inside the shared build matrix, Linux and Windows artifacts could not
be published either. The log shows missing `MAC_CSC_LINK`,
`MAC_CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and
`APPLE_API_ISSUER` at
`ci-logs/electron-release-25625660967.log:594`.

The desired policy is stricter and narrower: skip macOS artifacts when signing
is not configured, but still publish the signed-policy-safe non-macOS artifacts.

### Pages lacked browser e2e checks

`pages.yml` built and deployed the React site, and unit tests inspected static
source, but no real browser loaded the built site before deploy or the
published Pages URL after deploy.

## Fix Plan

1. Move Linux tar.gz artifact naming to `build.linux.artifactName` and remove
   unsupported `build.tar`.
2. Add a regression test that fails if `build.tar` reappears.
3. Change the macOS signing check to produce a warning and skip macOS build,
   smoke, and checksum steps when secrets are absent.
4. Keep provenance uploaded from the macOS matrix entry so logs and release
   metadata explain that macOS artifacts were skipped.
5. Add a `browser-commander` Pages e2e script that can test either local
   `site/dist` or a deployed URL.
6. Run the Pages e2e script in `pages.yml` before deploy and after deploy.
7. Add a changeset so the next merge creates a new release attempt.

## Template Comparison

The JavaScript, Rust, Python, and C# CI/CD templates were checked for workflow
and script inventory. The same electron-builder `tar` issue was not present in
those templates; the searched template code did not contain matching
electron-builder release configuration. No upstream template issue was opened.

## External References

- Electron-builder configuration: https://www.electron.build/configuration.html
- Electron-builder Linux targets: https://www.electron.build/linux
- Browser Commander: https://github.com/link-foundation/browser-commander
