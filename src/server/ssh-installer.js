/**
 * Generates the install plan for the server-side mode.
 *
 * The user supplies SSH credentials and an isolation choice (`docker` or
 * `screen`). We never connect to the host from this module — it just
 * produces the deterministic shell script, plus a structured plan, so the
 * UI can preview what is about to happen before connecting via the host's
 * SSH client. The Electron main process is responsible for executing the
 * generated script through `node-ssh`.
 *
 * Both isolation modes use `link-foundation/start`'s `$` wrapper:
 *
 *   $ --isolated docker --image node:lts -- node ./run.mjs
 *   $ --isolated screen -- node ./run.mjs
 *
 * The wrapper takes care of capturing logs, retrying, and
 * (in docker mode) creating the container. We only need to install Node.js,
 * `start-command`, and our bot bundle on the remote host.
 */

const DEFAULT_REMOTE_DIR = '~/vk-bot-desktop';
const DEFAULT_NODE_VERSION = '20';

function escapeShellSingle(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function buildInstallScript({
  remoteDir = DEFAULT_REMOTE_DIR,
  nodeVersion = DEFAULT_NODE_VERSION,
  isolation = 'screen',
  configLino = '',
  bundleArchiveBase64,
  session = 'vk-bot-desktop',
} = {}) {
  if (!bundleArchiveBase64) {
    throw new Error('bundleArchiveBase64 is required to install the bot');
  }
  if (isolation !== 'docker' && isolation !== 'screen') {
    throw new Error(`Unsupported isolation: ${isolation}`);
  }

  const lines = [
    `#!/usr/bin/env bash`,
    `set -euo pipefail`,
    ``,
    `mkdir -p ${escapeShellSingle(remoteDir)}`,
    `cd ${escapeShellSingle(remoteDir)}`,
    ``,
    `if ! command -v node >/dev/null 2>&1; then`,
    `  if command -v apt-get >/dev/null 2>&1; then`,
    `    sudo apt-get update`,
    `    curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | sudo -E bash -`,
    `    sudo apt-get install -y nodejs`,
    `  elif command -v dnf >/dev/null 2>&1; then`,
    `    curl -fsSL https://rpm.nodesource.com/setup_${nodeVersion}.x | sudo bash -`,
    `    sudo dnf install -y nodejs`,
    `  else`,
    `    echo "Could not find apt-get or dnf; install Node.js ${nodeVersion} manually" >&2`,
    `    exit 1`,
    `  fi`,
    `fi`,
    ``,
    `if ! command -v $ >/dev/null 2>&1; then`,
    `  npm install -g start-command`,
    `fi`,
    ``,
    `cat <<'BUNDLE_BASE64' | base64 -d > vk-bot-desktop.tar.gz`,
    bundleArchiveBase64,
    `BUNDLE_BASE64`,
    `tar -xzf vk-bot-desktop.tar.gz`,
    ``,
    `cat <<'CONFIG_LINO' > .vk-bot-desktop/config.lino`,
    configLino,
    `CONFIG_LINO`,
    ``,
  ];

  const sessionName = escapeShellSingle(session);

  lines.push(
    `# Stop any existing session before starting a new one.`,
    `$ --stop ${sessionName} >/dev/null 2>&1 || true`,
    ``
  );

  if (isolation === 'docker') {
    lines.push(
      `if ! command -v docker >/dev/null 2>&1; then`,
      `  echo "docker is required for isolation=docker; install docker first" >&2`,
      `  exit 1`,
      `fi`,
      ``,
      `$ --isolated docker --name ${sessionName} --image node:${nodeVersion} -- node src/bot/runner.js`
    );
  } else {
    lines.push(
      `if ! command -v screen >/dev/null 2>&1; then`,
      `  echo "screen is required for isolation=screen; install screen first" >&2`,
      `  exit 1`,
      `fi`,
      ``,
      `$ --isolated screen --name ${sessionName} -- node src/bot/runner.js`
    );
  }

  return `${lines.join('\n')}\n`;
}

export function buildInstallPlan(options) {
  return {
    remoteDir: options.remoteDir || DEFAULT_REMOTE_DIR,
    isolation: options.isolation || 'screen',
    nodeVersion: options.nodeVersion || DEFAULT_NODE_VERSION,
    script: buildInstallScript(options),
  };
}
