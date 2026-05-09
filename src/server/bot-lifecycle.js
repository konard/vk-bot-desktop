/**
 * Local and remote bot lifecycle.
 *
 * Both halves use `link-foundation/start`'s `$` command:
 *
 *   $ --status <session>
 *   $ --isolated screen --name <session> -- node src/bot/runner.js
 *   $ --stop <session>
 *
 * Default isolation is `screen` (lightweight) on both sides. The Electron
 * UI calls `ensureMutualExclusion` before starting either side, so the user
 * never accidentally runs two bots at once.
 */

const DEFAULT_SESSION = 'vk-bot-desktop';

export const SESSION_NAME = DEFAULT_SESSION;

export function buildStatusCommand(session = DEFAULT_SESSION) {
  return ['$', '--status', session];
}

export function buildStartCommand({
  session = DEFAULT_SESSION,
  isolation = 'screen',
  image = 'node:20',
  command = ['node', 'src/bot/runner.js'],
} = {}) {
  if (isolation === 'docker') {
    return [
      '$',
      '--isolated',
      'docker',
      '--name',
      session,
      '--image',
      image,
      '--',
      ...command,
    ];
  }
  return ['$', '--isolated', 'screen', '--name', session, '--', ...command];
}

export function buildStopCommand(session = DEFAULT_SESSION) {
  return ['$', '--stop', session];
}

/**
 * Adapter pattern: callers pass in a `runCommand` function that returns
 * `{ exitCode, stdout, stderr }`. We can drive both `child_process` locally
 * and `node-ssh` remotely with the same code path.
 */
export async function isRunning({
  runCommand,
  session = DEFAULT_SESSION,
} = {}) {
  if (typeof runCommand !== 'function') {
    throw new Error('runCommand is required');
  }
  const { exitCode, stdout = '' } = await runCommand(
    buildStatusCommand(session)
  );
  if (exitCode !== 0) {
    return false;
  }
  return /running|active|alive/i.test(stdout);
}

export async function stopBot({ runCommand, session = DEFAULT_SESSION } = {}) {
  if (typeof runCommand !== 'function') {
    throw new Error('runCommand is required');
  }
  return await runCommand(buildStopCommand(session));
}

export async function startBot({
  runCommand,
  session = DEFAULT_SESSION,
  isolation = 'screen',
  image = 'node:20',
  command = ['node', 'src/bot/runner.js'],
} = {}) {
  if (typeof runCommand !== 'function') {
    throw new Error('runCommand is required');
  }
  return await runCommand(
    buildStartCommand({ session, isolation, image, command })
  );
}

/**
 * Ensures only one bot runs at a time across both modes. If the OTHER mode is
 * running, it stops it before allowing the current mode to continue.
 *
 * `targetMode` is the mode the user is starting now ('local' or 'server').
 */
export async function ensureMutualExclusion({
  targetMode,
  localRunner,
  remoteRunner,
  session = DEFAULT_SESSION,
} = {}) {
  if (targetMode !== 'local' && targetMode !== 'server') {
    throw new Error(`Unknown targetMode: ${targetMode}`);
  }
  const otherRunner = targetMode === 'local' ? remoteRunner : localRunner;
  if (!otherRunner) {
    return { stoppedOther: false };
  }
  let other = false;
  try {
    other = await isRunning({ runCommand: otherRunner, session });
  } catch {
    other = false;
  }
  if (other) {
    await stopBot({ runCommand: otherRunner, session });
    return { stoppedOther: true };
  }
  return { stoppedOther: false };
}
