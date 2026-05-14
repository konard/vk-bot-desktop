import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  setOnlineStatus,
  resetSetOnlineStatusSupport,
} from '../src/bot/triggers/set-online-status.js';
import { resetAppPermissionsCache } from '../src/bot/api-errors.js';
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
    resetSetOnlineStatusSupport();
    resetAppPermissionsCache();
    await withCapturedLogs(async (captured) => {
      const vk = { api: { account: { setOnline: async () => true } } };
      await setOnlineStatus({ vk });
      assert.equal(captured.length, 1);
      assert.match(captured[0], /Online status is set/);
    });
  });
});

describe('setOnlineStatus: Unknown method (code 3)', () => {
  it('halts the trigger and logs the terminal diagnostic once', async () => {
    resetSetOnlineStatusSupport();
    resetAppPermissionsCache();
    await withCapturedLogs(async (captured) => {
      const err = new Error('Code №3 - Unknown method passed');
      err.code = 3;
      let calls = 0;
      const vk = {
        api: {
          account: {
            setOnline: async () => {
              calls += 1;
              throw err;
            },
            getAppPermissions: async () => 1073737727,
          },
        },
      };
      await setOnlineStatus({ vk });
      await setOnlineStatus({ vk });
      assert.equal(calls, 1, 'second call should be short-circuited');
      assert.equal(captured.length, 1);
      assert.match(captured[0], /halting trigger/);
      assert.match(captured[0], /set-online-status/);
      assert.match(captured[0], /1073737727/);
    });
  });
});

describe('setOnlineStatus: other errors', () => {
  it('logs the generic warning for non-VK errors too', async () => {
    resetSetOnlineStatusSupport();
    resetAppPermissionsCache();
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
      assert.match(captured[0], /boom/);
    });
  });
});
