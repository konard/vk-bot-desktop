# Case Study: Issue #45 - Windows ARM64 Installer Smoke Test Failure

Issue: https://github.com/konard/vk-bot-desktop/issues/45
Pull request: https://github.com/konard/vk-bot-desktop/pull/46

## Summary

The failed `JavaScript CI/CD` run built the Windows ARM64 desktop artifacts successfully,
then failed in `Smoke test Windows release artifacts` when the workflow launched the
generated NSIS installer with `/S` and `/D=...` on the GitHub-hosted `windows-11-arm`
runner. The installer process exited with `-1073741819`, which is `0xC0000005`
access violation.

The fix keeps the full silent installer smoke test for Windows x64, but changes
Windows ARM64 CI to validate the generated files, the unpacked native payload, and
the installer archive integrity without launching the NSIS installer on that hosted
runner path.

## Captured Data

- Failed run log:
  `docs/case-studies/issue-45/ci-logs/javascript-cicd-run-25768185238.log`
- Failed run metadata:
  `docs/case-studies/issue-45/github-data/run-25768185238.json`
- Issue and PR metadata:
  `docs/case-studies/issue-45/github-data/issue-45.json`,
  `docs/case-studies/issue-45/github-data/pr-46.json`
- Reproducing test before the fix:
  `docs/case-studies/issue-45/github-data/reproducing-test-before-fix.txt`
- Passing test after the fix:
  `docs/case-studies/issue-45/github-data/reproducing-test-after-fix.txt`
- Template comparison inventories:
  `docs/case-studies/issue-45/template-data/`

## Timeline

- `2026-05-12T23:25:55Z`: failed run `25768185238` started on `main` at
  `a6ad5a5e0b1e79d0f48dbd2b343a1cbc79b94629`.
- `2026-05-12T23:34:49Z`: Electron Builder packaged the ARM64 app to
  `release\win-arm64-unpacked`.
- `2026-05-12T23:35:23Z`: Electron Builder produced
  `vk-bot-desktop-windows-installer-arm64-0.10.0.exe`.
- `2026-05-12T23:35:25Z`: Electron Builder produced
  `vk-bot-desktop-windows-portable-arm64-0.10.0.exe`.
- `2026-05-12T23:35:37Z`: the silent installer smoke test failed with
  `-1073741819`.
- `2026-05-13T13:16:55Z`: issue #45 was opened.

## Root Cause

The workflow used the same Windows installer smoke test for x64 and ARM64. That test
executes the generated NSIS installer on the CI runner. On the `windows-11-arm`
hosted runner, the generated ARM64 installer exited with `0xC0000005` immediately
after successful artifact generation. The log did not show a build failure in
Electron Builder; it showed a validation failure caused by executing the installer
on the hosted ARM runner.

This is a CI validation bug rather than proof that artifact generation failed. The
runner path still needs ARM64 coverage, but it should not block the release by
executing the known-crashing NSIS path until that path has a reliable independent
reproduction or a runner/toolchain fix.

## Fix

- Moved Windows desktop artifact validation into
  `scripts/smoke-test-windows-release-artifacts.ps1`.
- Kept x64 validation as a real silent install using `Start-Process`, `/S`, and
  `/D=...`.
- Added ARM64 validation that checks:
  - versioned installer exists and is non-empty,
  - versioned portable executable exists and is non-empty,
  - `release/win-arm64-unpacked/VK Bot Desktop.exe` exists and is non-empty,
  - `7z t` validates the installer archive when `7z` is available.
- Added regression coverage in `tests/desktop-release-workflow.test.js` to assert
  that ARM64 exits before the installer execution path and x64 still keeps the
  silent install smoke test.
- Synchronized `package-lock.json` so the dependency tree can be reproduced with
  `npm ci`; the prepared workspace initially required CI's `npm install` path.
- Excluded raw template comparison data from ESLint and the `.mjs` line-limit scan.

## Template Comparison

The requested template repositories were inspected and their relevant CI/CD files
were preserved under `docs/case-studies/issue-45/template-data/`:

- `link-foundation/js-ai-driven-development-pipeline-template`
- `link-foundation/rust-ai-driven-development-pipeline-template`
- `link-foundation/python-ai-driven-development-pipeline-template`
- `link-foundation/csharp-ai-driven-development-pipeline-template`

No matching Electron Builder NSIS Windows ARM64 installer smoke test exists in those
templates. There was no equivalent upstream template defect to report.

The local workflow already mirrors the relevant template practices for this issue:
change detection, matrix CI, release validation before upload, file-size and
line-limit checks, and persisted diagnostic artifacts. The missing part was
architecture-specific Windows installer validation.

## References

- GitHub documents `windows-11-arm` as the ARM64 Windows hosted runner label:
  https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Electron Builder documents the Windows NSIS target used by this project:
  https://www.electron.build/nsis.html
- Electron's Windows on ARM guidance calls out architecture-specific packaging and
  testing concerns:
  https://www.electronjs.org/docs/latest/tutorial/windows-arm

## Verification

Focused regression test:

```bash
node --test --test-timeout=30000 tests/desktop-release-workflow.test.js
```

The pre-fix run failed because the workflow still embedded a direct Windows smoke
test and had no ARM64 guard. The post-fix run passed all 13 tests in that file.

Full local checks also passed:

```bash
npm test
npm run check
bash scripts/check-file-line-limits.sh
npm ci
```
