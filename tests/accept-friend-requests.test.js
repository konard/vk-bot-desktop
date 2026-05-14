import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptFriendRequests,
  resetAcceptFriendRequestsSupport,
} from '../src/bot/triggers/accept-friend-requests.js';
import { resetAppPermissionsCache } from '../src/bot/api-errors.js';
import { addSink, removeSink } from '../src/bot/logger.js';

function withCapturedLogs(fn) {
  const captured = [];
  const sink = (line) => captured.push(line);
  addSink(sink);
  return Promise.resolve(fn(captured)).finally(() => removeSink(sink));
}

function makeVk({ overrides = {}, addImpl, getRequestsImpl } = {}) {
  return {
    api: {
      friends: {
        get: async () => ({ items: [] }),
        getRequests: getRequestsImpl ?? (async () => ({ items: [] })),
        getMutual: async () => [],
        add: addImpl ?? (async () => 1),
        ...overrides,
      },
      account: {
        getAppPermissions: async () => 1073737727,
      },
    },
  };
}

const emptyStats = {
  setInitialFriendsCount: async () => undefined,
  readTotal: async () => ({ acceptedFriends: 0, incomingRequestsSeen: 0 }),
  recordAccepted: async () => undefined,
};

async function runWithFastSleep(fn) {
  // Replace setTimeout globally so the trigger's per-add 10 s sleeps resolve
  // immediately during the test. Restored afterwards.
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (cb) => original(cb, 0);
  try {
    await fn();
  } finally {
    globalThis.setTimeout = original;
  }
}

describe('acceptFriendRequests: code 3 halts trigger for the process', () => {
  it('stops the run on first Unknown method passed and short-circuits later runs', async () => {
    resetAcceptFriendRequestsSupport();
    resetAppPermissionsCache();
    await withCapturedLogs(async (captured) => {
      let addCalls = 0;
      const err = Object.assign(new Error('Unknown method passed'), {
        code: 3,
      });
      const vk = makeVk({
        addImpl: async () => {
          addCalls += 1;
          throw err;
        },
        getRequestsImpl: async ({ out }) =>
          out ? { items: [] } : { items: [] },
      });
      const config = {
        limits: { maxFriends: 10000 },
        priorityFriendIds: [101, 102, 103],
      };
      await runWithFastSleep(() =>
        acceptFriendRequests({ vk, config, stats: emptyStats })
      );
      await acceptFriendRequests({ vk, config, stats: emptyStats });
      assert.equal(addCalls, 1, 'should only attempt the very first add');
      const haltLines = captured.filter((line) => /halting trigger/.test(line));
      assert.equal(haltLines.length, 1);
    });
  });
});

describe('acceptFriendRequests: skips users with existing outgoing requests', () => {
  it('does not re-send priority friend requests already pending', async () => {
    resetAcceptFriendRequestsSupport();
    resetAppPermissionsCache();
    await withCapturedLogs(async () => {
      const sentTo = [];
      const vk = makeVk({
        overrides: {
          get: async () => ({ items: [] }),
          getRequests: async ({ out }) =>
            out ? { items: [42, 99] } : { items: [] },
        },
        addImpl: async ({ user_id: userId }) => {
          sentTo.push(userId);
          return 1;
        },
      });
      await runWithFastSleep(() =>
        acceptFriendRequests({
          vk,
          config: {
            limits: { maxFriends: 10000 },
            priorityFriendIds: [42, 7],
          },
          stats: emptyStats,
        })
      );
      assert.deepEqual(
        sentTo,
        [7],
        'should skip user 42 (already outgoing) and only send to 7'
      );
    });
  });
});

describe('acceptFriendRequests: rate-limit code 29 backs off then stops', () => {
  it('aborts the priority loop after a 29 from VK', async () => {
    resetAcceptFriendRequestsSupport();
    resetAppPermissionsCache();
    await withCapturedLogs(async (captured) => {
      let calls = 0;
      const err = Object.assign(new Error('Rate limit'), { code: 29 });
      const vk = makeVk({
        addImpl: async () => {
          calls += 1;
          throw err;
        },
        getRequestsImpl: async ({ out }) =>
          out ? { items: [] } : { items: [] },
      });
      await runWithFastSleep(() =>
        acceptFriendRequests({
          vk,
          config: {
            limits: { maxFriends: 10000 },
            priorityFriendIds: [10, 11, 12],
          },
          stats: emptyStats,
        })
      );
      assert.equal(calls, 1, 'should stop after the first 29');
      const rateLines = captured.filter((line) => /Rate limit/.test(line));
      assert.ok(rateLines.length >= 1);
    });
  });
});
