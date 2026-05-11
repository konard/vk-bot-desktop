import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { setOnlineStatus } from '../src/bot/triggers/set-online-status.js';
import { addSink, clearSinks } from '../src/bot/logger.js';

let captured;
beforeEach(() => {
  captured = [];
  clearSinks();
  addSink((line) => captured.push(line));
});
afterEach(() => {
  clearSinks();
});

describe('setOnlineStatus', () => {
  it('logs success on a healthy call', async () => {
    const vk = { api: { account: { setOnline: async () => true } } };
    await setOnlineStatus({ vk });
    assert.equal(captured.length, 1);
    assert.match(captured[0], /Online status is set/);
  });

  it('emits a code-3 hint when VK returns "Unknown method passed"', async () => {
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

  it('falls back to the generic warning for other errors', async () => {
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
