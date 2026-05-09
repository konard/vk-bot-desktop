# Issue 3 Case Study: Desktop-Only Releases

## Summary

Issue #3 was opened after the initial desktop app PR merged and the first main
release run failed in the npm publish step. The requested temporary
distribution model is GitHub Releases only: Linux, Windows, and macOS desktop
binaries are the user-facing artifacts, and npm publishing must not block them.

PR #4 decoupled releases from npm and successfully dispatched
`electron-release.yml`, but the first Electron release run still failed before
publishing assets. The follow-up root cause was in the artifact build workflow:
Linux `.deb` packaging lacked a maintainer email, and macOS checksum generation
used an unquoted command substitution that split artifact filenames on spaces.

The root cause was release workflow coupling left from the JavaScript package
template. `.github/workflows/release.yml` still used npm as the source of truth,
published to npm before creating a GitHub release, and skipped the release
artifact path when npm failed. `.github/workflows/electron-release.yml` already
contained the platform build matrix, but it was only tag/manual driven and was
never dispatched by the main release workflow.

## Timeline

| Time (UTC)       | Event                                                                                         | Evidence                                     |
| ---------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2026-05-09 11:50 | Issue #1 defined the full `vk-bot-desktop` product vision, including GitHub Release binaries. | `data/linked-issue-1.json`                   |
| 2026-05-09 11:55 | PR #2 opened with the initial React + Electron implementation.                                | `data/linked-pr-2.json`                      |
| 2026-05-09 13:20 | PR #2 comment added stats, lifecycle, defaults, and UI confirmation requirements.             | `data/linked-pr-2-comment-4412616546.json`   |
| 2026-05-09 14:16 | PR #2 merged to `main`.                                                                       | `data/linked-pr-2.json`                      |
| 2026-05-09 14:22 | Main run `25603272038` failed while publishing `vk-bot-desktop@0.9.0` to npm.                 | `data/ci-logs/checks-main-25603272038.log`   |
| 2026-05-09 15:19 | Issue #3 requested temporary npm skip and GitHub Release binaries only.                       | `data/issue-3.json`                          |
| 2026-05-09 15:20 | PR #4 was opened from `issue-3-0e5a85ffef02`.                                                 | `data/pr-4.json`                             |
| 2026-05-09 16:02 | PR #4 release wiring was merged and main checks passed.                                       | `data/main-runs-after-pr-4.json`             |
| 2026-05-09 16:07 | Electron release run `25605540001` failed in Linux and macOS artifact jobs.                   | `data/electron-release-run-25605540001.json` |
| 2026-05-09 17:57 | Issue comment confirmed no Linux, Windows, or macOS release binaries were published.          | `data/issue-3-comments.json`                 |
| 2026-05-09 17:58 | PR #5 was opened for the follow-up artifact build fix.                                        | `data/pr-5.json`                             |

## Captured Data

The issue data, linked PR data, and CI logs are stored under `data/`.

| File                                            | Purpose                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `issue-3.json`, `issue-3-comments.json`         | Primary issue and comments.                                         |
| `linked-issue-1.json`                           | Full product vision referenced by issue #3.                         |
| `linked-pr-2.json`, `linked-pr-2-comments.json` | Initial implementation PR and follow-up requirements.               |
| `linked-pr-2-comment-4412616546.json`           | The specific linked PR comment from issue #3.                       |
| `pr-4.json`, `pr-4-*.json`                      | Current solution PR metadata and comments/reviews.                  |
| `main-run-*.json`, `main-runs.json`             | Main branch run metadata around the failure.                        |
| `ci-logs/checks-main-25603272038.log`           | Failing main release run for `vk-bot-desktop@0.9.0`.                |
| `ci-logs/checks-main-25600034255.log`           | Earlier template-lineage npm publish failure.                       |
| `ci-logs/electron-release-25605540001.log`      | Failing Electron artifact run after PR #4 merged.                   |
| `electron-release-runs-before-fix.json`         | Confirms no Electron release workflow runs existed before this fix. |
| `electron-release-runs-after-pr-4.json`         | Confirms the dispatched Electron workflow failed after PR #4.       |
| `electron-release-run-25605540001.json`         | Job metadata for the failed Electron release run.                   |
| `releases-before-fix.txt`                       | Confirms no GitHub Releases existed before this fix.                |
| `pr-5.json`, `pr-5-*.json`                      | Follow-up PR metadata and comments/reviews.                         |

## Failure Evidence

The latest failing main run completed checks and failed only in the release job:

- `checks-main-25603272038.log:10240` shows `E404 Not Found - PUT https://registry.npmjs.org/vk-bot-desktop - Not found`.
- `checks-main-25603272038.log:10262` shows the release script detected `"packages failed to publish"`.
- `checks-main-25603272038.log:10412` shows the final retry still detected the same failure.

Because the old workflow only created the GitHub release after
`steps.publish.outputs.published == 'true'`, no Electron artifacts could be
published once npm failed.

The follow-up Electron release run reached platform artifact builds but failed
before the publish job:

- `electron-release-25605540001.log:483` says a Linux `.deb` package
  maintainer is required.
- `electron-release-25605540001.log:485` shows electron-builder asked for an
  author email in `package.json`.
- `electron-release-25605540001.log:692` shows the macOS checksum command used
  `shasum -a 256 $(ls | grep ...)`.
- `electron-release-25605540001.log:698` and
  `electron-release-25605540001.log:701` show filenames with spaces were split
  into separate `shasum` arguments.

## Requirements

Detailed requirements are normalized in `../../REQUIREMENTS.md`. The release
requirements extracted for this issue are:

1. Temporarily skip npm publishing.
2. Make GitHub Releases the only distribution channel.
3. Publish Linux, Windows, and macOS desktop binaries.
4. Attach verification data, at minimum SHA256 checksums.
5. Keep release automation self-healing when a version bump lands but artifact
   publication fails.
6. Preserve the full product requirements and map them to code/tests.
7. Capture logs/data and reconstruct the issue timeline.

## Root Causes

1. **Wrong release source of truth**: `scripts/check-release-needed.mjs`
   checked npm package state, even though issue #3 makes GitHub Releases the
   temporary source of truth.
2. **Hard release gate on npm**: `release.yml` ran `publish-to-npm.mjs`, then
   only created a GitHub release if npm publish succeeded.
3. **Detached Electron workflow**: `electron-release.yml` could build binaries
   on tags or manual dispatch, but `release.yml` never triggered it after a
   version bump.
4. **No regression test for release wiring**: tests covered helpers, but not
   the workflow contract that desktop releases must avoid npm.
5. **Stale case-study data**: the existing `docs/case-studies/issue-3` folder
   described an unrelated template issue and could mislead future debugging.
6. **Missing Linux maintainer metadata**: electron-builder needs maintainer
   metadata for Debian packages, but `package.json` only had a short string
   author and no Linux maintainer email.
7. **Unsafe checksum command**: the Linux/macOS checksum step used unquoted
   command substitution, so macOS artifact names containing spaces were split
   before `shasum` received them.

## Solution Plan

1. Add failing tests that assert release jobs do not call npm publish and do
   dispatch `electron-release.yml` with a tag and exact target commit.
2. Replace npm release detection with GitHub Release detection through
   `gh release view`.
3. Update automatic and manual release jobs to version main, resolve the target
   commit, and dispatch the Electron release workflow using `workflow_dispatch`.
4. Update `electron-release.yml` to accept `target_sha`, check out that exact
   commit, build all platform artifacts, aggregate SHA256 sums, write build
   provenance, and upload assets to the GitHub Release.
5. Add requirements documentation and replace stale issue #3 case-study files.
6. Add a changeset so CI accepts the code changes.
7. Configure a Linux maintainer for `.deb` artifacts.
8. Replace the Linux/macOS checksum command with a filename-safe `find` loop
   that quotes every path before hashing.

## Online Research

Only official documentation was used for workflow and builder behavior:

- GitHub CLI `gh workflow run` supports triggering a `workflow_dispatch`
  workflow with inputs and `--ref`: <https://cli.github.com/manual/gh_workflow_run>
- GitHub Actions documents that `workflow_dispatch` is an exception that can be
  triggered from another workflow using `GITHUB_TOKEN`:
  <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow>
- GitHub CLI `gh release create` supports `--target` for a branch or full commit
  SHA: <https://cli.github.com/manual/gh_release_create>
- GitHub CLI `gh release upload` supports uploading release assets and
  `--clobber`: <https://cli.github.com/manual/gh_release_upload>
- electron-builder documents `--publish never`, which prevents implicit
  publishing while still building artifacts:
  <https://www.electron.build/publish.html>
- electron-builder Linux configuration documents `maintainer` metadata and the
  Linux target formats used by this app:
  <https://www.electron.build/linux>

## Verification

The regression suite introduced for this issue covers:

- release jobs contain no `Publish to npm`, `publish-to-npm.mjs`,
  `setup-npm.mjs`, npm registry URL, or npm OIDC permission;
- release jobs have `actions: write` and dispatch `electron-release.yml` with
  `tag` and `target_sha`;
- Electron release workflow keeps Linux, macOS, and Windows builders and uploads
  artifacts/checksums to the GitHub release;
- Linux `.deb` builds have maintainer metadata;
- Linux/macOS checksum generation quotes artifact filenames and no longer uses
  unquoted `$(ls ...)`;
- release detection treats GitHub Releases as the publish state and fails on
  unexpected `gh release view` errors.

Focused local reproduction:

```sh
node --test --test-timeout=30000 tests/desktop-release-workflow.test.js tests/check-release-needed.test.js
```
