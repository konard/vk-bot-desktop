import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SESSION_NAME,
  buildStartCommand,
  buildStatusCommand,
  buildStopCommand,
  ensureMutualExclusion,
  isRunning,
  startBot,
  stopBot,
} from '../src/server/bot-lifecycle.js';

describe('buildStatusCommand', () => {
  it('uses the default session name', () => {
    assert.deepEqual(buildStatusCommand(), ['$', '--status', SESSION_NAME]);
  });

  it('honors a custom session name', () => {
    assert.deepEqual(buildStatusCommand('my-bot'), ['$', '--status', 'my-bot']);
  });
});

describe('buildStartCommand', () => {
  it('defaults to screen isolation with the session name', () => {
    const cmd = buildStartCommand();
    assert.deepEqual(cmd, [
      '$',
      '--isolated',
      'screen',
      '--name',
      SESSION_NAME,
      '--',
      'node',
      'src/bot/runner.js',
    ]);
  });

  it('builds a docker invocation with image and session name', () => {
    const cmd = buildStartCommand({ isolation: 'docker', session: 'abc' });
    assert.deepEqual(cmd, [
      '$',
      '--isolated',
      'docker',
      '--name',
      'abc',
      '--image',
      'node:20',
      '--',
      'node',
      'src/bot/runner.js',
    ]);
  });

  it('passes through a custom command', () => {
    const cmd = buildStartCommand({
      command: ['bun', 'run', 'src/bot/runner.js'],
    });
    assert.deepEqual(cmd.slice(-3), ['bun', 'run', 'src/bot/runner.js']);
  });
});

describe('buildStopCommand', () => {
  it('uses --stop with the session', () => {
    assert.deepEqual(buildStopCommand('s1'), ['$', '--stop', 's1']);
  });
});

function makeRunner(responses) {
  const calls = [];
  const runCommand = async (argv) => {
    calls.push(argv);
    return responses.shift() ?? { exitCode: 0, stdout: '', stderr: '' };
  };
  return { runCommand, calls };
}

describe('isRunning', () => {
  it('returns true when stdout indicates running', async () => {
    const { runCommand } = makeRunner([
      { exitCode: 0, stdout: 'session running', stderr: '' },
    ]);
    assert.equal(await isRunning({ runCommand }), true);
  });

  it('returns false when exit code != 0', async () => {
    const { runCommand } = makeRunner([
      { exitCode: 1, stdout: '', stderr: 'no such session' },
    ]);
    assert.equal(await isRunning({ runCommand }), false);
  });

  it('returns false when stdout has no running keyword', async () => {
    const { runCommand } = makeRunner([
      { exitCode: 0, stdout: 'stopped', stderr: '' },
    ]);
    assert.equal(await isRunning({ runCommand }), false);
  });

  it('throws when runCommand is missing', async () => {
    await assert.rejects(() => isRunning({}));
  });
});

describe('startBot/stopBot', () => {
  it('startBot invokes runCommand with the start argv', async () => {
    const { runCommand, calls } = makeRunner([{ exitCode: 0 }]);
    await startBot({ runCommand, session: 's1' });
    assert.deepEqual(calls[0].slice(0, 5), [
      '$',
      '--isolated',
      'screen',
      '--name',
      's1',
    ]);
  });

  it('stopBot invokes runCommand with the stop argv', async () => {
    const { runCommand, calls } = makeRunner([{ exitCode: 0 }]);
    await stopBot({ runCommand, session: 's2' });
    assert.deepEqual(calls[0], ['$', '--stop', 's2']);
  });
});

describe('ensureMutualExclusion', () => {
  it('rejects unknown targetMode', async () => {
    await assert.rejects(() =>
      ensureMutualExclusion({ targetMode: 'cloud', localRunner: () => ({}) })
    );
  });

  it('returns stoppedOther=false when no other runner is provided', async () => {
    const { runCommand } = makeRunner([]);
    const result = await ensureMutualExclusion({
      targetMode: 'local',
      localRunner: runCommand,
    });
    assert.equal(result.stoppedOther, false);
  });

  it('stops the remote bot when starting local and remote is running', async () => {
    const remote = makeRunner([
      { exitCode: 0, stdout: 'running' },
      { exitCode: 0, stdout: '' },
    ]);
    const result = await ensureMutualExclusion({
      targetMode: 'local',
      remoteRunner: remote.runCommand,
    });
    assert.equal(result.stoppedOther, true);
    assert.equal(remote.calls.length, 2);
    assert.deepEqual(remote.calls[0].slice(0, 2), ['$', '--status']);
    assert.deepEqual(remote.calls[1].slice(0, 2), ['$', '--stop']);
  });

  it('does not stop the remote bot when it is not running', async () => {
    const remote = makeRunner([{ exitCode: 0, stdout: 'stopped' }]);
    const result = await ensureMutualExclusion({
      targetMode: 'local',
      remoteRunner: remote.runCommand,
    });
    assert.equal(result.stoppedOther, false);
    assert.equal(remote.calls.length, 1);
  });

  it('treats runner errors as not-running', async () => {
    const errored = async () => {
      throw new Error('ssh failed');
    };
    const result = await ensureMutualExclusion({
      targetMode: 'local',
      remoteRunner: errored,
    });
    assert.equal(result.stoppedOther, false);
  });

  it('stops the local bot when starting server', async () => {
    const local = makeRunner([
      { exitCode: 0, stdout: 'active' },
      { exitCode: 0, stdout: '' },
    ]);
    const result = await ensureMutualExclusion({
      targetMode: 'server',
      localRunner: local.runCommand,
    });
    assert.equal(result.stoppedOther, true);
  });
});
