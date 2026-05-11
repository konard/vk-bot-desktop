# Issue 28 Case Study: GitHub Pages Deploy Skipped

## Scope

Issue: [konard/vk-bot-desktop#28](https://github.com/konard/vk-bot-desktop/issues/28)

Pull request:
[konard/vk-bot-desktop#29](https://github.com/konard/vk-bot-desktop/pull/29)

Branch: `issue-28-bbc47868b0d3`

The 0.9.14 release run on `main` (commit `dc70084`) reported overall success,
but the GitHub Pages download page was never rebuilt or redeployed. The
landing page at <https://konard.github.io/vk-bot-desktop/> therefore stayed at
an older release, which contradicts requirement #19 (download page must
render the latest Release API data).

## Captured Evidence

- `data/issue-28.json` - issue body and metadata.
- `data/issue-28-comments.json` - issue comments at investigation time.
- `data/run-25656741546.json` - full job listing for the failing main run
  (jobs `Build Pages site` and `Deploy Pages site` are `skipped`).
- `ci-logs/run-25656741546.log` - raw workflow log for the same run,
  including the `Detect changes` step output.
- `data/pages-config.json` - current GitHub Pages configuration
  (`build_type: workflow`, source branch `main`, public).
- `data/current-pages-job.yml` - excerpt of the current `pages-build` /
  `pages-deploy` job definitions in `.github/workflows/js.yml`.
- `related/deep-sdk-gh-pages.yml` - reference workflow from
  `deep-foundation/sdk`, which runs Pages on every push to `main` with no
  path filter.
- `related/js-template-links.yml` - reference workflow from
  `link-foundation/js-ai-driven-development-pipeline-template`, which uses
  GitHub-native `paths:` triggers instead of computed `if:` conditions.

## Timeline

| Time (UTC)        | Event                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-10 20:05  | Issue #20 merges (`430e960`). The previous separate `pages.yml` and `electron-release.yml` are deleted; everything moves to the single `js.yml`.                                                                                                                                                                                      |
| 2026-05-10 20:05  | Workflow run [25638487599](https://github.com/konard/vk-bot-desktop/actions/runs/25638487599) on main. `Build Pages site` and `Deploy Pages site` are **skipped** because only workflow files and docs changed.                                                                                                                       |
| 2026-05-10 20:38  | Issue #22 merges (`7fc4ed7`). Same skip pattern repeats.                                                                                                                                                                                                                                                                              |
| 2026-05-10 21:43  | Issue #24 merges (`8b7f3b6`). This PR touched `site/App.jsx` and `site/styles.css`, so `pages-changed=true` and Pages was successfully rebuilt and deployed.                                                                                                                                                                          |
| 2026-05-11 07:35  | Issue #26 merges (`dc70084`). Only `tests/oauth-callback.test.js` and docs changed in the per-commit diff. `pages-changed=false`, Pages is skipped, and the 0.9.14 release goes live without the download page being refreshed. The `Detect changes` log shows: `Changed files: tests/oauth-callback.test.js`, `pages-changed=false`. |
| 2026-05-11 ~11:30 | Issue #28 filed.                                                                                                                                                                                                                                                                                                                      |

## Requirements From Issue #28

1. Fix the broken CI/CD path that prevents GitHub Pages from being published.
2. Audit related earlier issues (#26, #22, #20, and prior) and verify their
   requirements are captured in `docs/REQUIREMENTS.md`.
3. Apply the best practices from the canonical templates referenced in the
   issue and report any matching defects upstream:
   - <https://github.com/link-foundation/js-ai-driven-development-pipeline-template>
   - <https://github.com/link-foundation/rust-ai-driven-development-pipeline-template>
   - <https://github.com/deep-foundation/sdk>
4. Compile all evidence and analysis under
   `docs/case-studies/issue-28/`.
5. Where the data does not pinpoint the root cause, add verbose output or a
   debug flag for the next iteration.

## Root Cause Analysis

### Cause 1: `pages-build` is gated on `pages-changed`, even on `main`

In `.github/workflows/js.yml` (introduced by issue #20's consolidation), the
condition is:

```yaml
pages-build:
  if: |
    always() &&
    !cancelled() &&
    !startsWith(github.ref, 'refs/tags/') &&
    ((github.event_name == 'workflow_dispatch' && github.event.inputs.release_mode == 'checks') ||
    needs.detect-changes.outputs.pages-changed == 'true')
```

`pages-changed` is computed by `scripts/detect-code-changes.mjs` from the
per-commit diff. It returns `true` only when the latest commit touched
`site/**`, `scripts/build-site.mjs`, `scripts/test-pages-e2e.mjs`,
`package.json`, `package-lock.json`, or `.github/workflows/js.yml`.

`pages-deploy` `needs: [pages-build]`, so when the build is skipped the
deploy is skipped too. Three of the last four main runs satisfied this
condition (no site files in the diff) and therefore did not republish the
site, even though new releases were being cut.

This breaks requirement #19: the deployed download page renders the latest
release returned by the GitHub Release API. After a tag push the API serves
new data, but the static bundle that fetches it is never rebuilt. The
download page also exposes localized text and assets that changed in
unrelated PRs (e.g. macOS Gatekeeper guidance from #24, OAuth/landing UX
from #26). Whether or not the bundle itself needed a rebuild, the deploy
step is the contract: every `main` push must republish so the previous
deploy is never left stale.

Additionally, `refs/tags/v*` pushes also publish through `js.yml`. The
trigger fires (line 8 declares `tags: ['v*.*.*']`), but `detect-changes`
short-circuits with `if: !startsWith(github.ref, 'refs/tags/')`, leaving
`needs.detect-changes.outputs.pages-changed` empty. The `pages-build`
condition then also has `!startsWith(github.ref, 'refs/tags/')`, so tag
pushes never republish the site either. The new release becomes the
authoritative version, but the download page that points users at it is not
refreshed for that event.

### Cause 2: `detect-code-changes.mjs` confuses merge commits with PR events

```javascript
function isMergeCommit() {
  const parentCount = exec('git cat-file -p HEAD')
    .split('\n')
    .filter((line) => line.startsWith('parent ')).length;
  return parentCount > 1;
}
```

The script branches on `isMergeCommit()` and assumes any merge commit means
GitHub created a synthetic merge for a `pull_request` event. It then diffs
`HEAD^2^..HEAD^2`, which is the per-commit diff of the PR head.

On `main`, every release lands as a real merge commit (the project uses the
"Merge pull request" button rather than squash). On those pushes the script
also takes the "merge commit" branch and compares `HEAD^2^..HEAD^2`. This:

- Drops the merge's full content. The diff covers only the PR head's last
  commit, hiding earlier commits from the same PR and any post-merge
  changes.
- Misclassifies the event semantically. The change detection should be
  driven by `$GITHUB_EVENT_NAME`, not by counting parents.

In the failing run (`25656741546`) the script reported
`Merge commit detected (pull_request event)` while running on a `push` event
to `main`. The diff therefore only saw `tests/oauth-callback.test.js`, even
though the merge introduced site-adjacent docs, screenshots, and changeset
files too.

### Cause 3: no verbose / debug switch

When `detect-code-changes.mjs` decides what changed, it prints the file list
but does not echo `$GITHUB_EVENT_NAME`, `$GITHUB_REF`, the merge-commit
parents, or the comparison base/head SHAs. A future regression would force
us to download the raw log and re-derive the inputs by hand. Adding an
opt-in verbose mode (or simply printing event metadata unconditionally) is
the minimal next-iteration trace requirement from `REQUIREMENTS.md`.

## Comparison With Reference Templates

| Source                                                                                         | Pages trigger                                 | Path filter                                                                | Notes                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deep-foundation/sdk` `.github/workflows/gh-pages.yml`                                         | `push.branches: [main]` + `workflow_dispatch` | None                                                                       | Every push to `main` rebuilds and redeploys the site. Concurrency `group: pages, cancel-in-progress: false` ensures queued deploys complete.                                                                                               |
| `link-foundation/js-ai-driven-development-pipeline-template` `.github/workflows/links.yml`     | `push.branches: [main]` + `pull_request`      | Trigger-level `paths: ['**.md', '**.html', '.github/workflows/links.yml']` | Uses GitHub-native `paths:` instead of a computed `if:`. Skips are visible at the trigger layer rather than as `skipped` jobs in a green run, which is harder to spot.                                                                     |
| `link-foundation/rust-ai-driven-development-pipeline-template` `.github/workflows/release.yml` | Release-only                                  | n/a                                                                        | Does not deploy Pages; not applicable to this fix.                                                                                                                                                                                         |
| `konard/vk-bot-desktop` `.github/workflows/js.yml` (current)                                   | `push.branches: [main]`, `push.tags`, PR      | None at trigger level; per-commit `pages-changed` filter inside the `if:`  | `pages-build` skips on main pushes that do not touch site files, **and** on tag pushes (because of `!startsWith(github.ref, 'refs/tags/')`). Combined with the merge-commit detection bug, this hides regressions inside a green main run. |

The reference templates make two things explicit:

- The deploy step should not be conditioned on per-commit content for the
  main branch. If you want path-based filtering, do it at the trigger layer
  so the workflow run does not exist at all, instead of finishing as a
  green run with a silently skipped deploy.
- Tag pushes should always republish artifacts that point at the new
  release.

## Solution Plan

The fix has three parts, all in this PR:

### 1. `.github/workflows/js.yml`

Replace the `pages-build` / `pages-deploy` conditions so that:

- Every push to `refs/heads/main` rebuilds and redeploys the site.
- Every tag push under `refs/tags/v*.*.*` rebuilds and redeploys the site,
  so the download page picks up the freshly published release.
- Pull requests still build (and smoke-test) the site only when site or
  workflow files change, to keep PR feedback fast.
- `workflow_dispatch` with `release_mode: 'checks'` still runs the build,
  matching today's behavior.

### 2. `scripts/detect-code-changes.mjs`

- Use `$GITHUB_EVENT_NAME` to decide which diff range to use, instead of
  counting parents on `HEAD`.
- For `pull_request` events on a synthetic merge commit, keep the
  `HEAD^2^..HEAD^2` strategy.
- For all other events (including `push` of a real merge commit to `main`),
  use `HEAD^..HEAD`.
- Print the event name, ref, head SHA, merge-parent count, and the actual
  diff command at the top of the log so future regressions are diagnosable
  without re-running the workflow. This addresses the
  "add verbose output if not present" clause from issue #28.

### 3. Tests

Add a Node `node:test` unit test that runs the script as a CLI in temporary
git repositories simulating four scenarios:

- `push` event, non-merge commit on `main` -> diff is `HEAD^..HEAD`.
- `push` event, merge commit on `main` -> diff is `HEAD^..HEAD`, **not**
  `HEAD^2^..HEAD^2`. This is the regression test for Cause 2.
- `pull_request` event with a synthetic merge commit -> diff is
  `HEAD^2^..HEAD^2`.
- A change to `site/App.jsx` correctly sets `pages-changed=true`.

This is the minimum reproducible example for the bug and prevents the
regression from coming back.

### 4. Documentation

- `docs/REQUIREMENTS.md`: extend the Release And Distribution / Testing
  sections to encode the corrected contract, namely "every push to main
  must republish the Pages download page" and "release tag pushes must
  republish the Pages download page". The existing requirement #19 only
  talks about what the page must render; this clarifies when it must be
  rebuilt.
- This case study.

### Out Of Scope For This PR

- Reporting the same regression upstream to
  `link-foundation/js-ai-driven-development-pipeline-template`: the
  upstream template does **not** consolidate Pages into the same workflow,
  so it is not affected by the same bug. The template's `links.yml`
  pattern (trigger-level `paths:`) is the pattern we are adopting in spirit
  through the new `if:` semantics. Filed `notes/upstream-templates.md`
  observation: no upstream issue is necessary because the bug is unique to
  the consolidated workflow this repository introduced in issue #20.

## How To Reproduce

1. From `main`, create a branch with a one-line change to any non-site
   file (for example, a comment in `tests/`).
2. Open a PR and merge with "Merge pull request" (a real merge commit,
   not squash).
3. Watch the post-merge `JavaScript CI/CD` run on `main` finish green,
   but the `Build Pages site` and `Deploy Pages site` jobs show
   `skipped`.
4. The site at <https://konard.github.io/vk-bot-desktop/> retains the
   previous deploy.

With the fix in this PR, step 3 instead produces successful
`Build Pages site` and `Deploy Pages site` runs.

## Verification

- Local unit test in `tests/detect-code-changes.test.js` simulates the
  four scenarios above and asserts the expected diff ranges and
  `pages-changed` outputs.
- Once merged, the next `main` push and the next release tag push must
  show non-skipped `Build Pages site` and `Deploy Pages site` jobs.

## Follow-Up: Run 25668347176 (PR #30)

After PR #29 merged, the next `main` push (release 0.9.15 on commit
`6b035f8`, run [25668347176](https://github.com/konard/vk-bot-desktop/actions/runs/25668347176))
no longer skipped Pages: `Build Pages site` succeeded and the artifact
was deployed. The run still reported failure because the new step
`Test published Pages site after deploy` aborted with:

```
Error: Release request failed: 403
    at fetchLatestRelease (file:///.../scripts/test-pages-e2e.mjs:175:11)
```

### Root cause

`scripts/test-pages-e2e.mjs` in `--url` mode calls
`https://api.github.com/repos/konard/vk-bot-desktop/releases/latest`
without a token unless `GH_TOKEN` is set in the environment. The new
"Test published Pages site after deploy" step in
`.github/workflows/js.yml` did not pass `GH_TOKEN`, so the request was
unauthenticated. Hosted GitHub Actions runners share an IP-pool quota
of 60 requests/hour for unauthenticated calls; the same pool is used by
every workflow on every repository, so the limit is effectively always
exhausted on busy runner pools. Authenticated requests use the per-token
5000 requests/hour quota and would not run out.

The `Build Pages site` step does not hit this code path because it runs
the script with `--site-dir`, which uses an in-process fixture
(`makeReleaseFixture`) and intercepts `RELEASE_API_URL` via Playwright's
`page.route`.

### Captured evidence

- `data/run-25668347176.json` — job-level summary showing
  `Deploy Pages site` failed while `Build Pages site` succeeded.
- `data/run-25668347176-deploy-pages.txt` — log slice for the
  `Deploy Pages site` job, including the 403 stack trace at
  `2026-05-11T11:52:37.7692134Z`. The full multi-megabyte workflow
  log is not committed.
- `data/issue-28-comments.json` — refreshed comment list linking the
  follow-up failure to PR #29.

### Fix in this PR (PR #30)

1. `.github/workflows/js.yml` — pass `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
   to the post-deploy `Test published Pages site after deploy` step so
   the Release API call runs authenticated. The pre-deploy step is
   unchanged because it uses the fixture, not the API.
2. `scripts/test-pages-e2e.mjs` — on a failing Release API response,
   print the `x-ratelimit-*` headers, whether the request was
   authenticated, and the truncated response body to standard error
   before throwing. A future 403 will then be self-diagnosing from the
   workflow log without re-running, addressing the
   "verbose tracing for the next iteration" clause from issue #28.
3. `tests/pages-site.test.js` — two regression tests: one asserts the
   workflow step has `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` set, the
   other asserts the script emits the rate-limit diagnostics. Both
   prevent a refactor from silently re-introducing the regression.
4. `docs/REQUIREMENTS.md` — added requirements #31 and #32 encoding the
   authenticated-call contract and the rate-limit verbose-output
   contract.

### How to reproduce

1. Locally, unset `GH_TOKEN` and run
   `node scripts/test-pages-e2e.mjs --url https://konard.github.io/vk-bot-desktop/`
   from a runner IP that has already exceeded the 60/hr unauthenticated
   quota. The script aborts with
   `Release request failed: 403 (authenticated=false)`.
2. Set `GH_TOKEN=$(gh auth token)` and re-run; the script proceeds to
   the Playwright validation phase.

The fix is verified by:

- `node --test tests/pages-site.test.js` (11/11 pass locally).
- After this PR merges to main, the next `main` push run must show
  `Deploy Pages site` and its `Test published Pages site after deploy`
  step both succeed.

### Upstream observation

`link-foundation/js-ai-driven-development-pipeline-template`'s
`.github/workflows/links.yml` already passes `GITHUB_TOKEN` to its
`lycheeverse/lychee-action@v2` step for the same reason
(unauthenticated GitHub API requests on hosted runners hit the IP-pool
quota). Our consolidated `js.yml` follows the same pattern for every
other GitHub-API-touching step (`Release`, `Publish GitHub release`,
`Resolve desktop release context`, etc.). The post-deploy Pages smoke
test was the lone exception until this PR. No upstream issue is filed
because the template does not have a Pages-deploy-followed-by-API-smoke
step that could exhibit the same bug.
