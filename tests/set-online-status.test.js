import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { setOnlineStatus } from '../src/bot/triggers/set-online-status.js';
import { addSink, clearSinks } from '../src/bot/logger.js';

// Each test lives in its own `describe` block because Deno's node:test shim
// runs sibling async `it()` blocks via `Promise.all`, which would race over
// the logger's module-level sinks array. `describe` blocks are serialized,
// so this layout keeps the captured-logs harness deterministic on both
// Node's native runner and Deno's shim.

function withCapturedLogs(fn) {
  const captured = [];
  clearSinks();
  addSink((line) => captured.push(line));
  return Promise.resolve(fn(captured)).finally(() => clearSinks());
}

describe('setOnlineStatus: healthy call', () => {
  it('logs success on a healthy call', async () => {
    await withCapturedLogs(async (captured) => {
      const vk = { api: { account: { setOnline: async () => true } } };
      await setOnlineStatus({ vk });
      assert.equal(captured.length, 1);
      assert.match(captured[0], /Online status is set/);
    });
  });
});

describe('setOnlineStatus: VK code 3', () => {
  it('emits a code-3 hint when VK returns "Unknown method passed"', async () => {
    await withCapturedLogs(async (captured) => {
      const err = new Error('Unknown method passed.');
      err.code = 3;
      const vk = {
        api: {
          account: {
            setOnline: async () => {
              throw err;
            },
          },
        },
      };
      await setOnlineStatus({ vk });
      assert.equal(captured.length, 1);
      assert.match(captured[0], /code 3/);
      assert.match(captured[0], /offline.*scope|scope.*offline/);
      assert.match(captured[0], /docs\/case-studies\/issue-32/);
    });
  });
});

describe('setOnlineStatus: other errors', () => {
  it('falls back to the generic warning for other errors', async () => {
    await withCapturedLogs(async (captured) => {
      const vk = {
        api: {
          account: {
            setOnline: async () => {
              throw new Error('boom');
            },
          },
        },
      };
      await setOnlineStatus({ vk });
      assert.equal(captured.length, 1);
      assert.match(captured[0], /Could not set online status/);
      assert.doesNotMatch(captured[0], /code 3/);
    });
  });
});
