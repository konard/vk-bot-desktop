# Issue #18 Case Study: Release False Positive For v0.9.9

## Summary

Issue #18 reported that commit
`71de4e09faa0f2528b9a12a304f710fa40699435` showed a green
`Checks and release` run even though no `v0.9.9` GitHub Release was produced.

The report was correct. The parent workflow accepted the downstream
`electron-release.yml` dispatch, printed the child run URL, and then exited
successfully. The child Electron release workflow failed later in the Windows
x64 smoke test, so the parent release job was a false positive.

## Preserved Evidence

- `data/issue-18.json`: issue body and metadata.
- `data/issue-18-comments.json`: issue comments, empty at investigation time.
- `data/pr-19.json`: draft PR metadata before the fix.
- `data/main-runs.json`, `data/runs-commit-71de4e0.json`,
  `data/recent-runs.json`: Actions run metadata used to reconstruct the
  timeline.
- `ci-logs/checks-release-false-positive-25636488852.log`: parent workflow log.
- `ci-logs/electron-release-failed-25636588014.log`: failed child workflow log.
- `data/checks-release-false-positive-run-25636488852.json` and
  `data/electron-release-failed-run-25636588014.json`: job and step metadata.
- `data/releases-before-fix.txt`: release list before the fix. The latest
  release was still `v0.9.7`, published at `2026-05-10T15:04:57Z`.
- `data/reproducing-tests-before-fix.txt`: failing local test run before the
  implementation change.
- `data/js-template-release.yml`, `data/rust-template-release.yml`, and
  `data/deep-sdk-*.yml`: workflow references used for comparison.

## Timeline

1. `2026-05-10T18:32:20Z`: `Checks and release` run `25636488852` started on
   commit `71de4e09faa0f2528b9a12a304f710fa40699435`.
2. `2026-05-10T18:36:56Z`: the release job versioned the package to `0.9.9`,
   pushed target commit `7c8093bdacb94446a744afe055212df020ffc21d`, and ran
   `gh workflow run electron-release.yml`.
3. `2026-05-10T18:36:57Z`: the dispatch printed child Actions run
   `25636588014`.
4. `2026-05-10T18:37:01Z`: parent `Checks and release` completed with
   conclusion `success`.
5. `2026-05-10T18:39:34Z`: child `Electron release` failed in the Windows x64
   job. The smoke test reported installer exit code `-1073741819` for
   `vk-bot-desktop-windows-installer-x64-0.9.9.exe`.
6. `2026-05-10T18:42:20Z`: child `Electron release` run completed with
   conclusion `failure`, and the publish job was skipped.

Relevant log anchors:

- Parent dispatch command:
  `ci-logs/checks-release-false-positive-25636488852.log:10741`.
- Child run URL printed by the parent:
  `ci-logs/checks-release-false-positive-25636488852.log:10751`.
- Windows installer failure:
  `ci-logs/electron-release-failed-25636588014.log:1142`.

## Requirements Checked

- GitHub Releases remain the only current distribution channel.
- Desktop releases must publish versioned macOS, Windows, and Linux artifacts
  only after target-platform smoke tests.
- A release retry must be possible after a version bump reaches `main` without a
  complete GitHub Release.
- Parent release workflows must not report success while a required downstream
  desktop artifact workflow fails.
- Windows installer smoke tests must validate silent install output without
  coupling the installer check to app launch behavior.
- Issue work must preserve logs, metadata, requirements, root-cause analysis,
  and template comparisons under `docs/case-studies/issue-18`.

`docs/REQUIREMENTS.md` now records the two missing release requirements
explicitly.

## Root Causes

1. The parent release workflow used `gh workflow run electron-release.yml`
   directly. GitHub CLI accepted the dispatch and returned before the child
   workflow finished, so the parent job had no dependency on the Electron
   release result.
2. The Windows NSIS installer used Electron Builder's default
   `runAfterFinish: true`. The silent install smoke test waited on the installer
   process; the assisted installer then attempted to launch the app after
   install, and the Windows x64 runner reported exit code `-1073741819`.

The second root cause is based on the repository logs plus Electron Builder's
documented NSIS default: `runAfterFinish` defaults to `true` and controls
whether the installed application runs after finish.

## Template Comparison

- `link-foundation/js-ai-driven-development-pipeline-template`: release work is
  contained in the same workflow path. It does not detach artifact publishing
  into an unwatched child workflow.
- `link-foundation/rust-ai-driven-development-pipeline-template`: auto and
  manual release jobs run build, test, and publish steps as normal job
  dependencies in the same workflow.
- `deep-foundation/sdk`: reusable build and publish workflows use `needs`
  dependencies, keeping publish outcome tied to workflow outcome.

No matching template bug was found. The false positive was specific to this
repository's detached Electron release dispatch.

## Fix

- Added `scripts/dispatch-and-watch-workflow.mjs`. It dispatches the requested
  workflow, finds the matching child run by target commit if needed, then runs
  `gh run watch --compact --exit-status` so a child failure fails the parent job.
- Updated automatic and instant release jobs to use the wrapper with
  `--match-head-sha "${{ steps.release_target.outputs.sha }}"`.
- Increased the parent release job caps from 30 minutes to 90 minutes because
  the parent now waits for the downstream Electron release result.
- Set `build.nsis.runAfterFinish` to `false` in `package.json` so silent Windows
  installer smoke tests validate installation without auto-launching the app.
- Updated release requirements, best-practices documentation, README artifact
  examples, and the Pages fallback verification version to `0.9.9`.

## Verification

1. The reproducing tests failed before the fix because the workflow did not use
   the dispatch-and-watch helper, `runAfterFinish` was unset, and the helper
   script did not exist.
2. Targeted workflow/package tests passed after the fix:
   `node --test --test-timeout=30000 tests/dispatch-and-watch-workflow.test.js tests/desktop-release-workflow.test.js tests/ci-timeouts.test.js`.
3. `npm test` passed after the fix.
4. `npm run check` passed after the fix. It still reports the pre-existing
   `src/bot/runner.js` complexity warning.
5. `bash scripts/check-file-line-limits.sh` passed after the fix.
6. `npm run build:site` passed after the fix.
7. `npm run test:pages:e2e -- --site-dir site/dist` passed after installing the
   same transient Pages e2e dependencies used by CI.
8. `git diff --check` passed after the fix.

## References

- GitHub CLI `gh run watch` documents `--exit-status` as the mode that returns a
  non-zero status when the watched run fails:
  <https://cli.github.com/manual/gh_run_watch>.
- Electron Builder NSIS options document `runAfterFinish` and its default:
  <https://www.electron.build/nsis.html#runafterfinish>.
