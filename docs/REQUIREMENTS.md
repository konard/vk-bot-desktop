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
- Issue #28: GitHub Pages download page must republish on every main push and
  every release tag push, even when no `site/` files changed; CI change
  detection must distinguish real merge commits on `main` from `pull_request`
  synthetic merge commits.
- Issue #39: local-mode deactivated-friend cleanup must tolerate empty
  persisted priority lists, and the desktop log panel must provide one-click
  log copying.

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
17. The bot runner must keep the Node event loop alive while triggers are
    scheduled; scheduling helpers must not `.unref()` their timer handles
    (regression from issue #32 — bot exited with code 0 after the first
    trigger).
18. The bot must log verbosely by default during the early iterations of
    the project, so users don't have to enable a flag before filing a bug
    report. `VK_BOT_DESKTOP_VERBOSE=0` opts out (see issue #32).
19. Each bot session must persist its own copy of the redacted log under
    the application directory (`<globalDir>/logs/<timestamp>-<pid>.log`),
    regardless of whether the session succeeds or fails, so reporters can
    attach raw evidence instead of a screenshot (issue #32).
20. Trigger lifecycle must be observable in verbose mode — each trigger
    invocation logs a `Checking for '<name>' trigger...` line before the
    call and a `'<name>' trigger executed in N ms` line on success,
    mirroring the `executeTrigger` pattern used by `konard/vk-bot`.
21. Priority-list handling must be defensive at the config and trigger
    boundaries: empty or legacy Links Notation list values must not crash
    deactivated-friend deletion, outgoing-request cancellation, or priority
    send-list selection.

## Configuration And Storage

1. Use Links Notation for config, state, and cache; do not store JSON and do not
   require type markers.
2. Use layered configuration, where local app-folder config overrides global
   user config.
3. Store cache/state in the application folder where appropriate.
4. Use `lino-arguments` for CLI options.
5. Redact tokens, passwords, cookies, and similar secrets from logs.
6. Provide verbose logs by default so users can diagnose bot behavior.
7. Config list fields loaded from Links Notation must normalize empty,
   scalar, and legacy bare-key shapes before being merged with defaults.

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
10. The log panel must provide a copy button that copies the visible log text
    through the desktop clipboard bridge.

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
26. Every push to `main` must rebuild and republish the GitHub Pages
    download page, so the published page is never stale relative to the
    latest GitHub Release. Republishing must NOT be gated on whether the
    push touched `site/` files, because release-tag and main-branch pushes
    can change the latest-release contents without touching the site source.
27. Every push of a release tag matching `refs/tags/v*` must rebuild and
    republish the GitHub Pages download page for the same reason.
28. Pull-request runs may keep Pages build/deploy gated on a file-level
    change-detection signal so unrelated PRs do not pay the deploy cost.
29. CI change detection (`scripts/detect-code-changes.mjs`) must select its
    git diff strategy from `$GITHUB_EVENT_NAME`, not from the parent count
    of `HEAD`. A real merge commit landed on `main` via the "Merge pull
    request" button has two parents but is a `push` event, and must be
    compared with `HEAD^..HEAD` (first-parent diff). Only `pull_request`
    events with multi-parent HEADs use the synthetic-merge `HEAD^2^..HEAD^2`
    diff.
30. CI change detection must support an opt-in verbose mode
    (`CI_DETECT_VERBOSE=1` or `--verbose`) that prints the event name, ref,
    parent count, and chosen diff command, so misclassified runs can be
    diagnosed from the workflow log without re-running.
31. The post-deploy GitHub Pages smoke test must call the GitHub Release
    API with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` set on the workflow
    step, so the request runs authenticated. Hosted runners share a
    60/hr IP-pool quota for unauthenticated requests; authenticated
    requests get the 5000/hr per-token quota. Without the token the
    smoke test intermittently fails with `Release request failed: 403`
    after a successful Pages deploy, marking the workflow run as failed
    even though the page itself was published correctly (issue #28
    follow-up; run `25668347176`).
32. When the GitHub Release API call fails, the smoke test must print
    the rate-limit headers (`x-ratelimit-*`), whether the request was
    authenticated, and the truncated response body to standard error,
    so a future regression is diagnosable from the workflow log without
    re-running.

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
8. Workflow-contract tests must lock in the conditions under which the
   GitHub Pages site is built and deployed (every main push, every release
   tag push, and changed-files-only for pull requests), so a future workflow
   refactor cannot silently re-introduce the issue #28 regression.
9. The CI change-detection script must have unit tests that exercise the
   three real-world commit shapes: plain non-merge push commit, real merge
   commit on `main` from a "Merge pull request" landing, and `pull_request`
   synthetic merge commit. The tests must run against temporary git
   fixtures so regressions in diff-strategy selection fail locally and in
   CI, not only after a real Pages deploy is silently skipped.
