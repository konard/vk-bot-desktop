# Changelog

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
