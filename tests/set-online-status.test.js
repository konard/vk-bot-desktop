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

describe('setOnlineStatus: VK error is logged verbatim', () => {
  it('forwards the VK error into the log without adding speculation', async () => {
    await withCapturedLogs(async (captured) => {
      const err = new Error('Code №3 - Unknown method passed');
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
      assert.match(captured[0], /Could not set online status/);
      // The full VK error must be visible in the log.
      assert.match(captured[0], /Unknown method passed/);
      // Pretty-printed JSON brings the error message onto its own indented
      // line, so the user/log reader can quickly find it.
      assert.match(captured[0], /\n {4}"message":/);
      // No speculative wording sneaks in.
      assert.doesNotMatch(captured[0], /likely|maybe|probably|presumably/i);
    });
  });
});

describe('setOnlineStatus: other errors', () => {
  it('logs the generic warning for non-VK errors too', async () => {
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
