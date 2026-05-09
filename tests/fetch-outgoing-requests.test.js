import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchOutgoingRequestIds } from '../src/bot/fetch-outgoing-requests.js';

describe('fetchOutgoingRequestIds', () => {
  it('returns [] when vk client is missing', async () => {
    assert.deepEqual(await fetchOutgoingRequestIds(), []);
    assert.deepEqual(await fetchOutgoingRequestIds({}), []);
  });

  it('returns [] when friends.getRequests is missing', async () => {
    assert.deepEqual(await fetchOutgoingRequestIds({ vk: { api: {} } }), []);
  });

  it('returns the items array from the VK response', async () => {
    let received;
    const vk = {
      api: {
        friends: {
          getRequests: async (params) => {
            received = params;
            return { items: [1, 2, 3] };
          },
        },
      },
    };
    const ids = await fetchOutgoingRequestIds({ vk });
    assert.deepEqual(ids, [1, 2, 3]);
    assert.equal(received.out, 1);
    assert.equal(received.count, 1000);
    assert.equal(received.need_viewed, 1);
  });

  it('returns [] when items is not an array', async () => {
    const vk = {
      api: {
        friends: {
          getRequests: async () => ({ count: 0 }),
        },
      },
    };
    assert.deepEqual(await fetchOutgoingRequestIds({ vk }), []);
  });
});
