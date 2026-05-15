# Changelog

## 0.12.1

### Patch Changes

- 596174f: Issue #55 — Global VK API throttle and lossless avatar attachment:
  - `src/bot/vk-rate-limit.js` (new) implements a process-wide pacing barrier
    for every VK API request, picking a random delay per call: **3000–7000 ms**
    for reads (methods whose local name starts with `get` / `search` / `is` /
    `are` / `look`) and **6000–13 000 ms** for writes (everything else, so we
    err on the safer side for unknown methods). The barrier is a single
    Promise chain, so concurrent triggers can never bypass it.
  - `src/bot/vk-client.js` now wraps every `APIRequest.prototype.make`
    invocation through that throttle (verbose mode on or off). Tests can inject
    `hook.throttle: (m, fn) => fn()` to bypass the real wait.
  - `src/bot/triggers/send-invitation-posts.js` no longer downloads or uploads
    the avatar. A new `getActiveAvatarAttachment` helper reads the user's
    current `photo_id` (`users.get(fields: 'photo_id')`) and its `access_key`
    (`photos.getById`) and builds `photo<owner>_<id>[_<access_key>]`. Likes
    therefore accumulate on a single canonical photo across reposts, matching
    the upstream `konard/vk-bot` behaviour referenced by the issue but working
    for any user, not just the original author.
  - Redundant per-trigger inline `await sleep(...)` calls are removed from
    `accept-friend-requests.js`, `delete-deactivated-friends.js`,
    `delete-outgoing-friend-requests.js`, `send-birthday-congratulations.js`,
    and `send-invitation-posts.js` (the global throttle is now the source of
    truth). The 60-second error backoffs on captcha / rate-limit / internal
    errors are kept.
  - `tests/vk-rate-limit.test.js` covers classification, delay ranges,
    first-call-no-wait, read-after-write delay choice, concurrent
    serialisation, throw-safety, and `reset()`.
  - `tests/send-invitation-posts.test.js` covers `getActiveAvatarAttachment`
    (access-key present, access-key missing, photo lookup throws, no avatar
    set, users.get throws, correct `user_ids: 0` + `photo_id` field).
  - `docs/case-studies/issue-55/` collects the upstream `konard/vk-bot`
    snapshots, requirements list, root-cause analysis, library survey,
    and per-trigger interval verification (already matches upstream).

## 0.12.0

### Minor Changes

- Issue #51 — Auto-regenerate preview images on release:
  - New `scripts/update-preview-images.mjs` drives `browser-commander` +
    Playwright to recapture the four locale × theme preview tiles
    (`site/assets/app-preview-{en,ru}-{light,dark}.png`), the share-image
    fallback (`site/assets/app-preview.png`), and the README landing image
    (`docs/screenshots/issue-26-pages-en-dark.png`). Exposed as
    `npm run preview:update`. Honours `PREVIEW_VERBOSE=1` for diagnostic
    logging on CI.
  - New `preview-regen` job in `.github/workflows/js.yml` runs on push to
    `main`, on release tag pushes (`refs/tags/v*`), and on
    `workflow_dispatch` with `release_mode=checks`. It regenerates the
    images and, on drift, commits them back to `main` with `[skip ci]`.
  - Hoists `flushSave` + `applyAndSave` declarations in
    `electron/renderer/App.jsx` so the `onResetToken` / `onClearPriority` /
    `onResetInvitationMessages` (and siblings) `useCallback` deps no longer
    trigger a temporal-dead-zone error at render time.
  - Adds case study at `docs/case-studies/issue-51/` documenting the
    inventory, root-cause analysis, link-foundation template parity survey,
    and acceptance criteria.

  Issue #53 — Harden the release pipeline so a broken release cannot publish
  silently:
  - `scripts/version-and-commit.mjs` now checks the exit code of every
    awaited `command-stream` invocation (`assertOk`), stashes and pops local
    tracked changes around `git rebase origin/main`, retries `git push` on
    non-fast-forward with `git pull --rebase` (up to 3 attempts), verifies
    `git rev-parse HEAD == git rev-parse origin/main` after the push, and
    emits a `committed_sha` GitHub Actions output from all terminal paths.
  - `.github/workflows/js.yml` consumes `steps.version.outputs.committed_sha`
    for both `release.release_target` and `instant-release.release_target`,
    falling back to `origin/main` only on the `skip_bump` path. The
    `preview-regen` job is now ordered `needs: [release, instant-release]`
    with a `!cancelled()` gate so the two jobs can never race to push to
    `main` in the same workflow run.
  - `tests/version-and-commit-guards.test.js` adds a regression net for
    every invariant above (script-side and workflow-side).
  - `docs/case-studies/issue-53/` collects the full timeline, root causes,
    fix plan, CI logs, vendored snapshots of the four link-foundation
    AI-pipeline templates with a per-bug comparison matrix, and drafted
    upstream issues for the `js` and `python` templates affected by the
    same silent-failure bug.

## 0.11.0

### Minor Changes

- f2cdcdb: Issue #49 bundle:
  - Invitation posts now attach the active VK avatar dynamically, cache sent
    post IDs per community in a `.lino` file, skip the run when the cached
    post is still in the community's top 10, and delete the previous
    invitation post after publishing the next one.
  - All "Reset to default" and "Clear" buttons now persist the new state
    immediately and show a toast notification instead of silently no-opping
    when the form already matched the defaults.
  - Triggers that hit VK error code 3 ("Unknown method passed") now halt
    for the cycle and report `account.getAppPermissions` instead of looping
    forever.
  - Auto-accept friend requests respects existing outgoing requests and
    stops on code 3.
  - Birthday congratulations are skipped when the user already had a
    conversation with the recipient in the last 24 hours.
  - New "Clear log" button next to "Copy log".
  - New "Verbose log" toggle in the log section that gates debug-level
    output through `setVerbose` in the bot runner.
  - Renderer dictionary gains the new strings in both English and Russian
    with parity enforced by a test.

## 0.10.2

### Patch Changes

- 9cbf3b7: Fix Windows desktop release smoke-test PowerShell interpolation so CI can
  validate Windows artifacts.

## 0.10.1

### Patch Changes

- ec33b4a: Fix Windows ARM64 release smoke testing so GitHub-hosted ARM runners validate generated artifacts without launching the NSIS installer path that exits with an access violation.

## 0.10.0

### Minor Changes

- 235f4f5: Issue #41: UI overhaul (centered Start button with state emoji, two-column
  feature layout, ✓/✗ token validity badge, masked token field with Get / Reset
  buttons, auto-save with debounce, reorganized header), gender-neutral default
  invitation messages, birthday greetings always containing «с днём рождения»,
  prefilled invitation communities and priority friend IDs on first connect,
  robust list parser accepting commas/semicolons/spaces/newlines plus VK links,
  and raw VK API request/response logging in verbose mode to capture evidence
  for the long-standing `APIError Code 3 "Unknown method passed"`.

## 0.9.22

### Patch Changes

- 1aa40a7: Normalize array-shaped bot config fields loaded from Links Notation so empty invitation communities no longer crash the invitation-post trigger.

## 0.9.21

### Patch Changes

- 0c27537: Fix local-mode deactivated-friend cleanup when persisted config contains empty
  priority-list values, and add a desktop log-copy button.

## 0.9.20

### Patch Changes

- da4071d: Replace the rejected localhost VK OAuth redirect with an embedded Electron
  authorization window that captures the `oauth.vk.com/blank.html` token redirect
  automatically.

## 0.9.19

### Patch Changes

- 3c0e480: Fix landing page screenshot assets in the deployed site build.

## 0.9.18

### Patch Changes

- 7054a12: Add macOS Gatekeeper screenshots to README and the download page.

## 0.9.17

### Patch Changes

- 5d56458: Fix bot exiting immediately after first scheduled trigger and improve
  error visibility (issue #32):
  - `src/bot/runner.js`: stop calling `.unref()` on `scheduleEvery` timer
    handles. The forked bot child used to exit with code 0 right after the
    first trigger fired, because every timer was `unref()`'d. Each trigger
    invocation now emits `debug` lifecycle lines mirroring konard/vk-bot's
    `executeTrigger`. The direct-run entry point now opens a per-session
    log file.
  - `src/bot/logger.js`: pretty-print object arguments with two-space
    indentation so VK API errors and other structured payloads are
    readable in the run log. Verbose mode is on by default and can be
    disabled with `VK_BOT_DESKTOP_VERBOSE=0`.
  - `src/bot/triggers/set-online-status.js`: log the raw VK error
    verbatim. No speculative wording is added; we couldn't prove a root
    cause without a clean-room reproduction, so we'll gather verbose logs
    on the next occurrence instead.
  - `src/bot/session-log.js` (new): persist each session's redacted log
    under `<globalDir>/logs/<timestamp>-<pid>.log` so bug reports can
    ship raw evidence.

## 0.9.16

### Patch Changes

- 0d9f29c: Pass `GH_TOKEN` to the post-deploy GitHub Pages smoke test step in `.github/workflows/js.yml` so the GitHub Release API call inside `scripts/test-pages-e2e.mjs` runs authenticated. Without the token, hosted runners share the 60/hr unauthenticated IP-pool quota and the post-deploy smoke test intermittently fails with `Release request failed: 403`, marking the run as failed even when Pages itself deployed correctly. Also print the `x-ratelimit-*` headers, authentication state, and truncated response body on failure so future 403 regressions are diagnosable from the workflow log without re-running.

## 0.9.15

### Patch Changes

- 6e7e2b4: Always rebuild and republish the GitHub Pages download page on every push to `main` and every release tag, so the published page never goes stale relative to the latest GitHub Release. Fix `scripts/detect-code-changes.mjs` to select its git diff strategy from `$GITHUB_EVENT_NAME` instead of HEAD's parent count, so a real "Merge pull request" landing on `main` is no longer misclassified as a `pull_request` synthetic merge commit. Add an opt-in `CI_DETECT_VERBOSE` debug mode for after-the-fact diagnosis.

## 0.9.14

### Patch Changes

- d427531: Add VK token acquisition helpers, desktop run-status controls, localized app preview screenshots, and browser-based download verification.

## 0.9.13

### Patch Changes

- b9c9600: Document macOS Gatekeeper first-launch bypass for ad-hoc signed releases in the README and the GitHub Pages download page (English and Russian). Covers the Terminal `xattr -dr com.apple.quarantine` workflow and the macOS 15 Sequoia System Settings → Privacy & Security → Open Anyway workflow.

## 0.9.12

### Patch Changes

- 9da9655: Fix desktop release workflow orchestration so binary build and GitHub Release upload jobs still run after optional release modes are skipped.

## 0.9.11

### Patch Changes

- 45816dd: Fix desktop release publishing by resolving the release tag and target commit in the JavaScript CI workflow before building and validating release artifacts.

## 0.9.10

### Patch Changes

- c4bddbd: Fail parent release jobs when the dispatched Electron release workflow fails and keep Windows installer smoke tests from auto-launching the app after silent install.

## 0.9.9

### Patch Changes

- edb6d0c: Fix Linux desktop release publishing by using system FPM for native arm64
  Debian builds and normalizing Linux AppImage/deb filenames before release
  validation.

## 0.9.8

### Patch Changes

- 58bdacf: Add versioned desktop release filenames, arm64 Windows/Linux downloads, and expanded download verification guidance.

## 0.9.7

### Patch Changes

- 8d84a55: Build ad-hoc signed macOS release artifacts when Apple signing and notarization secrets are not configured.

## 0.9.6

### Patch Changes

- e66dd38: Stop the Pages download site and static docs from linking to missing release assets, and verify published release links in CI.

## 0.9.5

### Patch Changes

- 5e950f7: Fix Linux desktop release artifact names so the published AppImage and Debian
  package match the documented stable latest-download links.

## 0.9.4

### Patch Changes

- 636d18a: Fix Electron release publishing after CI build validation and add Pages browser e2e checks.

## 0.9.3

### Patch Changes

- f646a36: Validate desktop release installers on target platforms and add the GitHub Pages download site.

## 0.9.2

### Patch Changes

- 3ba96e6: Fix Electron release artifact builds by adding Linux deb maintainer metadata and hashing Linux/macOS artifact filenames safely.

## 0.9.1

### Patch Changes

- 6cfc3f1: Temporarily skip npm publishing and publish desktop binaries through GitHub Releases.

## 0.9.0

### Minor Changes

- 973c124: Initial release of vk-bot-desktop, a cross-platform Electron + React wrapper for `konard/vk-bot`.
  - Single-window UI with mode switch (local / SSH+Docker server), Start/Stop control, light/dark/auto theme, en/ru i18n auto-detection.
  - Six default behaviours from vk-bot: keep online, auto-accept friend requests with the top-10% mutual rule (mutuals-only above 10000 friends), delete deactivated friends, cancel outgoing requests, post invitation messages with the user avatar, and birthday greetings.
  - Layered configuration in Links Notation (`lino-objects-codec`) with local-folder-overrides-global, plus cache and state in the same format.
  - CLI options via `lino-arguments` (`--token`, `--mode`, `--config`).
  - Server mode generates an idempotent install script that uses `link-foundation/start`'s `$` wrapper to run the bot under `--isolated docker` or `--isolated screen`.
  - Verbose logging by default with token/password/cookie redaction across logs and IPC.
  - GitHub Actions workflow that builds Electron artifacts for Linux, macOS and Windows on tag pushes and uploads them with a `SHA256SUMS.txt` for verification.

  Stats, stable acceptance rate, and configurable defaults:
  - Persistent stats in `stats/` (total + per-month + per-week ISO files), with the in-app banner showing accepted-friends counters once the bot has accepted at least one request.
  - Records initial friends count on first run.
  - Stable 10% acceptance rule: `floor(totalIncomingSeen * 0.10) - totalAcceptedEver` capped by remaining capacity (10 000 friends) and the per-run limit.
  - Outgoing friend requests are only cancelled when capacity is required for incoming acceptance, never for users on the priority list.
  - Mutual exclusion across local and server: starting one mode stops the other (`$ --status` / `$ --stop`). Default isolation is `screen` on both sides.
  - Floating mid-viewport notifications confirm Start/Stop/Switch actions.
  - Settings split into expandable sections that ship with sensible defaults: 10 random invitation messages, 10 random birthday greetings, and a one-click "fill from current outgoing requests" button for the priority list.

## 0.8.6

### Patch Changes

- acccf75: Format GitHub release names as human-readable `[Language] x.y.z` titles while keeping prefixed tag names unchanged.

## 0.8.5

### Patch Changes

- Fail GitHub release creation on unexpected gh api errors and clearly skip releases that already exist.

  Enforce npm and Node.js minimum versions for trusted publishing setup and resolve a supported npm 11 tarball for fallback installs.

## 0.8.4

### Patch Changes

- 031f7cd: Add explicit CI job timeouts and per-test runner timeout limits.

## 0.8.3

### Patch Changes

- bdaa4b7: Derive release script package names from package.json instead of template placeholders.

## 0.8.2

### Patch Changes

- d179bb7: Add warning annotations for files approaching the CI file line limit.

## 0.8.1

### Patch Changes

- f0c69af: Normalize language-prefixed release tags before building npm shields.io badge URLs.

## 0.8.0

### Minor Changes

- 3e45a9c: Add `--tag-prefix` option to release scripts for multi-language repos

  The `create-github-release.mjs` and `format-github-release.mjs` scripts now accept a `--tag-prefix` CLI parameter (defaulting to `v`) that allows users to customize the git tag prefix. This enables use in multi-language repositories where different language packages need distinct tag prefixes (e.g., `js-v1.0.0` vs `rust-v1.0.0`).

## 0.7.3

### Patch Changes

- ae2cc9a: Add self-healing release mechanism that checks npm registry for unpublished versions

## 0.7.2

### Patch Changes

- 9126e16: fix: npm upgrade fallbacks and Node.js 24.x upgrade for CI/CD
  - Upgrade Node.js from 20.x to 24.x in all workflow files (avoids broken npm in Node.js 22.22.2)
  - Add 4-strategy fallback chain to setup-npm.mjs (standard, curl tarball, npx, corepack)
  - Update GitHub Actions to latest versions (checkout v6, setup-node v6, create-pull-request v8)
  - Add case study documentation for issue #33

## 0.7.1

### Patch Changes

- 6916409: Use per-commit diff instead of full-PR diff for CI change detection

## 0.7.0

### Minor Changes

- 983789a: Add CI/CD best practices from hive-mind: fast-fail job ordering, test compilation, file line limits check, secrets detection, documentation validation, extracted fresh merge simulation script, and proper cancellation propagation

## 0.6.0

### Minor Changes

- 8961862: Add automated broken link checker with Web Archive fallback suggestions
  - Add `.github/workflows/links.yml` with lychee-action for link checking in Markdown and HTML files
  - Add `scripts/check-web-archive.mjs` to check broken links against the Wayback Machine API
  - Add `.lycheeignore` for excluding known false-positive URLs (localhost, example.com, etc.)
  - Update `README.md` to document the broken link checker feature
  - Scheduled weekly check (Mondays at 09:00 UTC) to catch links that break over time
  - On PRs, broken links with no Web Archive fallback will fail the check
  - For broken links that have archived versions, provides actionable replacement suggestions
  - On scheduled runs, automatically creates a GitHub Issue with the full broken links report

  Fixes #27

## 0.5.1

### Patch Changes

- e398190: Add comprehensive best practices comparison and improve CI concurrency
  - Add DETAILED-COMPARISON.md with side-by-side analysis of ALL scripts, workflows, and configurations
  - Implement cancel-in-progress for main branch concurrency (hive-mind Issue #1274 fix)
  - Fix max-lines documentation (1500, not 1000)
  - Reference detailed comparison from BEST-PRACTICES.md

## 0.5.0

### Minor Changes

- 66211b5: Add fresh merge simulation to CI/CD to prevent stale merge preview issues
  - Add "Simulate fresh merge with base branch" step to lint and test jobs
  - This ensures PR CI validates the actual merge result, not a stale snapshot
  - Prevents CI failures on main branch after merging PRs that sat open for days
  - Add case study documentation for issue #23 with root cause analysis
  - Add ignore patterns for case study data files in ESLint and Prettier

  See docs/case-studies/issue-23 for detailed analysis of the stale merge preview problem.

  Fixes #23

## 0.4.0

### Minor Changes

- e6c2691: Add multi-language repository support for CI/CD scripts
  - Add `scripts/js-paths.mjs` utility for automatic JavaScript package root detection
  - Support both `./package.json` (single-language) and `./js/package.json` (multi-language repos)
  - Add `--legacy-peer-deps` flag to npm install commands in release scripts to fix ERESOLVE errors
  - Save and restore working directory after `cd` commands to fix `command-stream` library's `process.chdir()` behavior
  - Add case study documentation with root cause analysis in `docs/case-studies/issue-21/`

## 0.3.0

### Minor Changes

- 80d9c84: Add CI check to prevent manual version modification in package.json
  - Added `check-version.mjs` script that detects manual version changes in PRs
  - Added `check-changesets.mjs` script to check for pending changesets (converted from inline shell)
  - Added `version-check` job to release.yml workflow
  - Automated release PRs (changeset-release/_ and changeset-manual-release-_) are automatically skipped

## 0.2.2

### Patch Changes

- 9a12139: Fix CI/CD check differences between pull request and push events

  Changes:
  - Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
  - Make lint job independent of changeset-check (runs based on file changes only)
  - Allow docs-only PRs without changeset requirement
  - Handle changeset-check 'skipped' state in dependent jobs
  - Exclude `.changeset/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

## 0.2.1

### Patch Changes

- 55aef41: Make Bun the primary runtime choice throughout the template
  - Update all shebangs from `#!/usr/bin/env node` to `#!/usr/bin/env bun` in scripts, experiments, and case studies
  - Update README.md to prioritize Bun in all sections (features, development, runtime support, package managers, scripts reference)
  - Update examples to list Bun first
  - Bun now described as "Primary runtime with highest performance" and "Primary choice" for package management
  - Maintains full compatibility with Node.js and Deno

## 0.2.0

### Minor Changes

- d3f7fcd: Improve changeset CI/CD robustness for concurrent PRs
  - Update validate-changeset.mjs to only check changesets ADDED by the current PR (not pre-existing ones)
  - Add merge-changesets.mjs script to combine multiple pending changesets during release
  - Merged changesets use highest version bump type (major > minor > patch) and combine descriptions chronologically
  - Update release workflow to pass SHA environment variables and add merge step
  - Add comprehensive case study documentation for the CI/CD improvement
  - This prevents PR failures when multiple PRs merge before a release cycle completes

## 0.1.4

### Patch Changes

- e9703b9: Add ESLint complexity rules with reasonable thresholds

## 0.1.3

### Patch Changes

- 0198aaa: Add case study documentation comparing best practices from effect-template

  This changeset adds comprehensive documentation analyzing best practices from
  ProverCoderAI/effect-template repository, identifying gaps in our current setup,
  and providing prioritized recommendations for improvements.

  Key findings include missing best practices like code duplication detection (jscpd),
  ESLint complexity rules, VS Code settings, and test coverage thresholds.

## 0.1.2

### Patch Changes

- 2ea9b78: Enforce strict no-unused-vars ESLint rule without exceptions. All unused variables, arguments, and caught errors must now be removed or used. The `_` prefix no longer suppresses unused variable warnings.

## 0.1.1

### Patch Changes

- 042e877: Fix GitHub release formatting to support Major/Minor/Patch changes

  The release formatting script now correctly handles all changeset types (Major, Minor, Patch) instead of only Patch changes. This ensures that:
  - Section headers are removed from release notes
  - PR detection works for all release types
  - NPM badges are added correctly

## 0.1.0

### Minor Changes

- 65d76dc: Initial template setup with complete AI-driven development pipeline

  Features:
  - Multi-runtime support for Node.js, Bun, and Deno
  - Universal testing with test-anywhere framework
  - Automated release workflow with changesets
  - GitHub Actions CI/CD pipeline with 9 test combinations
  - Code quality tools: ESLint + Prettier with Husky pre-commit hooks
  - Package manager agnostic design

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
