# vk-bot-desktop

Cross-platform desktop app that wraps [`konard/vk-bot`](https://github.com/konard/vk-bot) in a React + Electron UI. Runs the bot locally or on a remote SSH host inside Docker or `screen`.

## Features

- **Local mode**: run the bot inside the desktop app, no Docker required, dependencies installed automatically on first launch.
- **Server mode**: SSH into a remote host and run the bot under [`link-foundation/start`](https://github.com/link-foundation/start)'s `$ --isolated docker` or `$ --isolated screen` wrapper.
- **Bot behaviours** (all enabled by default and individually toggleable):
  - keep online status while running,
  - auto-accept friend requests using top-10% mutuals below 10 000 friends and mutuals-only above,
  - delete deactivated/blocked friends,
  - cancel outgoing friend requests,
  - post invitation messages to selected communities with your avatar (default text: «Приму заявки в друзья.»),
  - send randomized birthday greetings (10 short messages, ≤ 2 emojis each).
- **Priority friend list**: always send a request to listed users; never delete them automatically.
- **Single window UI** with mode switch, Start/Stop, light/dark/auto theme, en/ru auto-detected language.
- **Configuration** in human-readable [Links Notation](https://github.com/link-foundation/lino-objects-codec) (no JSON, no type markers), layered: local `./.vk-bot-desktop/config.lino` overrides global `~/.vk-bot-desktop/config.lino`.
- **CLI** options via [`lino-arguments`](https://github.com/link-foundation/lino-arguments): `--token`, `--mode`, `--config`.
- **Verbose logs** in the UI with tokens, passwords, cookies redacted everywhere.

## Install

Download a signed binary for your OS from the latest [GitHub release](https://github.com/konard/vk-bot-desktop/releases). Verify the SHA256:

```sh
sha256sum -c SHA256SUMS.txt
```

## Develop

```sh
npm install
npm run build:renderer
npm run electron:dev
```

Build distributable artifacts:

```sh
npm run electron:build           # current OS
npm run electron:build:linux
npm run electron:build:mac
npm run electron:build:win
```

Run the headless bot directly:

```sh
node src/cli.mjs --token "$VK_TOKEN"
```

## Tests

```sh
npm test
```

## Case study

A detailed walk-through of the design decisions, library choices, and reproducibility steps is in
[`docs/case-studies/issue-1`](docs/case-studies/issue-1/README.md).
