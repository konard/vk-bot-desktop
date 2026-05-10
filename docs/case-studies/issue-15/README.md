# Issue 15 Case Study: Versioned Desktop Downloads

## Scope

Issue: [konard/vk-bot-desktop#15](https://github.com/konard/vk-bot-desktop/issues/15)

Pull requests:
[konard/vk-bot-desktop#16](https://github.com/konard/vk-bot-desktop/pull/16)
and
[konard/vk-bot-desktop#17](https://github.com/konard/vk-bot-desktop/pull/17)

Branches: `issue-15-9ea339e71924` and `issue-15-a34bf7d3d42f`

The issue asks for a more trustworthy download experience:

- Desktop release filenames must include the application version for every OS and architecture.
- The download page must show expandable verification instructions for regular and advanced users.
- Advanced users should be able to inspect provenance and, where possible, verify the release build origin.
- The app screenshot should be framed like the selected operating system.
- Windows and Linux should support both x64 and arm64, matching macOS coverage.
- Logs and related data should be preserved in `docs/case-studies/issue-15`.

## Captured Evidence

Local evidence files:

- `data/issue-15.json` - original issue body and metadata.
- `data/issue-15-comments.json` - issue comments, empty at investigation time.
- `data/pr-16.json` - prepared PR metadata.
- `data/pr-16-conversation-comments.json` - PR conversation comments, empty at investigation time.
- `data/pr-16-review-comments.json` - PR inline comments, empty at investigation time.
- `data/pr-16-reviews.json` - PR reviews, empty at investigation time.
- `data/latest-release-v0.9.7.json` - latest release metadata at investigation time.
- `data/ci-runs-branch-before-fix.json` - latest branch CI run metadata before the fix.
- `ci-logs/checks-and-release-25634091107.log` - downloaded CI log for the successful prepared-branch run.
- `data/electron-release-25634996041.json` - failed post-merge Electron release run metadata.
- `ci-logs/electron-release-25634996041.log` - downloaded CI log for the failed post-merge release run.
- `data/related-merged-prs.json` and `data/pr-*-summary.json` - recent merged PR context.
- `data/file-tree.txt` - repository file inventory used during triage.

The latest release captured during triage was `v0.9.7`, published on
2026-05-10 at 15:04:57 UTC. Its desktop assets were unversioned, for example
`vk-bot-desktop-macos-arm64.dmg`, `vk-bot-desktop-linux-x64.AppImage`, and
`vk-bot-desktop-windows-installer-x64.exe`. It included macOS x64/arm64, Linux
x64, and Windows x64, but not Linux arm64 or Windows arm64.

The prepared branch CI run `25634091107` started on 2026-05-10 at 16:39:40 UTC
for commit `9ff260569e1afa0f4d652e4cbec1a5b116847d72` and concluded
successfully. That confirmed the baseline branch was green before changing the
release contract.

After PR #16 merged, the release sequence reached commit
`eb04762f10d1055537887fb60a15b96055a32306` and attempted Electron release run
`25634996041` on 2026-05-10 at 17:22:38 UTC. That run failed and no `v0.9.8`
GitHub release was produced. The downloaded log preserved the two actual
failures that blocked publishing.

## Online Research

The selected implementation uses existing platform mechanisms instead of custom
verification tooling:

- Electron Builder supports artifact filename templates and the `${version}` and
  `${arch}` macros in artifact file patterns, so release naming can be fixed in
  `package.json` instead of renaming files after build:
  <https://www.electron.build/configuration.html#artifactname> and
  <https://www.electron.build/file-patterns.html#file-macros>.
- GitHub-hosted runners include public arm64 labels for Linux and Windows:
  `ubuntu-24.04-arm`, `ubuntu-22.04-arm`, and `windows-11-arm`:
  <https://docs.github.com/en/actions/reference/runners/github-hosted-runners>.
- GitHub artifact attestations can be generated with `actions/attest@v4` and
  verified with `gh attestation verify`:
  <https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations>.
- Windows has a built-in `Get-FileHash` cmdlet whose default algorithm is
  SHA-256, and it can be passed `-Algorithm SHA256` explicitly:
  <https://learn.microsoft.com/en-gb/powershell/module/microsoft.powershell.utility/Get-FileHash>.
- GNU Coreutils documents `sha256sum` and `--ignore-missing`, which is useful
  when verifying one downloaded file against a larger checksum manifest:
  <https://www.gnu.org/software/coreutils/manual/coreutils.html>.
- The Reproducible Builds project distinguishes checksum verification from the
  stronger guarantee of rebuilding the same bytes from source:
  <https://reproducible-builds.org/docs/>.
- Electron Builder has existing upstream reports for bundled x86 FPM being used
  on Linux arm64 runners, including
  <https://github.com/electron-userland/electron-builder/issues/9563> and the
  older <https://github.com/electron-userland/electron-builder/issues/5154>.

## Root Causes

### Unversioned Downloads

The Electron Builder configuration used stable artifact names such as
`vk-bot-desktop-linux-${arch}.${ext}` and
`vk-bot-desktop-windows-installer-${arch}.${ext}`. That made every release for a
given platform download to the same local filename, so users could not tell which
version they had without inspecting metadata after download.

### Partial Architecture Coverage

The release workflow built Linux on `ubuntu-latest`, Windows on
`windows-latest`, and macOS as a dual-architecture build. Linux and Windows did
not have arm64 matrix entries, so no release job could produce or validate those
artifacts.

### Post-Merge Release Failure

The post-merge Electron release run `25634996041` found two additional release
workflow bugs:

- Linux arm64 reached the Debian packaging step, but Electron Builder downloaded
  `fpm-1.9.3-2.3.1-linux-x86` on the `ubuntu-24.04-arm` runner. The bundled Ruby
  executable failed with `cannot execute binary file: Exec format error`, so the
  arm64 `.deb` artifact was never produced.
- Linux x64 successfully produced an AppImage and Debian package, but Electron
  Builder expanded the target-specific artifact names to
  `vk-bot-desktop-linux-x86_64-0.9.8.AppImage` and
  `vk-bot-desktop-linux-amd64-0.9.8.deb`. The public download contract and smoke
  test expected `linux-x64`, so the job failed before publishing.

Because a build job failed, the publish job was skipped and the repository still
only had `v0.9.7` as the latest release.

### Download Page Trust Gap

The React download page already used the GitHub Releases API and avoided links
to unavailable assets, but it only listed checksums as a supporting link. It did
not teach users how to verify a file, did not expose `BUILD-PROVENANCE.txt`, and
did not describe the boundary between checksum verification, provenance, and
true reproducible rebuilds.

### Visual Context

The app screenshot was shown as a plain image. Because the page detects the
selected OS, it already had enough state to render a macOS, Windows, or Linux
window frame around the screenshot.

## Solution Plan

1. Add failing tests for versioned artifact names, arm64 Linux/Windows assets,
   verification UI, and release completeness checks.
2. Change Electron Builder artifact templates to include `${version}` for
   Linux, macOS, Windows installer, and Windows portable targets.
3. Expand the release workflow matrix to build Linux x64/arm64 and Windows
   x64/arm64 on GitHub-hosted runners, validate all expected filenames, and
   generate artifact attestations.
4. Update release-completeness logic so automation treats a release as complete
   only when every versioned artifact, `SHA256SUMS.txt`, and
   `BUILD-PROVENANCE.txt` is present.
5. Update the download page to derive expected filenames from the latest release
   tag, prefer versioned assets, keep a legacy fallback for already-published
   releases, and never guess direct binary URLs when the API does not provide an
   asset.
6. Add expandable regular and advanced verification instructions, including
   PowerShell, macOS Terminal, Linux Terminal, provenance, and `gh attestation
verify`.
7. Wrap the screenshot in OS-specific window chrome and verify it in the page
   e2e checks.
8. Document the new download contract and preserve this case study.

## Selected Decisions

Versioned filenames are generated at build time with Electron Builder macros.
This is preferable to post-build renaming because the generated checksums,
smoke tests, upload validation, and release metadata all see the same canonical
names.

The download page keeps a compatibility fallback for legacy assets. Existing
release `v0.9.7` is already published with unversioned names, so the page can
still offer real download links for that release while new releases move to
versioned names. The fallback only resolves assets that exist in GitHub release
metadata; it does not synthesize `/releases/latest/download/...` links.

The advanced verification path adds GitHub artifact attestations and keeps
`BUILD-PROVENANCE.txt`. This does not claim that Electron desktop artifacts are
already byte-for-byte reproducible. It gives users an auditable build origin now
and leaves the stronger reproducible-build guarantee explicit for future work.

Windows and Linux arm64 are built as first-class release jobs instead of only
cross-compiling from x64 runners. Native runner coverage allows the same smoke
test pattern to validate the produced artifacts before upload. For Linux arm64
Debian packaging, the workflow installs system Ruby/FPM and sets
`USE_SYSTEM_FPM=true` so Electron Builder does not use its bundled x86 FPM
binary on an arm64 runner.

Linux x64 AppImage and Debian artifact filenames are normalized immediately
after build and before smoke tests. Electron Builder intentionally uses
distribution-specific architecture labels for some Linux targets, but the
download page, release-completeness checks, and user-facing filenames all use
the simpler `x64` and `arm64` labels.

No duplicate upstream issue was opened for the Linux arm64 FPM failure because
existing Electron Builder issues already describe the same failure mode. The
repository workflow now uses the documented environment switch for system FPM
while upstream support continues to evolve.

## Verification Strategy

Automated checks cover the contract at multiple levels:

- `tests/desktop-release-workflow.test.js` asserts versioned artifact templates,
  arm64 runner labels, attestation generation, and workflow validation strings.
  Follow-up assertions cover system FPM on native Linux arm64 builds and Linux
  artifact filename normalization before smoke testing.
- `tests/check-release-needed.test.js` asserts release-completeness logic for
  all expected platform artifacts.
- `tests/site-downloads.test.js` asserts derived versioned filenames and that
  download URLs only come from actual release assets.
- `tests/pages-site.test.js` asserts the page source contains the versioned
  fixture assets, verification UI, provenance link, and OS-styled frame.
- `scripts/test-pages-e2e.mjs` verifies the built page in Chromium against a
  local release fixture containing every expected versioned asset.

Manual review should also check that the release notes and README do not point
to stale unversioned direct-download URLs.
