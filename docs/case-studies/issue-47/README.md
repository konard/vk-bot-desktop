# Case Study: Issue #47 - Windows Desktop Release Smoke Test Parser Failure

Issue: https://github.com/konard/vk-bot-desktop/issues/47
Pull request: https://github.com/konard/vk-bot-desktop/pull/48

## Summary

The failed `JavaScript CI/CD` run built the Windows x64 and Windows ARM64
Electron artifacts, then failed before validating either artifact set because
PowerShell could not parse `scripts/smoke-test-windows-release-artifacts.ps1`.

The root cause was a PowerShell string interpolation mistake in the Windows
smoke-test helper: `"$Description: ..."` is parsed as a variable reference with
a scope-style colon suffix. PowerShell reports this as invalid and suggests
using `${}` to delimit the variable name. The same latent bug existed in the
ARM64 `7z` failure message as `$LASTEXITCODE:`.

## Captured Data

- Full failed run log:
  `docs/case-studies/issue-47/ci-logs/javascript-cicd-25803232931-full.log`
- Focused failed job logs:
  `docs/case-studies/issue-47/ci-logs/build-desktop-windows-x64-75799774576.log`
  and
  `docs/case-studies/issue-47/ci-logs/build-desktop-windows-arm64-75799774671.log`
- GitHub metadata:
  `docs/case-studies/issue-47/github-data/issue-47.json`,
  `docs/case-studies/issue-47/github-data/pr-48.json`,
  `docs/case-studies/issue-47/github-data/run-25803232931.json`,
  `docs/case-studies/issue-47/github-data/run-25803232931-artifacts.json`,
  `docs/case-studies/issue-47/github-data/main-runs-before-fix.json`, and
  `docs/case-studies/issue-47/github-data/branch-runs-before-fix.json`
- Reproducing test logs:
  `docs/case-studies/issue-47/github-data/reproducing-test-before-fix.log`
  and
  `docs/case-studies/issue-47/github-data/reproducing-test-after-fix.log`
- Template comparison data:
  `docs/case-studies/issue-47/template-data/`

## Timeline

- `2026-05-13T13:47:16Z`: run `25803232931` started on `main` at
  `1074118e18a942812cb7555f820e27f5ca555706`.
- `2026-05-13T13:55:41Z`: Windows x64 artifact generation completed and the
  smoke-test helper was launched.
- `2026-05-13T13:55:42Z`: Windows x64 failed with `ParserError` at
  `scripts/smoke-test-windows-release-artifacts.ps1:33`.
- `2026-05-13T13:56:58Z`: Windows ARM64 artifact generation completed and the
  same smoke-test helper was launched.
- `2026-05-13T13:56:59Z`: Windows ARM64 failed with the same parser error.
- `2026-05-13T14:27:52Z`: issue #47 was opened with links to both failed jobs.
- `2026-05-13T14:28:47Z`: draft PR #48 was opened for the fix branch.

## Requirements Checked

- Download and preserve the failed CI logs and related GitHub data.
- Reconstruct the event sequence and identify the root cause.
- Compare the repository CI/CD files against the linked JavaScript, Rust,
  Python, and C# AI-driven development pipeline templates.
- Search for additional facts relevant to the failure.
- Reproduce the failure with an automated test before fixing it.
- Implement the CI/CD fix and keep regression coverage.
- Report upstream template issues only if the same defect is present there.

## Root Cause

Both failed jobs reached `Smoke test Windows release artifacts`; neither failed
while Electron Builder produced the installer or portable executable. The x64
log shows the parser failure at lines 207-213 of
`build-desktop-windows-x64-75799774576.log`; the ARM64 log shows the same
failure at lines 208-214 of
`build-desktop-windows-arm64-75799774671.log`.

PowerShell expands variables in double-quoted strings. When literal characters
must immediately follow the variable name, braces can be used to delimit the
name. Microsoft Learn's `about_Quoting_Rules` documentation specifically calls
out the colon case: a variable followed by `:` should be written with braces,
for example `${HOME}:`.

The smoke-test helper used:

```powershell
Write-Host "$Description: $($item.FullName) ($($item.Length) bytes)"
```

PowerShell parsed `$Description:` as a malformed variable reference, so the
script failed before any validation code ran. The helper also had a latent
copy of the same pattern:

```powershell
throw "7z integrity check failed with exit code $LASTEXITCODE: ..."
```

## Solutions Considered

- Use `${Description}:` and `${LASTEXITCODE}:`. This is the smallest fix,
  matches PowerShell's documented variable delimiter syntax, and preserves the
  current log messages.
- Use subexpressions such as `$($Description):`. This also works, but braces are
  clearer when interpolating a simple variable name.
- Rewrite the output lines with the `-f` format operator. That avoids
  interpolation ambiguity, but it is a larger style change for two messages.
- Add a full PowerShell parse step to local tests. This would be stronger, but
  `pwsh` is not installed in this Linux workspace. The CI regression test uses
  a portable static check for the exact invalid pattern instead.

The selected fix is the braced variable syntax plus a cross-runtime regression
test that rejects non-scoped simple variable references followed by a colon in
the PowerShell smoke-test script.

## Template Comparison

Fresh repository metadata, HEAD SHAs, full file trees, and relevant workflow and
script files were captured for:

- `link-foundation/js-ai-driven-development-pipeline-template`
- `link-foundation/rust-ai-driven-development-pipeline-template`
- `link-foundation/python-ai-driven-development-pipeline-template`
- `link-foundation/csharp-ai-driven-development-pipeline-template`

The scanned template file-tree sizes were:

- JavaScript template: 345 paths, HEAD
  `76425c3cdd357969acbf411b52095046e3caacfa`
- Rust template: 149 paths, HEAD
  `2fc176850a4122ad9999a99d6fe344a58cc4d6a3`
- Python template: 36 paths, HEAD
  `58c6bfa67d7bb997603340efc406c9f9bdb5d7d8`
- C# template: 50 paths, HEAD
  `ca7f2b33217b70e502c48936954ba5dd77f60280`

No linked template contains this Windows Electron/PowerShell smoke-test helper,
`windows-11-arm` Electron packaging, or a matching `.ps1` interpolation defect.
No upstream template issue was filed.

The local workflow already follows the relevant template practices for this
failure class: explicit job timeouts, branch-aware concurrency, fast checks
before slow matrix tests, fresh-merge simulation for PR checks, file line-limit
checks, secret scanning, release asset validation before upload, artifact smoke
tests, and persisted case-study diagnostics. The missing protection was a
regression test for PowerShell interpolation in the extracted Windows smoke-test
helper.

## Fix

- Changed the smoke-test helper to use `${Description}:` for successful artifact
  output.
- Changed the latent `7z` failure message to use `${LASTEXITCODE}:`.
- Added a regression test in `tests/desktop-release-workflow.test.js` that
  allows valid scoped variables such as `$env:` but rejects plain
  `$VariableName:` references in the PowerShell helper.

## Verification

Reproducing test before the fix:

```bash
node --test --test-timeout=30000 tests/desktop-release-workflow.test.js
```

The new test failed with:

```text
Expected ["$Description:","$LASTEXITCODE:"] to equal []
```

Focused test after the fix:

```bash
node --test --test-timeout=30000 tests/desktop-release-workflow.test.js
```

The focused test passed all 14 tests after the script fix.

Broader local checks after the fix:

```bash
npm test
npm run check
bun test --timeout 30000
deno test --allow-read
bash scripts/check-mjs-syntax.sh
bash scripts/check-file-line-limits.sh
npx --yes -p secretlint -p @secretlint/secretlint-rule-preset-recommend secretlint "**/*"
```

All broader checks passed. The command logs are preserved in
`docs/case-studies/issue-47/github-data/`.

## References

- Issue #47: https://github.com/konard/vk-bot-desktop/issues/47
- PR #48: https://github.com/konard/vk-bot-desktop/pull/48
- Failed run: https://github.com/konard/vk-bot-desktop/actions/runs/25803232931
- PowerShell quoting rules:
  https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules
