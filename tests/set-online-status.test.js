import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { setOnlineStatus } from '../src/bot/triggers/set-online-status.js';
import { addSink, removeSink } from '../src/bot/logger.js';

// Use addSink/removeSink (not clearSinks) so concurrent tests under Deno's
// node:test shim don't wipe each other's sinks or the default stderr sink.
//
// Each test is wrapped in its own `describe()` block because Deno's node:test
// shim runs sibling async `it()` blocks via `Promise.all`. With multiple
// capture sinks active at once, every sink receives every test's log line,
// breaking the `captured.length === 1` assertions. `describe` blocks are
// serialized on both Node and Deno, so this layout keeps each test's
// captured-logs window exclusive.
function withCapturedLogs(fn) {
  const captured = [];
  const sink = (line) => captured.push(line);
  addSink(sink);
  return Promise.resolve(fn(captured)).finally(() => removeSink(sink));
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
