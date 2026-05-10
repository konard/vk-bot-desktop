# Requirements

This document normalizes the product and release requirements collected from:

- Issue #1: initial `vk-bot-desktop` vision.
- PR #2 comment `4412616546`: additional stats, lifecycle, defaults, and UI
  behavior.
- Issue #3: temporary desktop-only release distribution.
- Issue #6: target-platform installation validation and release download page.

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
3. GitHub Releases must contain downloadable desktop binaries for Linux,
   Windows, and macOS.
4. Linux release artifacts must include the configured Electron Builder targets:
   AppImage, deb, and tar.gz.
5. macOS release artifacts must include the configured Electron Builder targets:
   dmg and zip.
6. Windows release artifacts must include the configured Electron Builder
   targets: nsis and portable executables.
7. Release artifacts must include SHA256 checksums.
8. Release artifacts must include enough provenance to identify repository,
   workflow run, tag, target commit, and builder OS.
9. The automated release path must run tests before dispatching release builds.
10. Version bumps and changelog updates should remain changeset-driven.
11. If a version bump reaches main but artifact publication fails, a later main
    run should retry the GitHub Release without requiring another changeset.
12. Manual release mode should use the same desktop artifact publication path as
    automatic releases.
13. Release artifact names should remain stable so
    `/releases/latest/download/...` links work from documentation and the
    download page.
14. macOS release artifacts must be signed, notarized, and assessed before
    upload; unsigned downloaded DMGs must not be published as successful macOS
    releases.
15. Release jobs should smoke-test installable artifacts on their target
    platform after building and before uploading.
16. A GitHub Pages React download page should detect language, theme, and
    operating system, then fall back to a full OS chooser when detection or
    release API access is unavailable.

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
