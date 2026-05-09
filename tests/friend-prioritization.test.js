import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  selectIncomingRequests,
  pickPrioritySendList,
  pickDeactivatedToDelete,
} from '../src/bot/friend-prioritization.js';

describe('selectIncomingRequests', () => {
  it('returns top 10% when below the friend limit', () => {
    const requests = Array.from({ length: 20 }, (_, i) => ({
      userId: 1000 + i,
      mutualCount: i,
    }));
    const out = selectIncomingRequests({
      requests,
      currentFriendCount: 100,
      limits: { maxFriends: 10000, topPercentMutuals: 10, maxRequestsPerRun: 25 },
    });
    assert.equal(out.length, 2);
    assert.deepEqual(
      out.map((r) => r.userId),
      [1019, 1018]
    );
  });

  it('above the limit only accepts requests with mutuals', () => {
    const requests = [
      { userId: 1, mutualCount: 0 },
      { userId: 2, mutualCount: 5 },
      { userId: 3, mutualCount: 12 },
    ];
    const out = selectIncomingRequests({
      requests,
      currentFriendCount: 10000,
      limits: { maxFriends: 10000, topPercentMutuals: 10, maxRequestsPerRun: 25 },
    });
    assert.equal(out.length, 0); // remainingCapacity is 0 at the cap
  });

  it('returns nothing when capacity is exhausted', () => {
    const out = selectIncomingRequests({
      requests: [{ userId: 1, mutualCount: 5 }],
      currentFriendCount: 10000,
      limits: { maxFriends: 10000, topPercentMutuals: 10, maxRequestsPerRun: 25 },
    });
    assert.deepEqual(out, []);
  });

  it('returns nothing for empty input', () => {
    assert.deepEqual(selectIncomingRequests({ requests: [] }), []);
  });
});

describe('pickPrioritySendList', () => {
  it('returns priority IDs not yet in friends', () => {
    const out = pickPrioritySendList({
      priorityFriendIds: [1, 2, 3, 4],
      currentFriendIds: [2, 4],
      remainingCapacity: 10,
    });
    assert.deepEqual(out, [1, 3]);
  });

  it('respects remaining capacity', () => {
    const out = pickPrioritySendList({
      priorityFriendIds: [10, 20, 30],
      currentFriendIds: [],
      remainingCapacity: 2,
    });
    assert.deepEqual(out, [10, 20]);
  });
});

describe('pickDeactivatedToDelete', () => {
  it('returns banned/deleted friends excluding priority list', () => {
    const out = pickDeactivatedToDelete({
      friends: [
        { id: 1, deactivated: 'banned' },
        { id: 2, deactivated: 'deleted' },
        { id: 3, deactivated: undefined },
        { id: 4, deactivated: 'banned' },
      ],
      priorityFriendIds: [4],
    });
    assert.deepEqual(
      out.map((f) => f.id),
      [1, 2]
    );
  });
});
