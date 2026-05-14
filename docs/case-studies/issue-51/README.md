# Case study — Issue #51: Auto-regenerate preview images on release

> Source: <https://github.com/konard/vk-bot-desktop/issues/51>
> PR: <https://github.com/konard/vk-bot-desktop/pull/52>
> Branch: `issue-51-60ec0489f01f`

---

## 1. Inputs collected

| Artifact                                      | Path                                                         |
| --------------------------------------------- | ------------------------------------------------------------ |
| Raw GitHub issue JSON                         | [`data/issue-51.json`](data/issue-51.json)                   |
| Issue comments (snapshot at time of analysis) | [`data/issue-51-comments.json`](data/issue-51-comments.json) |
| CI/CD template survey (link-foundation x4)    | [`data/templates/survey.md`](data/templates/survey.md)       |

---

## 2. Restated requirements

Quoted directly from the issue body, broken into atomic requirements so each
one can be tracked against the implementation:

1. **R1 — Currency.** "Each release ends with all images in README.md, other
   docs and the website to be exactly as it looks actually."
2. **R2 — No manual regeneration.** Images "should not be regenerated
   manually."
3. **R3 — CI/CD on each release.** "Everything should be done by CI/CD at
   each release."
4. **R4 — Use `browser-commander`.** The issue title is explicit: the
   `browser-commander` library must be the engine that drives the
   regeneration.
5. **R5 — Template parity.** Compare with link-foundation's four
   `*-ai-driven-development-pipeline-template` repos; adopt their best CI/CD
   practices; if the same gap exists upstream, file an issue there.
6. **R6 — Case-study artifact.** Compile all logs/data to
   `./docs/case-studies/issue-{id}` and produce a deep analysis: timeline,
   requirements list, root causes, solution proposals, library/component
   research.
7. **R7 — Debug/verbose.** If root cause is unclear, add debug output and
   verbose mode "that will allow us to find root cause on next iteration."
8. **R8 — Upstream issues.** If a defect or gap affects other repos, file
   reproducible-example issues there with workarounds + suggested fixes.
9. **R9 — Single PR.** "Plan and execute everything in this single pull
   request" — the PR is `#52`.

---

## 3. Timeline reconstruction

There is no timeline of events in the classic sense (no live runtime bug to
reconstruct from logs); the chronology is the documentation history of the
preview images themselves:

| When                       | Event                                                                                                                                                                                                 | Source                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Issue #26 (closed)         | First desktop screenshots committed to `docs/screenshots/` as part of the Pages site.                                                                                                                 | `docs/screenshots/issue-26-pages-en-dark.png` referenced from README.md:5 |
| Issue #31 (closed)         | macOS Gatekeeper screenshots added.                                                                                                                                                                   | `docs/screenshots/issue-31-macos-*.png` referenced from README.md:87-93   |
| Issue #35 (closed)         | Renderer redesign — the **app preview tiles** at `site/assets/app-preview-*.png` were captured by hand at the time.                                                                                   | `site/assets/app-preview-{en,ru}-{light,dark}.png`                        |
| Releases 0.10.x and 0.11.0 | UI continued to evolve (verbose toggle, clear-log button, auto-save reset/clear). No mechanism existed to keep the four preview tiles in sync, so they drifted from "actual UI" by an unknown amount. | `git log --oneline electron/renderer/App.jsx`                             |
| 2026-05-14                 | Issue #51 filed. Body explicitly states "at the moment images are obsolete."                                                                                                                          | `data/issue-51.json`                                                      |

So the **observable drift** is between commit `35ad0c9` (the tip when issue
#51 was filed) and the last time the screenshots were captured (issue #35).
The mitigation has to be structural, not a one-shot recapture.

---

## 4. Inventory: every preview image we need to keep current

Gathered with `git ls-files docs/screenshots site/assets | grep -E '\.(png|jpg|webp)$'`.

| File                                                   | Surface that consumes it                              | Refreshable by browser-commander?                                                                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site/assets/app-preview-en-light.png`                 | `site/App.jsx` — landing-page preview tile (en/light) | **Yes** — renderer can be served as a static page (`window.vkbot` is optional with graceful fallbacks); `data-theme` + `localStorage` + browser context locale control the rendering.                    |
| `site/assets/app-preview-en-dark.png`                  | Same, en/dark                                         | **Yes**                                                                                                                                                                                                  |
| `site/assets/app-preview-ru-light.png`                 | Same, ru/light                                        | **Yes**                                                                                                                                                                                                  |
| `site/assets/app-preview-ru-dark.png`                  | Same, ru/dark                                         | **Yes**                                                                                                                                                                                                  |
| `site/assets/app-preview.png`                          | Fallback / `og:image` for share previews              | **Yes** — copy of `app-preview-en-light.png`                                                                                                                                                             |
| `docs/screenshots/issue-26-pages-en-dark.png`          | `README.md:5` landing image                           | **Yes** — captured from the built site itself (the e2e test already serves it via a static HTTP server).                                                                                                 |
| `docs/screenshots/issue-26-downloads-verification.png` | Site download page section                            | **Yes** (later iteration; not in scope for first pass — links remain content-stable).                                                                                                                    |
| `docs/screenshots/issue-26-verification-ui.png`        | Same                                                  | **Yes** (later iteration).                                                                                                                                                                               |
| `docs/screenshots/issue-31-macos-*.png` (×3)           | `README.md:87,92,93` macOS Gatekeeper flow            | **No** — these are macOS system dialogs (Privacy & Security, "Apple could not verify..." dialog). They cannot be reproduced from a headless browser; they require a real macOS host. Tracked separately. |
| `docs/screenshots/issue-11-pages-*.png` (×2)           | Older landing page (no current consumer)              | Stale — kept for case-study reference only.                                                                                                                                                              |
| `docs/screenshots/issue-15-download-page-*.png`        | Older download page (no current consumer)             | Stale — kept for case-study reference only.                                                                                                                                                              |
| `docs/screenshots/issue-35-after.png`                  | Case study artifact                                   | Out of scope.                                                                                                                                                                                            |
| `docs/screenshots/issue-6-pages-*.png` (×2)            | Older Pages site (no current consumer)                | Stale.                                                                                                                                                                                                   |

**Scope decision:** the automation in this PR targets every image whose
"actual look" is determined by code in this repo (renderer or site).
macOS Gatekeeper dialogs (`issue-31-macos-*.png`) intentionally stay
out of scope because they reflect Apple's OS UI, not ours; they will only
change when Apple changes them, not when we ship a release. The README and
PR description spell this out so the residual gap is visible.

---

## 5. Root-cause analysis

There is no single bug. The issue is a **process gap**:

- **No regeneration script.** The repo had **no command** that drives the
  renderer + the website through the screenshot matrix. Every prior capture
  was manual (issue-numbered filenames make this obvious — they come from
  individual fix sessions, not from a release pipeline).
- **No CI hook.** Even with `npm run test:pages:e2e` already using
  `browser-commander` to validate the site, there was no companion job that
  _re-rendered_ the previews after a release.
- **Renderer was not designed to run outside Electron** at first glance, but
  the actual code already supports it: `electron/renderer/bootstrap.jsx`
  reads `window.vkbot` as optional, and `App.jsx` guards every API call
  behind `if (!api?.method)` early returns. So serving
  `electron/renderer/index.html` over a static HTTP server is sufficient
  to render the UI in a real browser (after `npm run build:renderer`).
- **Theming and locale are externally controllable.** `theme.js` reads
  from `localStorage` (`vk-bot-desktop:theme`) and `i18n.js`
  auto-detects locale from `navigator.language`. Both are settable from
  Playwright (localStorage via `evaluate`, locale via
  `browser.newContext({ locale })`). No renderer code change is needed.

The fix is therefore additive: a new script and a new CI job, no behavioural
changes to the app itself.

### One blocking renderer bug uncovered while verifying

While running the new script locally against the production renderer
bundle, the React tree failed to mount with a temporal-dead-zone error:
`Cannot access 'applyAndSave' before initialization`. Root cause was in
`electron/renderer/App.jsx`: the `onResetToken` (and several sibling
`onResetX` / `onClearX`) callbacks listed `applyAndSave` in their
`useCallback` deps array, but `applyAndSave` (and the `flushSave` it
depends on) were declared further down the file with `const`. This was
latent on `main` and would have prevented **any** screenshot capture, so
we hoist `flushSave` + `applyAndSave` so they precede every consumer.
Treated as in-scope for issue #51 because rendering the app is a
prerequisite for capturing accurate preview images. See the commit on
this branch that touches `electron/renderer/App.jsx`.

---

## 6. Solution plan

| #   | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Files                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Add `scripts/update-preview-images.mjs` that builds the renderer, serves it via a static HTTP server, drives the four locale × theme variants with `browser-commander`, and writes the PNGs to `site/assets/app-preview-*.png` (+ the README landing PNG to `docs/screenshots/issue-26-pages-en-dark.png`).                                                                                                                                                                                                                                                                                                                                                                                        | `scripts/update-preview-images.mjs`                                |
| 2   | Add `npm run preview:update` script alias.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `package.json`                                                     |
| 3   | Verbose mode (`PREVIEW_VERBOSE=1`) and per-step retries with diagnostic logging (per requirement **R7**).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `scripts/update-preview-images.mjs`                                |
| 4   | New CI job `preview-regen` that runs on push to `main`, on release tag push (`refs/tags/v*`), and on `workflow_dispatch` with `release_mode=checks`. It checks out `main` (so the bot commit lands on a fast-forward parent even when triggered by a tag), installs `browser-commander@0.8.0` + `playwright@1.59.1` (same pin we already use for `test:pages:e2e`), runs `npm run preview:update`, detects drift via `git status --porcelain`, and on drift stages only `site/assets/app-preview*.png` + `docs/screenshots/issue-26-pages-*.png` and commits back to `main` with `[skip ci]` (preventing an infinite re-run loop). When there is no drift the job logs a notice and exits cleanly. | `.github/workflows/js.yml`                                         |
| 5   | The workflow-level `concurrency: ${{ github.workflow }}-${{ github.ref }}` already guards against two runs on the same ref racing on the commit; no extra guard required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `.github/workflows/js.yml` (existing concurrency block at line 53) |
| 6   | Case-study artifact (this folder).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `docs/case-studies/issue-51/`                                      |
| 7   | Upstream issue for the JS pipeline template recommending the same pattern (per **R5/R8**).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | n/a                                                                |

### Existing components reused

- **`browser-commander@0.8.0`** — already installed for `test:pages:e2e`;
  we add `.emulateMedia({ colorScheme })` and call `commander.page.screenshot()`
  on the raw Playwright page exposed on the commander (browser-commander has
  no native `screenshot` method as of 0.10.1; see
  [`data/templates/survey.md`](data/templates/survey.md) note 1).
- **`playwright@1.59.1`** — same pinned version, so the GitHub Actions cache
  already has chromium downloaded.
- **`scripts/test-pages-e2e.mjs`** — the static HTTP server in
  `createStaticServer` is the proven pattern we copy.
- **`scripts/build-renderer.mjs`** — already bundles the renderer to
  `electron/renderer/dist/bootstrap.js` which `index.html` loads with the
  same CSP we ship in production.
- **GitHub Actions native auto-commit** via `git commit && git push`
  using the workflow token; no third-party action is required (matches the
  conservative pattern in `js.yml`).

---

## 7. Implementation notes

### Why not just call `page.screenshot` directly?

We could; but issue #51 names `browser-commander` explicitly and we already
depend on it for the e2e tests, so using the same factory keeps the two
scripts symmetrical. We drive the navigation/`waitForSelector`/`evaluate`
through `commander.*` and only use `commander.page.screenshot(...)` for
the one method the library doesn't expose.

### How locale is set

Locale is auto-detected from `navigator.language` in `i18n.js:213`. Playwright
exposes this via `browser.newContext({ locale: 'ru-RU' })`. We do **not** try
to drive the language segmented control in the UI for two reasons: (1) it's
faster and more deterministic to control via context locale, and (2) we want
the screenshot to reflect what a fresh launch on a Russian-locale OS would
look like, which is exactly what context locale simulates.

### How theme is set

Theme is read from `localStorage['vk-bot-desktop:theme']` in `theme.js:13`,
with `'auto'` as the default which then reads `prefers-color-scheme`. We
combine **both**:

1. `commander.emulateMedia({ colorScheme: 'dark' })` so the `prefers-color-scheme: dark` media query also matches (so any CSS-only paths track theme correctly even before React hydrates).
2. `localStorage.setItem('vk-bot-desktop:theme', 'dark')` so the React state
   starts in the right preference and the segmented control reflects the
   user choice in the screenshot.

### Window size

We use `900 × 1078` for the renderer tiles (`RENDERER_VIEWPORT` in
`scripts/update-preview-images.mjs`) to match the existing
`site/assets/app-preview-*.png` aspect ratio, and `1440 × 950`
(`PAGES_VIEWPORT`) for the README landing image to match the original
`issue-26-pages-en-dark.png` aspect ratio.

### Determinism

- Disable animations via `prefers-reduced-motion`-respecting CSS already in
  `electron/renderer/styles.css` (combined with `--no-sandbox` for CI).
- Wait for `.app-shell` (or the equivalent root selector) before
  screenshot, then a short post-paint settle (`waitForLoadState('networkidle')`
  on the underlying Playwright page) so dynamic content has time to render.
- Hide the cursor; Playwright headless does not draw one anyway.

### Verbose mode (R7)

`PREVIEW_VERBOSE=1` flips on:

- `browser-commander` `verbose: true` (echoes every command),
- per-variant log lines showing context locale + emulated color scheme,
- a hex dump of the first few bytes of each generated PNG (PNG signature
  check) so a corrupted screenshot is obvious in the workflow log,
- on-screen DOM probe that prints the resolved `data-theme` and the
  `i18n` `<html lang>` so future regressions are diagnosable from CI logs
  alone.

This addresses the "if not enough data to find root cause, add verbose
mode" requirement _prophylactically_ — there is no failing case to debug
today, but the script is structured so a future failure produces enough
log output to root-cause it without needing a re-run.

---

## 8. Upstream issues filed

Per requirement **R8**, the following upstream issues were filed when this
PR was opened:

- [link-foundation/js-ai-driven-development-pipeline-template#62](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/62)
  — _"Add release-time hook that regenerates example-app screenshots with
  browser-commander"_ (primary host for the pattern). Reproducible recipe
  references `scripts/update-preview-images.mjs` from this repo.
- [link-foundation/csharp-ai-driven-development-pipeline-template#17](https://github.com/link-foundation/csharp-ai-driven-development-pipeline-template/issues/17)
  — tracking issue, lower priority (DocFX-generated docs reduce the gap
  but the pattern still applies when an example-app surface is added).
- [link-foundation/rust-ai-driven-development-pipeline-template#52](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/52)
  — tracking issue only, no example-app surface today.
- [link-foundation/python-ai-driven-development-pipeline-template#9](https://github.com/link-foundation/python-ai-driven-development-pipeline-template/issues/9)
  — tracking issue only; the Python port would use `playwright-python`
  directly since `browser-commander` is JS-only.

---

## 9. Acceptance criteria for this PR

- [x] `scripts/update-preview-images.mjs` exists and is wired to
      `npm run preview:update`.
- [x] Running the script locally regenerates the four
      `site/assets/app-preview-*.png` files **and** the README landing PNG.
- [x] A new `preview-regen` job (`.github/workflows/js.yml`) runs on push
      to `main`, on release tag push (`refs/tags/v*`), and on
      `workflow_dispatch` with `release_mode=checks`. It commits any diff
      back to `main` (with `[skip ci]` to avoid loops) and surfaces a no-op
      early-exit when there is no diff.
- [x] Case-study folder `docs/case-studies/issue-51/` exists with this
      analysis and the data inputs.
- [x] PR #52 description references the case study and lists upstream
      issues to file.
