# Case Study: Issue #1 — React.js Electron application for konard/vk-bot

**Issue:** [#1](https://github.com/konard/vk-bot-desktop/issues/1)
**Pull request:** [#2](https://github.com/konard/vk-bot-desktop/pull/2)
**Date:** 2026-05-09
**Status:** In progress (this PR)

## Executive summary

The user requested a cross-platform Electron desktop application that wraps the
core enabled-by-default features of [konard/vk-bot](https://github.com/konard/vk-bot)
into a single, simple GUI that can also drive remote installs over SSH+Docker.
The application must:

1. Use the [`@deep-foundation/sdk`](https://github.com/deep-foundation/sdk)
   project as the orientation point for the Electron + Next.js / multi-platform
   shape.
2. Run on macOS, Windows, and Linux from a single GitHub release of `0.0.1`.
3. Implement the enabled features of `vk-bot/index.js` in a simplified form:
   - posting friend-request invitations to communities (avatar +
     `Приму заявки в друзья.`),
   - birthday congratulations (10 short, low-emoji greetings),
   - online status while running,
   - automatic friend-request acceptance with two regimes
     (top-10% by mutual friends below 10000, mutuals-only above 10000),
   - cleanup of blocked / deactivated friends,
   - a configurable priority list (always-add, never-delete).
4. Offer two modes — local execution and SSH-based Docker install — with a
   single-window UI, dark/light auto theme, and en/ru auto i18n.
5. Use the [link-foundation](https://github.com/link-foundation) toolchain:
   - [`start-command`](https://github.com/link-foundation/start) so the same
     command can run under Docker or `screen`,
   - [`lino-arguments`](https://github.com/link-foundation/lino-arguments) for
     CLI configuration,
   - [`lino-objects-codec`](https://github.com/link-foundation/lino-objects-codec)
     for the application's persistent state, configuration, and cache, in
     human-readable indented Links Notation **without** type markers.
6. Layer configuration: development-local folder overrides global app folder.
7. Cache in the application folder, also in Links Notation.
8. Verbose logging by default, with tokens, passwords, and other secrets
   redacted before they are written to any sink.
9. Produce signed (verifiable) downloadable artifacts attached to a GitHub
   release.

This document collects the data, requirements, and proposed solutions that
justify the implementation in PR #2.

## Data captured

All raw artifacts live under [`./data/`](./data) and are committed alongside
this README so the analysis is reproducible.

| File                           | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `data/issue-1.json`            | Issue body, labels, author, timestamps                     |
| `data/issue-1-comments.json`   | All conversation comments on the issue                     |
| `data/vk-bot-meta.json`        | Source repo metadata (license, default branch, language)   |
| `data/vk-bot-tree.json`        | Top-level file listing with sizes and SHA-pinned URLs      |
| `data/vk-bot-triggers.json`    | `triggers/` listing with sizes and SHA-pinned URLs         |
| `data/deep-sdk-meta.json`      | `@deep-foundation/sdk` repo metadata                       |
| `data/link-start-meta.json`    | `link-foundation/start` repo metadata                      |
| `data/lino-arguments-meta.json`| `lino-arguments` repo metadata                             |
| `data/lino-objects-codec-meta.json` | `lino-objects-codec` repo metadata                    |

## Requirements matrix

Each requirement extracted from the issue is mapped to the file that satisfies
it in this PR. Items marked _follow-up_ have a stub or scaffolding committed
and are tracked in PR #2 for the next iteration.

| #   | Requirement                                                                     | Implementation                                                                                                                |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cross-platform Electron desktop app (macOS, Windows, Linux)                     | `electron/main.cjs`, `electron/preload.cjs`, `electron-builder` config in `package.json`                                      |
| 2   | React UI in the renderer                                                        | `electron/renderer/`                                                                                                          |
| 3   | Single window with mode switch and Start/Stop                                   | `electron/renderer/App.jsx`                                                                                                   |
| 4   | Light + dark + auto theme                                                       | `electron/renderer/theme.js`                                                                                                  |
| 5   | en + ru auto-detected i18n                                                      | `electron/renderer/i18n.js`                                                                                                   |
| 6   | Friend-request acceptance with two regimes (top-10% / mutuals-only)             | `src/bot/triggers/accept-friend-requests.js`                                                                                  |
| 7   | Cleanup of deactivated/blocked friends, respecting priority list                | `src/bot/triggers/delete-deactivated-friends.js`                                                                               |
| 8   | Online status                                                                   | `src/bot/triggers/set-online-status.js`                                                                                       |
| 9   | Birthday congratulations (10 simple greetings, ≤2 emojis)                       | `src/bot/triggers/send-birthday-congratulations.js`, `src/bot/messages/birthday-greetings.js`                                  |
| 10  | Posting requests to communities (avatar + simple text)                          | `src/bot/triggers/send-invitation-posts.js`                                                                                   |
| 11  | Configurable priority list for adding friends and protecting from delete        | `src/bot/config.js` (`priorityFriendIds`)                                                                                     |
| 12  | Local mode (no Docker)                                                          | `electron/main.cjs` spawns `src/bot/runner.js` via `child_process.fork`                                                       |
| 13  | Server mode via SSH + Docker                                                    | `src/server/ssh-installer.js`                                                                                                 |
| 14  | `link-foundation/start` integration (screen/docker)                             | `src/server/ssh-installer.js` emits `$ --isolated docker --image node:lts -- node ./run.mjs` and `$ --isolated screen -- ...` |
| 15  | `lino-arguments` for CLI options                                                | `src/cli.mjs`                                                                                                                 |
| 16  | `lino-objects-codec` for persistent state, configuration, and cache             | `src/lino-store.js`                                                                                                           |
| 17  | Layered configuration (dev local folder overrides global folder)                | `src/lino-store.js#loadLayered`                                                                                               |
| 18  | Cache stored in application folder in Links Notation, no JSON                   | `src/lino-store.js#cache*`                                                                                                    |
| 19  | Verbose logging with secret redaction                                           | `src/bot/logger.js`                                                                                                           |
| 20  | Releases with downloadable artifacts                                            | `.github/workflows/electron-release.yml`                                                                                      |
| 21  | Signature/verification of distribution against source                           | `.github/workflows/electron-release.yml` produces `SHA256SUMS` per artifact                                                   |
| 22  | First release tagged `v0.0.1`                                                   | `package.json` version bump + first electron release workflow run                                                             |
| 23  | Case study committed to `docs/case-studies/issue-{id}`                          | This file                                                                                                                     |

## Why these libraries

### vk-io
Re-used because `vk-bot/index.js` already builds on it, so the simplified
trigger code drops in unchanged. License is MIT.

### lino-objects-codec
Provides `jsonToLino`, `linoToJson`, `formatIndented`, and `parseIndented`.
The "human-readable indented format without types specification" requested
by the issue corresponds to `formatIndented`/`parseIndented`, which produce
multi-line files such as

```
config
  vk
    token "REDACTED"
  mode local
  features
    onlineStatus true
    birthdayCongratulations true
```

This is what we use for `config.lino`, `state.lino`, and `cache.lino`. We do
not introduce JSON for any persisted user data.

### lino-arguments
We invoke `makeConfig({ yargs })` so the same options can come from CLI flags,
environment variables, or a `.lenv` file — matching the priority order
documented upstream. This keeps the headless server-mode child process
configurable without bundling a separate parser.

### start-command
For server-mode installs we generate a script that is launched with
`$ --isolated docker --image node:lts ...` (or `$ --isolated screen --
node ./run.mjs` for low-resource servers) so the operator can pick the
isolation strategy without changing our bot code.

### Electron + electron-builder
Standard, well-supported, and produces unsigned-but-checksummed installers
for macOS (`.dmg`), Windows (`.exe`), and Linux (`.AppImage` + `.deb`). The
release workflow attaches a `SHA256SUMS` file plus a `provenance.txt`
referencing the commit SHA, so a download can be matched against this PR's
source tree.

## Reproducing this analysis

```sh
gh issue view 1 --repo konard/vk-bot-desktop --json title,body,createdAt,author,labels,comments \
  > docs/case-studies/issue-1/data/issue-1.json
gh api repos/konard/vk-bot-desktop/issues/1/comments --paginate \
  > docs/case-studies/issue-1/data/issue-1-comments.json
```

The remaining files in `data/` are all generated from `gh api` calls listed
above the corresponding command in this section's commit history.

## Follow-up tracked in PR #2

- Wiring uploads of `avatar.jpeg` for community posts (currently posts text
  only because the original `vk-bot` returns a hard-coded photo id).
- Optional code-signing of artifacts (vs. the current SHA-256 checksum) once
  the maintainer has Apple/Microsoft developer certificates.
- Replacing the local cache directory creation with `app.getPath('userData')`
  paths once Electron is wired through CI.
