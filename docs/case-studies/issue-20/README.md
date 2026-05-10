# Issue #20 Case Study

## Summary

Issue #20 investigated a failed CI/CD release on May 10, 2026. The parent
`Checks and release` workflow successfully bumped `vk-bot-desktop` from
`0.9.9` to `0.9.10`, then dispatched the separate `Electron release` workflow.
The child workflow built all `0.9.10` desktop artifacts, but the publish job
checked out the old workflow head and validated assets against the stale
`package.json` version.

The fix is to run JavaScript CI, Pages, link checks, release versioning,
desktop builds, and release publishing from `.github/workflows/js.yml`. Release
asset validation now derives the expected artifact version from the resolved
release tag instead of from the publish checkout.

## Evidence

- Parent failed run: `docs/case-studies/issue-20/data/run-25637300571.json`
- Parent logs: `docs/case-studies/issue-20/ci-logs/run-25637300571.log`
- Child failed run:
  `docs/case-studies/issue-20/data/electron-release-run-25637420584.json`
- Child logs:
  `docs/case-studies/issue-20/ci-logs/electron-release-run-25637420584.log`
- Reproducing test before fix:
  `docs/case-studies/issue-20/data/reproducing-release-asset-validation-test-before-fix.txt`
- Referenced workflow templates:
  - `docs/case-studies/issue-20/data/js-template-release.yml`
  - `docs/case-studies/issue-20/data/js-template-links.yml`
  - `docs/case-studies/issue-20/data/rust-template-release.yml`
  - `docs/case-studies/issue-20/data/deep-sdk-tree.json`

## Timeline

1. The parent run checked out `b18cf8019e37a7a070801927367cc6db6de06ec0`.
2. The release job committed `82fcdc544759fd107939e35aa9bdad1e9ef9bea9` with
   version `0.9.10`.
3. The parent dispatched `electron-release.yml` with `tag=v0.9.10` and
   `target_sha=82fcdc544759fd107939e35aa9bdad1e9ef9bea9`.
4. The child build jobs checked out the target SHA and produced versioned
   `0.9.10` Linux, macOS, and Windows artifacts.
5. The child publish job checked out the child run head (`b18cf80`) and ran
   `VERSION="$(node -p "require('./package.json').version")"`.
6. Asset validation failed even though `dist/` listed all expected `0.9.10`
   artifacts, because the validation step was looking for the stale package
   version from the publish checkout.

The decisive log lines are in the parent log around the dispatch command
(`tag=v0.9.10`, `target_sha=82fcdc...`) and in the child log around publish
checkout, `dist/` listing, and `Validate versioned release asset names`.

## Root Cause

The release contract was split across two workflows with two different
checkout contexts:

- The child build matrix used the requested `target_sha`.
- The child publish job used the workflow run head checkout.
- The publish job derived expected asset names from `package.json` in that
  checkout.

That made asset validation sensitive to a stale checkout instead of the release
tag that the parent workflow had already resolved.

## Solution

- Consolidated workflow entry points into `.github/workflows/js.yml`.
- Added a `desktop-release-context` job that resolves exactly one
  `release-tag`, `release-version`, and `target-sha`.
- Made `desktop-build` and `desktop-publish` check out
  `needs.desktop-release-context.outputs.target-sha`.
- Added `scripts/validate-release-assets.mjs` to validate `dist/` from the
  release tag.
- Updated workflow contract tests to assert same-workflow desktop release
  orchestration.
- Updated `docs/REQUIREMENTS.md`, `docs/CONTRIBUTING.md`, and
  `docs/BEST-PRACTICES.md` to document the single-workflow release path.

## Template Comparison

The JS and Rust pipeline templates keep reusable CI/CD behavior in scripts and
test workflow contracts in code. This fix follows that pattern by moving
versioned asset validation from inline YAML into `scripts/validate-release-assets.mjs`.

This repository differs from the templates because it must produce Electron
desktop binaries on five target runners and publish GitHub Release assets. For
that requirement, a single workflow result is safer than a parent/child
dispatch handoff because the release tag and target SHA remain explicit job
outputs inside one DAG.

## Regression Coverage

- `tests/desktop-release-workflow.test.js` reproduces the pre-fix failure by
  rejecting package-version based release asset validation.
- `tests/validate-release-assets.test.js` verifies that `v0.9.10` assets pass
  even when the publish checkout package version would have been `0.9.9`.
- `tests/ci-timeouts.test.js` verifies every job in `js.yml` has an explicit
  timeout.

## Verification Logs

- Full Node.js test suite:
  `docs/case-studies/issue-20/data/npm-test-after-fix.txt`
- Bun and Deno test suites:
  `docs/case-studies/issue-20/data/bun-test-after-fix.txt`,
  `docs/case-studies/issue-20/data/deno-test-after-fix.txt`
- Lint, formatting, duplication, secret scanning, syntax, and line-limit
  checks:
  `docs/case-studies/issue-20/data/npm-lint-after-fix.txt`,
  `docs/case-studies/issue-20/data/npm-format-check-after-fix.txt`,
  `docs/case-studies/issue-20/data/npm-check-duplication-after-fix.txt`,
  `docs/case-studies/issue-20/data/secretlint-after-fix.txt`,
  `docs/case-studies/issue-20/data/check-mjs-syntax-after-fix.txt`,
  `docs/case-studies/issue-20/data/check-file-line-limits-after-fix.txt`
