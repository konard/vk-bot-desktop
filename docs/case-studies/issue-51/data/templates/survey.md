# link-foundation CI/CD template survey (issue #51)

The issue asks us to compare with the four link-foundation
ai-driven-development-pipeline-template repositories
(js / rust / python / csharp) and reuse their best CI/CD practices.

Inspection was done with `gh api repos/{owner}/{repo}/contents/...` and
`gh repo view ... --json defaultBranchRef,languages`. No clones.

## Per-template findings

### js-ai-driven-development-pipeline-template

- `.github/workflows/`: `example-app.yml`, `links.yml`, `release.yml`.
- No matches for `playwright`, `puppeteer`, `screenshot`, `preview`,
  `browser-commander`, `chromium`, `headless` in any workflow.
- `scripts/` (23 files): changesets, version bumping, npm publishing,
  release notes, code-change detection. **No browser/screenshot tooling.**
- No open issue tracks "auto-regenerate screenshots/preview images on release".
- Reusable patterns:
  - branch-scoped `concurrency` with `cancel-in-progress` only on `main`,
  - `detect-code-changes.mjs` (already vendored into vk-bot-desktop),
  - `check-release-needed.mjs`,
  - `simulate-fresh-merge.sh` (already vendored).

### rust-ai-driven-development-pipeline-template

- Single workflow `release.yml`. No browser keywords.
- `scripts/` (15 `.rs` files via rust-script): changelog fragments, crate
  publish, version bumping. **No screenshot tooling.**
- Closed issue #22 ("integrate best practices from browser-commander CI/CD
  fixes") refers to release plumbing, not previews.
- Reusable patterns: `auto-release` job, `always() && !cancelled()` gating,
  `workflow_dispatch` with `release-mode` input.

### python-ai-driven-development-pipeline-template

- Single workflow `release.yml`. No browser keywords.
- `scripts/` (9 `.py` files): release / version / changeset only. **No
  screenshot tooling.**
- Open issue #8 requests GitHub Pages docs deployment parity (not previews).
- Reusable patterns: `concurrency: cancel-in-progress: true`, `auto-release`
  job, towncrier-style `changelog.d/`.

### csharp-ai-driven-development-pipeline-template

- Workflows: `docs.yml` (DocFX, not browser rendering), `release.yml`. No
  browser keywords.
- `scripts/` (13 `.mjs` + `.test.mjs` unit tests) — release plumbing only.
  **No screenshot tooling.**
- No related issues.
- Reusable patterns: scripts have co-located Bun-runnable unit tests;
  manual release-mode dispatch input.

## Cross-cutting observations

- **None** of the four templates ship Playwright / Puppeteer /
  browser-commander / screenshot logic in CI or scripts.
- Strong shared patterns worth adopting (some already adopted by
  vk-bot-desktop): branch-aware `concurrency.cancel-in-progress`,
  `detect-code-changes` gating release jobs, `check-release-needed`
  short-circuit, `workflow_dispatch` with `release-mode` / `bump-type`
  inputs, `auto-release` final job.
- **Gap:** no template addresses regenerating visual artifacts (README
  screenshots, preview PNGs) on release. This is the gap that issue #51
  closes for vk-bot-desktop and that we want to mirror upstream.

## Recommendation for upstream issues

1. **JS template (primary)** — same Node/mjs stack, already has
   `example-app.yml`, richest `scripts/` ecosystem. File a
   "regenerate example-app screenshots on release via browser-commander"
   issue there with a reproducible recipe that points at the script we
   land here.
2. **C# template (secondary)** — also `.mjs` scripts plus existing
   `docs.yml` step that could host the screenshot job.
3. **Rust / Python** — file tracking issues for parity only after JS lands.
