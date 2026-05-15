# Upstream issues to file

Two of the four `link-foundation` templates share concrete bugs with
vk-bot-desktop (issue [#53](https://github.com/konard/vk-bot-desktop/issues/53)).
Drafts below are ready to file once this PR is merged so the
referenced fix can be linked.

The Rust template already has the correct retry pattern. The C#
template is loud-on-failure already; only an optional enhancement is
suggested there.

---

## 1. link-foundation/js-ai-driven-development-pipeline-template

**Title:** `version-and-commit.mjs` silently swallows failed `git push` and `git rebase` errors

**Labels:** `bug`, `release`, `ci`

**Body:**

`scripts/version-and-commit.mjs` uses `command-stream`'s tagged-template `$` to run git, e.g.

```js
// scripts/version-and-commit.mjs:217
await $`git rebase origin/main`;
// scripts/version-and-commit.mjs:268
await $`git push origin main`;
```

The awaited promise resolves to a `Result` even when the underlying git command exits non-zero. The script never inspects `result.code`, so:

1. `git rebase origin/main` fails with `cannot rebase: You have unstaged changes` (e.g. when a preceding `npm install` rewrote `package-lock.json`), but the script keeps running.
2. `git push origin main` is rejected as `non-fast-forward` (e.g. when remote `main` advanced between fetch and push), but the script prints `✅ Version bump committed and pushed to main` and writes `version_committed=true` to `GITHUB_OUTPUT`.

Downstream jobs then trust that output and either build off a stale SHA or publish a release tag whose commit does not exist on `main`.

### Reproducer

The vk-bot-desktop case study walks through the full timeline of a real production failure caused by exactly this bug, with the raw CI logs:

- <https://github.com/konard/vk-bot-desktop/tree/main/docs/case-studies/issue-53>

In short, two same-run jobs raced to push to `main`, the second one's rebase failed silently, its push was rejected silently, and the workflow happily declared success and proceeded to a downstream release.

### Workaround

Capture the exit code and throw on non-zero. The vk-bot-desktop fix is in <https://github.com/konard/vk-bot-desktop/pull/54> — `scripts/version-and-commit.mjs` (`assertOk` helper, `pushWithRetry` retry loop, stash-before-rebase).

### Suggested fix

Port the retry-with-`pull --rebase` pattern from the Rust template (`rust-ai-driven-development-pipeline-template/scripts/version-and-commit.rs:498-525`) and either (a) enable `command-stream`'s shell-error mode or (b) wrap every invocation in an `assertOk(result, label)` helper that throws on non-zero.

The vk-bot-desktop fix is line-by-line portable to this template because the two scripts are identical at the time of writing.

---

## 2. link-foundation/python-ai-driven-development-pipeline-template

**Title:** `version_and_commit.py` rebases without checking for uncommitted changes and never retries non-fast-forward pushes

**Labels:** `bug`, `release`, `ci`

**Body:**

`scripts/version_and_commit.py:131` calls `run_command(["git", "rebase", "origin/main"])`. Because `check=True` is the default in `run_command`, failure is loud — good — but the script does not run `git status --porcelain` first to surface "cannot rebase: You have unstaged changes" as a clear error, and any partial rebase state is left behind on the working tree.

`scripts/version_and_commit.py:219` calls `run_command(["git", "push", "origin", "main"])`. If remote `main` advances after the rebase but before the push, the push fails. There is no retry; the workflow run dies and an operator has to re-trigger it.

### Suggested fix

1. Add `git status --porcelain` pre-check before rebase; if non-empty, `git stash --include-untracked`, rebase, `git stash pop`. On a stash-pop conflict, abort with a clear error.
2. Add `git rebase --abort` in a `try/except` cleanup so the working tree is never left in an in-progress rebase.
3. Port the Rust template's retry + `pull --rebase` loop so transient races self-heal instead of failing the workflow.

### Reference fix

The vk-bot-desktop case study (<https://github.com/konard/vk-bot-desktop/tree/main/docs/case-studies/issue-53>) and PR (<https://github.com/konard/vk-bot-desktop/pull/54>) implement the equivalent fix in JS. The same shape applies to Python with `subprocess.run(..., check=False)` and an explicit retry loop.

---

## 3. link-foundation/rust-ai-driven-development-pipeline-template

**No critical bug to file.** This template already has the correct retry+`pull --rebase` pattern at `scripts/version-and-commit.rs:498-525`.

**Optional tracking issue:**

> Track porting `scripts/version-and-commit.rs:498-525` retry loop to the JS, Python, and C# templates for parity.

---

## 4. link-foundation/csharp-ai-driven-development-pipeline-template

**No critical bug to file.** `execSync` with `stdio: 'inherit'` throws on non-zero, so failures are loud.

**Optional enhancement issue:**

**Title:** Adopt `pull --rebase` retry loop for `version-and-commit.mjs`

**Body:**

`scripts/version-and-commit.mjs` currently fails the workflow run when remote `main` advances between fetch and push. Porting the Rust template's retry-with-`pull --rebase` loop (`rust-ai-driven-development-pipeline-template/scripts/version-and-commit.rs:498-525`) would let transient races self-heal. The existing `scripts/version-and-commit.test.mjs` is a good harness to extend with a "remote advances mid-flight" case.

---

## How to file these once the PR is merged

```sh
# Replace OWNER/REPO with the template repo.
gh issue create \
  --repo link-foundation/js-ai-driven-development-pipeline-template \
  --title "version-and-commit.mjs silently swallows failed git push and git rebase errors" \
  --label bug --label release --label ci \
  --body-file docs/case-studies/issue-53/upstream/UPSTREAM-ISSUES.md
```

(For real filings, split the four sections into four separate issues.
The single combined file makes review easier inside this PR.)
