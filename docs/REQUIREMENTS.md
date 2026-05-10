# Requirements

This document normalizes the product and release requirements collected from:

- Issue #1: initial `vk-bot-desktop` vision.
- PR #2 comment `4412616546`: additional stats, lifecycle, defaults, and UI
  behavior.
- Issue #3: temporary desktop-only release distribution.
- Issue #6: target-platform installation validation and release download page.
- Issue #20: single JavaScript workflow and synchronized desktop artifact
  publication.
- Issue #22: release workflow skip-cascade prevention for desktop artifact
  publication.
- Issue #24: macOS Gatekeeper first-launch instructions for ad-hoc signed
  builds without an Apple Developer ID.

## Product Scope

`vk-bot-desktop` is a cross-platform React + Electron desktop wrapper around
`konard/vk-bot`. It must run on Linux, Windows, and macOS, and must support both
local bot execution and remote execution over SSH.

## Bot Behavior

1. Keep VK online status while the bot is running.
2. Accept incoming friend requests using stable 10% acceptance logic.
3. Never exceed VK's 10000 friends limit.
4. For the stable acceptance cap, use:
   `floor(total incoming requests seen * 0.10) - total accepted friends`.
5. Keep accepted-friend stats for total, current month, and current week.
6. Store stats in separate Links Notation files under a stats folder, scoped by
   month and week, so updates touch only total/current-month/current-week files.
7. Store the initial friends count.
8. Delete deactivated or blocked friends.
9. Cancel outgoing friend requests when capacity is needed for planned incoming
   acceptances.
10. Preserve priority users: always send outgoing requests to them and never
    delete or cancel them automatically.
11. Seed the priority friends list from current outgoing friend requests, with a
    one-click option to clear it.
12. Post invitation messages to selected communities with the user's avatar.
13. Provide 10 default invitation messages and choose randomly before sending.
14. Send birthday congratulations.
15. Provide 10 short default birthday greetings and choose randomly before
    sending.
16. Keep every bot behavior individually toggleable.

## Configuration And Storage

1. Use Links Notation for config, state, and cache; do not store JSON and do not
   require type markers.
2. Use layered configuration, where local app-folder config overrides global
   user config.
3. Store cache/state in the application folder where appropriate.
4. Use `lino-arguments` for CLI options.
5. Redact tokens, passwords, cookies, and similar secrets from logs.
6. Provide verbose logs by default so users can diagnose bot behavior.

## Execution Modes

1. Local mode must run without Docker.
2. Server mode must connect over SSH and run under Docker or `screen`.
3. Use `link-foundation/start` isolated wrappers for server execution.
4. Use `screen` isolation by default for local and remote bot processes.
5. Starting local mode must stop server mode first.
6. Starting server mode must stop local mode first.
7. Mutual exclusion should be checked through status checks for both local and
   remote runners.
8. Both local and server runners should be stopped by default so users can edit
   settings before starting.

## Desktop UI

1. Use a single desktop window.
2. Provide a mode switch for local/server execution.
3. Provide Start and Stop controls.
4. Show accepted-friend stats at the top of the application window once at least
   one friend has been accepted.
5. Show floating visual confirmations for start/stop and similar actions at the
   top-middle of the viewport.
6. Support light, dark, and automatic system theme.
7. Auto-detect Russian and English language.
8. Provide expandable settings sections so defaults are usable without required
   configuration.
9. Prefill defaults for priority friends, invitation messages, birthday
   messages, and other required settings.

## Release And Distribution

1. For now, skip npm publishing.
2. For now, the only distribution channel is GitHub Releases.
3. GitHub Releases must contain downloadable desktop binaries for every
   platform whose artifacts were successfully built and passed target-platform
   smoke tests.
4. Linux release artifacts must include the configured Electron Builder targets:
   AppImage, deb, and tar.gz.
5. macOS release artifacts, when published, must include the configured Electron
   Builder targets: dmg and zip.
6. Windows release artifacts must include the configured Electron Builder
   targets: nsis and portable executables.
7. Release artifacts must include x64 and arm64 downloads for macOS, Windows,
   and Linux when the target-platform runners can build and smoke-test them.
8. Release artifact filenames must include the application version, platform,
   architecture, and format, for example
   `vk-bot-desktop-macos-arm64-0.9.9.dmg`.
9. Release artifacts must include SHA256 checksums.
10. Release artifacts must include enough provenance to identify repository,
    workflow run, tag, target commit, and builder OS.
11. Release artifacts should be covered by GitHub artifact attestations when
    GitHub Actions supports attestations for the release workflow.
12. The automated release path must run tests before building release artifacts.
13. Version bumps and changelog updates should remain changeset-driven.
14. If a version bump reaches main but artifact publication fails, a later main
    run should retry the GitHub Release without requiring another changeset.
15. Manual release mode should use the same desktop artifact publication path as
    automatic releases.
16. Static documentation should avoid direct latest-download links for versioned
    binary assets; the download page must render direct asset links returned by
    the latest Release API and must not synthesize absent asset URLs.
17. macOS release artifacts must be signed before upload. When an Apple
    Developer ID is configured in CI secrets, builds must be Developer-ID
    signed, notarized, and assessed; otherwise builds must be ad-hoc signed
    (`identity: '-'`, `notarize: false`) so the artifact carries a stable code
    signature even without notarization. Unsigned downloaded DMGs must not be
    published as successful macOS releases.
18. Release jobs should smoke-test installable artifacts on their target
    platform after building and before uploading.
19. A GitHub Pages React download page should detect language, theme, and
    operating system, then fall back to a full OS chooser when detection is
    unavailable. If Release API data is unavailable or a platform asset is not
    attached, the page must not synthesize a direct asset URL.
20. The download page should include expandable checksum/provenance verification
    instructions for regular and advanced users.
21. Release workflow orchestration must keep versioning, desktop artifact
    builds, and GitHub Release publication in `.github/workflows/js.yml`, so
    one workflow result covers the full release path.
22. Silent Windows installer smoke tests must not auto-launch the desktop app
    after install; app launch is a separate runtime behavior from installer
    artifact validation.
23. Release asset validation must derive the expected version from the release
    tag and target commit selected by the workflow, not from a stale checkout in
    the publish job.
24. Desktop artifact build and publication jobs must explicitly handle skipped
    optional release-mode jobs so a workflow run cannot report success after
    versioning a release while skipping the binary build and GitHub Release
    upload path.
25. When macOS release artifacts are ad-hoc signed (no Apple Developer ID
    available), the project must document the first-launch Gatekeeper bypass
    in both the repository README and the GitHub Pages download page. The
    documentation must cover the Terminal `xattr -dr com.apple.quarantine`
    workflow and the macOS 15 Sequoia System Settings → Privacy & Security
    → "Open Anyway" workflow, in both English and Russian on the download
    page, and must remind readers to verify the SHA-256 checksum first.

## Testing And Documentation

1. Unit and integration tests should cover critical bot behavior, configuration,
   release helpers, and workflow contracts where practical.
2. Tests should run across Node.js, Bun, and Deno where the code is portable.
3. CI should run across Linux, Windows, and macOS.
4. UI/end-to-end tests may use the web version of the app and
   `link-foundation/browser-commander` when a browser workflow is needed.
5. Issue work must capture related logs and data in
   `docs/case-studies/issue-{id}`.
6. Case studies should reconstruct timelines, requirements, root causes, and
   solution plans.
7. When root cause cannot be proven from available data, add opt-in debug output
   or verbose tracing for the next iteration.
