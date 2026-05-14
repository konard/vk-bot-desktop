import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isUnknownMethodError,
  fetchAppPermissions,
  resetAppPermissionsCache,
  reportUnknownMethod,
} from '../src/bot/api-errors.js';
import { addSink, removeSink } from '../src/bot/logger.js';

function withCapturedLogs(fn) {
  const captured = [];
  const sink = (line) => captured.push(line);
  addSink(sink);
  return Promise.resolve(fn(captured)).finally(() => removeSink(sink));
}

describe('isUnknownMethodError', () => {
  it('detects code 3 on `code` field', () => {
    assert.equal(isUnknownMethodError({ code: 3 }), true);
  });
  it('detects code 3 on `error_code` field', () => {
    assert.equal(isUnknownMethodError({ error_code: 3 }), true);
  });
  it('ignores other codes', () => {
    assert.equal(isUnknownMethodError({ code: 29 }), false);
    assert.equal(isUnknownMethodError({}), false);
    assert.equal(isUnknownMethodError(null), false);
    assert.equal(isUnknownMethodError(undefined), false);
    assert.equal(isUnknownMethodError(new Error('plain')), false);
  });
});

describe('fetchAppPermissions', () => {
  it('returns the bitmask and caches subsequent calls', async () => {
    resetAppPermissionsCache();
    let calls = 0;
    const vk = {
      api: {
        account: {
          getAppPermissions: async () => {
            calls += 1;
            return 1073737727;
          },
        },
      },
    };
    const first = await fetchAppPermissions(vk);
    const second = await fetchAppPermissions(vk);
    assert.equal(first, 1073737727);
    assert.equal(second, 1073737727);
    assert.equal(calls, 1, 'should cache across calls');
  });

  it('returns null when the method is unavailable', async () => {
    resetAppPermissionsCache();
    assert.equal(await fetchAppPermissions(null), null);
    resetAppPermissionsCache();
    assert.equal(await fetchAppPermissions({ api: {} }), null);
  });

  it('returns null on error', async () => {
    resetAppPermissionsCache();
    const vk = {
      api: {
        account: {
          getAppPermissions: async () => {
            throw new Error('boom');
          },
        },
      },
    };
    assert.equal(await fetchAppPermissions(vk), null);
  });
});

describe('reportUnknownMethod', () => {
  it('emits a single error line that names the trigger, method, and mask', async () => {
    resetAppPermissionsCache();
    await withCapturedLogs(async (captured) => {
      const vk = {
        api: {
          account: { getAppPermissions: async () => 1073737727 },
        },
      };
      const err = Object.assign(new Error('Unknown method passed'), {
        code: 3,
      });
      const handled = await reportUnknownMethod({
        vk,
        method: 'friends.delete',
        error: err,
        trigger: 'delete-deactivated-friends',
      });
      assert.equal(handled, true);
      assert.equal(captured.length, 1);
      assert.match(captured[0], /halting trigger/);
      assert.match(captured[0], /friends\.delete/);
      assert.match(captured[0], /delete-deactivated-friends/);
      assert.match(captured[0], /1073737727/);
      assert.match(captured[0], /Kate Mobile/);
    });
  });
});
