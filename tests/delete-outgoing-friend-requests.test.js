import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pickOutgoingToCancel } from '../src/bot/triggers/delete-outgoing-friend-requests.js';

describe('pickOutgoingToCancel', () => {
  it('returns the capacity-needed slice excluding priority friends', () => {
    assert.deepEqual(
      pickOutgoingToCancel({
        outgoing: [1, 2, 3, 4],
        priorityFriendIds: [2],
        capacityNeeded: 3,
        hardCap: 2,
      }),
      [1, 3]
    );
  });

  it('treats malformed priority IDs from empty lino arrays as empty', () => {
    assert.deepEqual(
      pickOutgoingToCancel({
        outgoing: [1, 2],
        priorityFriendIds: {},
        capacityNeeded: 2,
      }),
      [1, 2]
    );
  });
});
