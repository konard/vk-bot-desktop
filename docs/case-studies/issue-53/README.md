# Issue #53 — CI/CD failed (false-positive success → broken Release)

> Source issue: [konard/vk-bot-desktop#53](https://github.com/konard/vk-bot-desktop/issues/53)
> Failing run: [Actions run 25892544573](https://github.com/konard/vk-bot-desktop/actions/runs/25892544573)
> Tracking PR: [#54](https://github.com/konard/vk-bot-desktop/pull/54)
> Branch: `issue-53-38848f5a0773`

## TL;DR

A single push to `main` (the merge of PR #52) triggered two jobs in the same workflow run that both write to `main`: `release` and `preview-regen`. They raced. `preview-regen` won the race and pushed first (commit `87378f5`, `[skip ci]`). The `release` job then tried to rebase, `git rebase origin/main` failed because `npm install` had dirtied `package-lock.json`, but `scripts/version-and-commit.mjs` did not exit on that failure. It went on to bump `package.json` from `0.11.0` to `0.12.0`, commit `1b35179` locally, and `git push origin main` — which was rejected as non-fast-forward. The script still printed `✅ Version bump committed and pushed to main` and set `version_committed=true`. Downstream jobs trusted that output, derived `target-sha=$(git rev-parse origin/main)` (i.e. `87378f5` — preview commit, where `package.json` is still `0.11.0`), built artifacts named `vk-bot-desktop-*-0.11.0.*`, and the final asset-name validator failed with 14 `Required versioned release asset is missing` errors because it expected `0.12.0` names.

Two true bugs and one workflow-design weakness:

1. **`scripts/version-and-commit.mjs` does not propagate `command-stream` failures.** With the library defaults, `await $\`git rebase origin/main\``and`await $\`git push origin main\``return even when the underlying git command exits non-zero. The script never checks`result.code` and prints a success banner unconditionally.
2. **`scripts/version-and-commit.mjs` rebases without first stashing.** A previous `npm install` from the workflow leaves `package-lock.json` dirty, so any rebase attempt aborts immediately.
3. **`release` and `preview-regen` push to `main` concurrently inside the same workflow run.** The repo-wide `concurrency:` group only serialises across runs; jobs inside one run still run in parallel unless explicitly ordered with `needs:`.

The root failure mode is #1. Bug #2 is what tripped #1 in this particular run, and weakness #3 is what makes it easy to trip again.

## Sequence of events (reconstructed from logs)

Times below are UTC, taken from
`docs/case-studies/issue-53/ci-logs/*.log`. All log files are committed to
this folder so the analysis is reproducible offline.

| Time (UTC)  | Actor                     | Event                                                                                                                                                         |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00:01:36    | merge bot                 | PR #52 (`Issue #51: regenerate preview images`) merged → push event delivers commit `9212c11` to `main`.                                                      |
| 00:02:50    | `release` job             | Checked out `9212c11`. `check-release-needed.mjs` reports `should_release=true` (1 changeset).                                                                |
| 00:02:50–53 | `release` job             | `version-and-commit.mjs` starts, runs `git fetch origin main`.                                                                                                |
| 00:02:53    | `preview-regen`           | (Same workflow run, in parallel.) Pushed `87378f5 chore(preview): regenerate preview images [skip ci]` to `main`.                                             |
| 00:02:53.98 | `release` job             | `git fetch` updates `origin/main`: `9212c11..87378f5`.                                                                                                        |
| 00:02:54.00 | `release` job             | Script logs `Remote main has advanced (local: 9212c11, remote: 87378f5)`. Decides to rebase.                                                                  |
| 00:02:54.17 | `release` job             | `git rebase origin/main` exits non-zero: `cannot rebase: You have unstaged changes. Please commit or stash them.` The script does not check the exit code.    |
| 00:02:54.18 | `release` job             | Script logs `Current version: 0.11.0` and continues into `changeset version`.                                                                                 |
| 00:02:56.98 | `release` job             | `package.json` bumped to `0.12.0`. Local commit `1b35179`.                                                                                                    |
| 00:02:58.26 | `release` job             | `git push origin main` rejected: `! [rejected] main -> main (non-fast-forward)`.                                                                              |
| 00:02:58.26 | `release` job             | Script still logs `✅ Version bump committed and pushed to main`. Sets `version_committed=true`, `new_version=0.12.0`.                                        |
| 00:02:58.64 | `release` job             | "Resolve release target commit" step runs `git rev-parse origin/main` → `87378f5` (the preview commit). Sets `target-sha=87378f5`.                            |
| 00:03:04.92 | `desktop-release-context` | Reads `AUTOMATIC_TAG=v0.12.0`, `AUTOMATIC_SHA=87378f5`. Sets `release-tag=v0.12.0`, `target-sha=87378f5`, `should-publish=true`.                              |
| 00:03–00:09 | `desktop-build`           | Each matrix job checks out `87378f5` where `package.json.version` is still `0.11.0`. `electron-builder` produces artefacts named `vk-bot-desktop-*-0.11.0.*`. |
| 00:09:17    | `desktop-publish`         | `dist/` contains 14 `*-0.11.0.*` files (plus `SHA256SUMS.txt`, `BUILD-PROVENANCE.txt`).                                                                       |
| 00:09:20    | `desktop-publish`         | `scripts/validate-release-assets.mjs --dist dist --tag "v0.12.0"` emits 14 × `Required versioned release asset is missing` and exits `1`. Workflow run fails. |

The commit `1b35179` ("0.12.0") only exists in the runner's local working
copy. It was never pushed and never referenced again — silently lost.
`origin/main` is still at `87378f5`; the `0.12.0` bump never happened
upstream. The release that was advertised by the workflow outputs as
`v0.12.0` cannot exist because no commit on `main` has that version.

## All requirements extracted from the issue

The issue asks for several discrete deliverables. Each is tracked
below so we can verify nothing is missed.

| #   | Requirement                                                                                                                                        | Status                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Investigate the failed CI/CD run for false positives and errors.                                                                                   | Done — see _Root causes_ below.                                                                                                                                                                  |
| R2  | Compare current `.github/workflows/*` and `scripts/*` against the four `link-foundation` AI-pipeline templates (`js`, `rust`, `python`, `csharp`). | Done — see `templates/COMPARISON.md`.                                                                                                                                                            |
| R3  | Download all logs and data relevant to the failure into `./docs/case-studies/issue-53/`.                                                           | Done — `ci-logs/` (this directory) and `templates/` (template snapshots).                                                                                                                        |
| R4  | Reconstruct timeline of events.                                                                                                                    | Done — table above.                                                                                                                                                                              |
| R5  | List every requirement from the issue.                                                                                                             | This table.                                                                                                                                                                                      |
| R6  | Find root causes for each problem.                                                                                                                 | See _Root causes_.                                                                                                                                                                               |
| R7  | Propose possible solutions and solution plans.                                                                                                     | See _Solution plan_.                                                                                                                                                                             |
| R8  | Check known existing components/libraries that solve similar problems.                                                                             | See _Prior art_ and _Templates comparison_.                                                                                                                                                      |
| R9  | If data is insufficient to find the root cause, add debug output / verbose mode.                                                                   | Not needed — root cause is fully traced. The fix still adds an extra `--verbose` log of `git rev-parse origin/main` after each push, which helps the next iteration if a different race appears. |
| R10 | If issue exists in any other repository (templates) — file a GitHub issue there with reproducer, workaround, and fix suggestion.                   | Draft issues ready in [`upstream/UPSTREAM-ISSUES.md`](upstream/UPSTREAM-ISSUES.md). To be filed after this PR is merged so the fix link is concrete.                                             |
| R11 | Fix everything in PR #54.                                                                                                                          | Done — `scripts/version-and-commit.mjs`, `.github/workflows/js.yml`, `tests/version-and-commit-guards.test.js`.                                                                                  |

## Root causes

### RC1. `command-stream` does not throw on non-zero exit and the script does not check

`scripts/version-and-commit.mjs` calls `git` through the
[`command-stream`](https://www.npmjs.com/package/command-stream) tagged-template
literal `$`. With the default settings the awaited promise resolves to
a `Result` object that carries `stdout`, `stderr`, and `code`. The
script never inspects `code`, so:

```js
// scripts/version-and-commit.mjs:217 (paraphrased)
await $`git rebase origin/main`; // exits 128 → resolves
// scripts/version-and-commit.mjs:268
await $`git push origin main`; // exits 1 → resolves
console.log('✅ Version bump committed and pushed to main');
setOutput('version_committed', 'true');
```

Evidence from `ci-logs/release-76099057513.log`:

```
2026-05-15T00:02:54.1753430Z error: cannot rebase: You have unstaged changes.
2026-05-15T00:02:54.1754754Z error: Please commit or stash them.
2026-05-15T00:02:54.1761736Z Current version: 0.11.0     ← script kept running
…
2026-05-15T00:02:58.2591086Z  ! [rejected]        main -> main (non-fast-forward)
2026-05-15T00:02:58.2618311Z hint: Updates were rejected because the tip of your current branch is behind
…
2026-05-15T00:02:58.2633790Z ✅ Version bump committed and pushed to main     ← false positive
```

This is the **single most damaging bug**. Every other failure in this
run is downstream of this one — fixing it makes the workflow loud
instead of silent on push rejection, which means the issue becomes
trivially observable next time and the broken release does not
publish.

### RC2. `git rebase` runs against a dirty working tree

Earlier in the same step, the workflow installs npm dependencies:

```yaml
# .github/workflows/js.yml: lines 431-432
- name: Install dependencies
  run: npm install
```

`npm install` can rewrite `package-lock.json` (e.g. peer-dep
resolution changes). Then `version-and-commit.mjs`'s rebase block
runs:

```js
// scripts/version-and-commit.mjs:215-218
console.log('Rebasing on remote main to incorporate changes...');
await $`git rebase origin/main`;
```

`git` refuses to rebase with a dirty working tree, which is the
behaviour observed in the log. The fix is to stash before rebasing
and restore after, or to reset the workspace cleanly before rebasing.

### RC3. `release` and `preview-regen` push to `main` concurrently within one workflow run

Workflow-level `concurrency:` (`js.yml:53-55`) only prevents two
_runs_ of the same workflow on the same ref from running at the same
time. Inside a single run, both `release` and `preview-regen` are
triggered by the push event and have no dependency between them, so
they execute in parallel. Both push commits directly to `main`. The
preview commit is `[skip ci]`, which only suppresses the _next_ push
event, not the in-flight run.

Concretely, the workflow YAML has:

```yaml
# js.yml:661
preview-regen:
  if: |
    (github.event_name == 'push' && github.ref == 'refs/heads/main') ||
    ...

# js.yml:399
release:
  needs: [lint, test]
  if: |
    !cancelled() &&
    github.ref == 'refs/heads/main' &&
    github.event_name == 'push' &&
    ...
```

There is no `needs:` link between them. They are scheduled in
parallel as soon as their respective preconditions are satisfied.

### RC4. `target-sha` is derived from `origin/main` instead of the SHA we actually committed

```yaml
# .github/workflows/js.yml:478-481
- name: Resolve release target commit
  id: release_target
  …
  run: |
    git fetch origin main
    SHA="$(git rev-parse origin/main)"
    echo "sha=$SHA" >> "$GITHUB_OUTPUT"
```

Even if RC1 is fixed and the push succeeds, this step will resolve
the wrong SHA if anyone else (preview-regen, a human, a different
workflow) pushes to `main` in the interval between
`version-and-commit.mjs` finishing and this step running. The step
should consume the SHA emitted by `version-and-commit.mjs` directly
(the commit it just made and pushed), with `origin/main` only as a
sanity check.

### RC5. The validator is correct — it caught the contradiction

`scripts/validate-release-assets.mjs --dist dist --tag v0.12.0`
required filenames matching `vk-bot-desktop-*-0.12.0.*` and found only
`*-0.11.0.*`. This is the validator working as designed, and it is
the only thing that stopped a broken `v0.12.0` GitHub Release from
being created. **No change to the validator is needed.** Its presence
is the reason the failure was loud at the very end and not silent
forever.

## Solution plan

| Fix     | File(s)                                                   | Addresses          | Type     | Status                                                                                                                                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | `scripts/version-and-commit.mjs`                          | RC1, RC2, RC4      | Code     | Done                                                                                                                                                                                                                                                                                                                                          |
| F2      | `.github/workflows/js.yml` (release/instant-release jobs) | RC4                | Workflow | Done                                                                                                                                                                                                                                                                                                                                          |
| F3      | `.github/workflows/js.yml` (preview-regen ordering)       | RC3                | Workflow | Done                                                                                                                                                                                                                                                                                                                                          |
| F4 / F5 | `tests/version-and-commit-guards.test.js` (new)           | RC1, RC2, RC3, RC4 | Test     | Done — F4 and F5 collapsed into one workflow+script invariant test, since the script imports `command-stream` over the network at module-load and can't be unit-tested without a Bun-style harness. The C# template's bare-repo end-to-end harness is listed as a future improvement in [`templates/COMPARISON.md`](templates/COMPARISON.md). |

### F1. Harden `scripts/version-and-commit.mjs`

Three concrete changes:

1. **Wrap every `git` call in a helper that asserts `result.code === 0`.** On
   failure, log the captured stderr and `process.exit(1)`. This is the
   single change that would have prevented the false-positive success
   in this run.

2. **Stash the working tree before any rebase** (including untracked
   files), pop after. If popping fails (merge conflict from
   regenerated lockfile), report the conflict and exit. Because every
   release run starts from a clean checkout and the only modifier of
   the tree before rebase is `npm install`, the stash is essentially
   "stash the regenerated `package-lock.json`".

3. **Verify `git rev-parse HEAD == git rev-parse origin/main` after
   push** and emit the locally-committed SHA as
   `committed_sha=<sha>`. If verification fails, exit non-zero. Retry
   the full fetch–rebase–push cycle up to N=3 times with a small back-off
   when the push is rejected non-fast-forward (handles real-world
   races where a concurrent push lands between fetch and push, even
   in a fixed workflow). This is the same pattern used in `kubectl
patch --type=merge` retries and in `git push --force-with-lease`
   loops.

### F2. Consume the committed SHA in the workflow

Replace:

```yaml
- name: Resolve release target commit
  id: release_target
  run: |
    git fetch origin main
    SHA="$(git rev-parse origin/main)"
```

with reading the new script output `committed_sha`. Same change in the
`instant-release` job.

### F3. Order `preview-regen` after `release`

Add `needs: [release, instant-release]` to `preview-regen`. Because
`release` is gated on the push event being on `main` and the version
PR being merged, and `preview-regen` is the regen step, this
ordering is correct: regenerate after the release path has finished
versioning. Use `if: always() && !cancelled()` so preview-regen still
runs when `release` is skipped (e.g. push without changesets).

This change costs us nothing (preview-regen already takes ~5 minutes
behind `release`'s ~3-minute version-bump step) and removes a whole
class of races.

### F4. Reproduction tests for `version-and-commit.mjs`

A minimal Node `node:test` suite that:

- sets up a temp git repo with a remote that simulates "ahead of
  local" by accepting one push then rejecting subsequent ones;
- runs the script with a stubbed `npm install` that dirties
  `package-lock.json`;
- asserts the script exits non-zero;
- asserts `version_committed=false` is written to `GITHUB_OUTPUT`.

This is the regression net. Without it, RC1 reappears the next time
someone refactors the script.

### F5. Test the workflow change

A small Node test that loads `js.yml`, parses with `yaml`, and asserts:

- `jobs.preview-regen.needs` includes `release`;
- `jobs.release.outputs.target-sha` references `steps.version.outputs.committed_sha`.

These two assertions are enough to keep the post-fix workflow honest.

## Prior art and existing components considered

- **`command-stream`'s "throw on non-zero" mode.** Some versions of
  `command-stream` accept `$.config({ throwOnNonZero: true })` or
  `$\`...\`.run({ throwOnNonZero: true })`. We use `.run({ capture:
  true })` already in two places — the same call shape can specify the
  throwing behaviour. We will use the inline option rather than mutate
  global state, which avoids surprising other callers.
- **`zx`** (Google) and **`execa`** both _throw_ by default on
  non-zero exit. If we ever migrate off `command-stream` the safer
  default would close this entire class of bug. Out of scope for this
  PR — flagged as a future improvement.
- **`actions/checkout`** has `clean: true` (default) which makes a
  clean checkout per job. We already rely on this, which is why the
  workspace was clean _before_ `npm install` ran.
- **`changesets`** itself does not push, it only writes files. The
  push lives in `version-and-commit.mjs` and is ours to fix.

## Templates comparison

See [`templates/COMPARISON.md`](templates/COMPARISON.md) (generated by
the comparison agent — links the four `link-foundation` template
repos, lists shared bugs and best practices, and seeds upstream
issues in [`upstream/UPSTREAM-ISSUES.md`](upstream/UPSTREAM-ISSUES.md)).

## What this PR changes (high level)

- `scripts/version-and-commit.mjs` — propagate git failures, stash
  before rebase, verify push, output `committed_sha`.
- `.github/workflows/js.yml`:
  - `release` and `instant-release`: consume `committed_sha`
    from the version step instead of `git rev-parse origin/main`.
  - `preview-regen`: `needs: [release, instant-release]`,
    `if: always() && !cancelled() && ...` to preserve previous
    triggering conditions.
- `tests/version-and-commit.test.js` (new) — regression test for
  RC1+RC2.

## Files in this folder

- `README.md` — this document.
- `ci-logs/` — raw CI logs (one file per failed job).
- `templates/` — snapshots of the four `link-foundation` AI-pipeline
  template files we compared against, plus `COMPARISON.md`.
- `upstream/` — upstream issue drafts ready to file against the
  templates if they share the same bugs.
