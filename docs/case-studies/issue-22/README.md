# Issue 22 Case Study: Release Workflow Skipped Desktop Binaries

## Summary

Issue #22 reported that the JavaScript CI/CD workflow produced a new version
but no matching binary assets in GitHub Releases.

The failing release evidence is run
`25638487599`, created on 2026-05-10 at 20:05:40 UTC:

- Workflow: `JavaScript CI/CD`
- Event: `push`
- Head branch: `main`
- Head SHA: `430e960d8666866007aa8c625e2b6118251d931f`
- Display title: `Merge pull request #21 from konard/issue-20-f41343d25099`
- Conclusion: `success`

The conclusion was the bug. The workflow versioned `0.9.10` to `0.9.11`, set
desktop release context outputs for `v0.9.11`, and then skipped both desktop
artifact build and GitHub Release publication.

## Captured Data

- `issue-22.json` and `issue-22-comments.json`
- `run-25638487599.json`
- `ci-logs/javascript-cicd-25638487599.log`
- `run-25638487599-artifacts.json`
- `releases-before-fix.txt`
- `related-issue-11.json`, `related-issue-13.json`,
  `related-issue-15.json`, `related-issue-18.json`,
  `related-issue-20.json`
- `js-template-release.yml`, `rust-template-release.yml`, and selected
  Deep SDK workflow files for template comparison
- `reproducing-test-before-fix.txt`
- `targeted-test-after-fix.txt`
- `npm-test-after-fix.txt`
- `npm-check-after-fix.txt`
- `validate-changeset-after-fix.txt`
- `check-mjs-syntax-after-fix.txt`
- `check-file-line-limits-after-fix.txt`

## Timeline

1. 2026-05-10 20:05:40 UTC: run `25638487599` started after PR #21 was merged
   to `main`.
2. 2026-05-10 20:09:44 UTC: `Release` found one changeset and decided to
   release.
3. 2026-05-10 20:09:50 UTC: the workflow computed new version `0.9.11`.
4. 2026-05-10 20:09:52 UTC: the workflow pushed the version bump to `main`.
5. 2026-05-10 20:09:58 UTC: `Resolve desktop release context` emitted
   `release-tag=v0.9.11`, target SHA
   `980319358bee7264071c7f2a7079836c750820dd`, and
   `should-publish=true`.
6. 2026-05-10 20:10:01 UTC: `Build desktop` and `Publish GitHub release` were
   skipped.
7. 2026-05-10 20:10:02 UTC: the workflow concluded `success`.

## Requirements Checked

The relevant prior requirements from issues 11, 13, 15, 18, and 20 are already
normalized in `docs/REQUIREMENTS.md`, especially release requirements 3, 12,
14, 15, 21, and 23.

Issue #22 adds requirement 24: desktop artifact build and publication jobs must
explicitly handle skipped optional release-mode jobs so a workflow run cannot
report success after versioning a release while skipping binary build and
GitHub Release upload.

## Root Cause

The workflow has mutually exclusive release entry points:

- `release` for automatic main-branch release
- `instant-release` for manual instant release
- `desktop-artifacts` for manual artifact replay

`desktop-release-context` depends on `release` and `instant-release` and uses
`always() && !cancelled()` so it can run when one optional path is skipped.
That part worked.

The downstream `desktop-build` and `desktop-publish` jobs only tested
`needs.desktop-release-context.outputs.should-publish == 'true'`. They did not
include a status-check function. GitHub Actions applies an implicit
`success()` status check when an `if` condition does not include one, and the
documented `needs` behavior says skipped jobs propagate through dependency
chains unless a conditional expression causes the job to continue.

Because `instant-release` was skipped in the automatic release run, that skip
cascade reached the downstream desktop jobs even though
`desktop-release-context` produced `should-publish=true`.

References:

- GitHub Actions workflow syntax, `jobs.<job_id>.needs`:
  https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds
- GitHub Actions expressions, status-check functions:
  https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions

## Template Comparison

The JavaScript template uses explicit status checks for optional downstream
publishing. Its optional Docker publishing job uses `!cancelled()` and checks
the concrete upstream job result and outputs before publishing.

The Rust template is stricter: jobs that depend on conditional jobs use
`always() && !cancelled()` plus explicit `needs.*.result == 'success'` checks.
This is the pattern adopted here for desktop binaries.

The checked Deep SDK workflows do not have the same single-workflow,
mutually-exclusive release-mode topology, so no upstream issue was filed.

## Fix

The workflow now gives `desktop-build` this explicit job condition:

```yaml
always() &&
!cancelled() &&
needs.desktop-release-context.result == 'success' &&
needs.desktop-release-context.outputs.should-publish == 'true'
```

The publish job now similarly opts out of the implicit skip cascade but still
requires both context resolution and all desktop builds to succeed:

```yaml
always() &&
!cancelled() &&
needs.desktop-release-context.result == 'success' &&
needs.desktop-build.result == 'success' &&
needs.desktop-release-context.outputs.should-publish == 'true'
```

## Verification

Before the fix, the new workflow contract test failed because `desktop-build`
did not contain the explicit status checks. See
`reproducing-test-before-fix.txt`.

After the fix:

```text
node --test --test-timeout=30000 tests/desktop-release-workflow.test.js
# pass 12, fail 0
```

See `targeted-test-after-fix.txt`.

The full local verification also passed:

```text
npm test
npm run check
node scripts/validate-changeset.mjs
bash scripts/check-mjs-syntax.sh
bash scripts/check-file-line-limits.sh
```
