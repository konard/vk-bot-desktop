# Issue 37 Case Study: Embedded VK OAuth Token Capture

## Scope

Issue: [konard/vk-bot-desktop#37](https://github.com/konard/vk-bot-desktop/issues/37)

Pull request:
[konard/vk-bot-desktop#38](https://github.com/konard/vk-bot-desktop/pull/38)

Branch: `issue-37-8ad5e669dedf`

The issue reports that the experimental localhost VK OAuth redirect fails for
the Kate Mobile app id and asks whether VK Bot Desktop can instead open the
working `https://oauth.vk.com/blank.html` flow in an Electron window, capture
the final `#access_token=...` URL, and avoid manual copy/paste.

## Captured Evidence

Local evidence files:

- `data/issue-37.json` - original issue body and metadata.
- `data/issue-37-comments.json` - issue comments at investigation time.
- `data/pr-38-before.json` - prepared draft PR state before implementation.
- `data/pr-38-review-comments-before.json` - PR inline comments before work.
- `data/pr-38-conversation-comments-before.json` - PR conversation comments
  before work.
- `data/pr-38-reviews-before.json` - PR reviews before work.
- `data/ci-runs-before.json` - CI run list before implementation.
- `data/konard-oauth-blank-code-search.txt` and
  `data/konard-kate-mobile-client-code-search.txt` - GitHub code search
  snapshots for related OAuth usage.
- `data/related-merged-prs-oauth.json` - recent merged OAuth-related PR
  context.
- `data/online-research.md` - online source notes.
- `data/reproducing-oauth-window-test-before.log` - failing regression test
  before implementation.
- `data/oauth-window-test-after.log` - focused regression test pass after
  implementation.

Issue screenshots:

- `screenshots/invalid-localhost-redirect.png` - VK rejects
  `http://localhost:26852/vk-oauth`.
- `screenshots/vk-oauth-continue.png` - the working VK ID authorization screen.
- `screenshots/vk-oauth-blank-warning.png` - the final VK blank page after
  authorization.
- `screenshots/renderer-token-button-after.png` - rendered desktop settings
  after replacing the broken localhost button with the embedded auth action.

The screenshot downloads were verified as PNG files by checking their magic
bytes (`89 50 4e 47 0d 0a 1a 0a`) because the `file` utility is not installed
in the investigation container.

## Timeline

1. 2026-05-11: PR #27 merged issue #26, adding the Kate Mobile token URL,
   manual redirect URL parsing, and an experimental localhost redirect button.
2. 2026-05-12 15:10 UTC: Issue #37 was opened with evidence that VK rejects the
   localhost redirect URI for app id `2685278`.
3. 2026-05-12 15:13 UTC: Draft PR #38 was created from
   `issue-37-8ad5e669dedf`.
4. 2026-05-12: Regression tests were added first and failed because the app
   still opened OAuth externally and still contained the localhost redirect
   path.
5. 2026-05-12: The implementation replaced the user-facing localhost flow with
   an embedded Electron authorization window that captures the VK blank-page
   redirect.

## Requirements

| Requirement                                | Resolution                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnose the localhost redirect failure    | The URL is rejected by VK before a local callback can run, so the root cause is app redirect URI configuration for app id `2685278`, not the local HTTP server. |
| Avoid manual token copy/paste              | The app now opens the Kate Mobile OAuth URL inside an Electron auth window and captures the `blank.html#access_token=...` navigation directly.                  |
| Close the auth window after token capture  | The main process emits `vkbot:token` and closes the authorization window immediately after extracting a token.                                                  |
| Remove the dead-end localhost option       | The renderer no longer imports or renders the experimental localhost button, and `electron/main.cjs` no longer whitelists the localhost redirect URL.           |
| Keep pasted redirect URL/raw token support | `extractVkAccessToken()` in the renderer still accepts a full VK redirect URL or a raw token.                                                                   |
| Preserve evidence and analysis             | Issue/PR JSON, comments, screenshots, online research, and test logs are stored under `docs/case-studies/issue-37`.                                             |

## Root Cause

The rejected URL used:

```text
https://oauth.vk.com/authorize?...&redirect_uri=http://localhost:26852/vk-oauth&...
```

VK returned:

```json
{
  "error": "invalid_request",
  "error_description": "redirect_uri is incorrect, check application redirect uri in the settings page"
}
```

That means VK did not redirect to the local server at all. The previous local
callback page could only work after VK accepted the redirect URI; it could not
fix a provider-side redirect mismatch.

## Solution

The selected solution keeps the known working Kate Mobile OAuth URL:

```text
https://oauth.vk.com/authorize?client_id=2685278&scope=1073737727&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1
```

Instead of opening it in the external browser, Electron now opens a constrained
authorization `BrowserWindow`. The main process observes `will-redirect`,
`will-navigate`, `did-navigate`, and `did-navigate-in-page`, extracts tokens
only from `https://oauth.vk.com/blank.html`, sends the token to the renderer,
and closes the auth window.

Navigation in the auth window is restricted to VK authorization hosts. Unknown
external targets are denied in the embedded window and opened externally.

## Alternatives Considered

Registering a custom application protocol would require a VK app configuration
that accepts the custom redirect URI plus OS-level protocol registration. That
does not help the current Kate Mobile app id flow.

Keeping the localhost redirect hidden behind an "experimental" button would
preserve a known-broken path for the current app id. Removing the user-facing
path is clearer.

Parsing the final blank-page body text was unnecessary. The token is in the URL
fragment, and Electron navigation events expose the URL needed for extraction.

## Verification

Automated checks:

- `tests/oauth-token.test.js` verifies token extraction from
  `oauth.vk.com/blank.html#access_token=...`, rejects localhost redirects for
  the embedded capture helper, and validates allowed auth navigation hosts.
- `tests/vk-token.test.js` verifies the renderer keeps the Kate Mobile URL,
  still parses pasted redirect URLs/raw tokens, and that main process wiring uses
  an Electron auth window rather than the localhost redirect URL.

Saved local logs:

- `data/reproducing-oauth-window-test-before.log` - failing test before the
  implementation.
- `data/oauth-window-test-after.log` - focused OAuth tests passing after the
  implementation.
- `data/npm-ci.log` - attempted clean install; failed because the pre-existing
  lockfile is out of sync with `package.json`.
- `data/npm-install.log` - dependency installation for local verification using
  `--package-lock=false` to avoid unrelated lockfile churn.
- `data/npm-test-after.log` - full Node test suite pass.
- `data/npm-check-after.log` - lint, format, and duplication checks pass.
- `data/build-renderer-after.log` - renderer build pass.
- `data/deno-test-after.log` - Deno test suite pass.
- `data/bun-test-after.log` - Bun test suite pass.
- `data/validate-changeset-after.log` - changeset validation pass.
- `data/git-diff-check-after.log` - whitespace check pass.
- `data/secretlint-after.log` - CI secret scan pass.
- `data/renderer-static-server.log` - local static server log for the renderer
  screenshot.
