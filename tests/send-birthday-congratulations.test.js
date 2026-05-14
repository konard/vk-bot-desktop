import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  findBirthdayFriends,
  recentlyMessaged,
  sendBirthdayCongratulations,
} from '../src/bot/triggers/send-birthday-congratulations.js';

describe('findBirthdayFriends', () => {
  it('matches friends whose bdate day/month equal today', () => {
    const today = new Date(2026, 4, 14);
    const friends = [
      { id: 1, bdate: '14.5.2000' },
      { id: 2, bdate: '14.5' },
      { id: 3, bdate: '15.5.2000' },
      { id: 4 },
    ];
    assert.deepEqual(
      findBirthdayFriends({ friends, today }).map((f) => f.id),
      [1, 2]
    );
  });
});

describe('recentlyMessaged', () => {
  const now = 1_700_000_000_000;
  const oneHourAgo = Math.floor(now / 1000) - 60 * 60;
  const threeDaysAgo = Math.floor(now / 1000) - 3 * 24 * 60 * 60;

  it('returns true when the latest message is within the window', async () => {
    const vk = {
      api: {
        messages: {
          getHistory: async () => ({ items: [{ date: oneHourAgo }] }),
        },
      },
    };
    assert.equal(await recentlyMessaged({ vk, userId: 7, now }), true);
  });

  it('returns false when the latest message is older than the window', async () => {
    const vk = {
      api: {
        messages: {
          getHistory: async () => ({ items: [{ date: threeDaysAgo }] }),
        },
      },
    };
    assert.equal(await recentlyMessaged({ vk, userId: 7, now }), false);
  });

  it('returns false when there is no history', async () => {
    const vk = {
      api: {
        messages: {
          getHistory: async () => ({ items: [] }),
        },
      },
    };
    assert.equal(await recentlyMessaged({ vk, userId: 7, now }), false);
  });

  it('returns false when the lookup fails', async () => {
    const vk = {
      api: {
        messages: {
          getHistory: async () => {
            throw new Error('boom');
          },
        },
      },
    };
    assert.equal(await recentlyMessaged({ vk, userId: 7, now }), false);
  });
});

describe('sendBirthdayCongratulations', () => {
  function vkWith({ friends = [], history = {}, sendImpl } = {}) {
    return {
      api: {
        friends: {
          get: async () => ({ items: friends }),
        },
        messages: {
          getHistory: async ({ user_id: userId }) => ({
            items: history[userId] ? [{ date: history[userId] }] : [],
          }),
          send: sendImpl ?? (async () => 1),
        },
      },
    };
  }

  it('skips friends with recent conversation in the last 24 h', async () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const recent = Math.floor(Date.now() / 1000) - 3600;
    const stale = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
    const sent = [];
    const vk = vkWith({
      friends: [
        { id: 11, bdate: `${day}.${month}.2000` },
        { id: 22, bdate: `${day}.${month}.2000` },
      ],
      history: { 11: recent, 22: stale },
      sendImpl: async ({ user_id: userId }) => {
        sent.push(userId);
        return 1;
      },
    });
    // Set features to skip the trigger-level guard but disable the post-send
    // sleep by bumping `setTimeout` aside for the duration of the call.
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (cb) => originalSetTimeout(cb, 0);
    try {
      await sendBirthdayCongratulations({
        vk,
        config: { features: { sendBirthdayCongratulations: true } },
      });
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
    assert.deepEqual(sent, [22]);
  });
});
