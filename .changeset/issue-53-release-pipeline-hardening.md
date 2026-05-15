---
'vk-bot-desktop': patch
---

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
