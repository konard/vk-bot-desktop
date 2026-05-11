---
'vk-bot-desktop': patch
---

Pass `GH_TOKEN` to the post-deploy GitHub Pages smoke test step in `.github/workflows/js.yml` so the GitHub Release API call inside `scripts/test-pages-e2e.mjs` runs authenticated. Without the token, hosted runners share the 60/hr unauthenticated IP-pool quota and the post-deploy smoke test intermittently fails with `Release request failed: 403`, marking the run as failed even when Pages itself deployed correctly. Also print the `x-ratelimit-*` headers, authentication state, and truncated response body on failure so future 403 regressions are diagnosable from the workflow log without re-running.
