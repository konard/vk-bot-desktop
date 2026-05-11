import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { startBot } from '../src/bot/runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

describe('startBot scheduling', () => {
  it('fires the online-status trigger at least once and keeps the process alive', async () => {
    let calls = 0;
    const fakeVk = {
      api: {
        account: {
          setOnline: async () => {
            calls += 1;
          },
        },
      },
    };
    const handle = await startBot({
      config: {
        vk: { token: 'vk1.a.testtoken_ok' },
        features: { onlineStatus: true },
        intervals: { onlineStatusMinutes: 60 },
      },
      createVk: async () => fakeVk,
    });
    try {
      // Wait long enough for the t=0 scheduled callback to fire.
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.ok(
        calls >= 1,
        `setOnline should have been called at least once, got ${calls}`
      );
    } finally {
      handle.stop();
    }
  });

  it('does not exit prematurely when run as a forked child (regression for issue #32)', async () => {
    // Reproduces the original bug: a child process forked by Electron used to
    // exit immediately because scheduleEvery() called .unref() on its
    // setTimeout handles, allowing the event loop to drain.
    const fixture = join(repoRoot, 'tests', 'fixtures', 'runner-fixture.mjs');
    const child = spawn(process.execPath, [fixture], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitedEarly = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 400);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));

    assert.equal(
      exitedEarly,
      false,
      `Bot child exited before 400ms. stdout=${stdout} stderr=${stderr}`
    );
    assert.match(stdout, /trigger fired/);
  });
});
