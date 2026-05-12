import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeWithDefaults,
  UPSTREAM_INVITATION_COMMUNITIES,
} from '../src/bot/config.js';

describe('bot config defaults', () => {
  it('normalizes empty array fields parsed from lino as empty objects', () => {
    const config = mergeWithDefaults({
      invitationPost: { communities: {} },
      priorityFriendIds: {},
      birthdayGreetings: {},
    });

    assert.deepEqual(config.invitationPost.communities, []);
    assert.deepEqual(config.priorityFriendIds, []);
    assert.deepEqual(config.birthdayGreetings, []);
  });

  it('preserves default invitation messages when only communities are saved', () => {
    const config = mergeWithDefaults({
      invitationPost: { communities: {} },
    });

    assert.equal(config.invitationPost.messages.length, 10);
    assert.deepEqual(config.invitationPost.communities, []);
  });

  it('parses priorityFriendIds from mixed strings, links and arrays', () => {
    const config = mergeWithDefaults({
      priorityFriendIds:
        '1, 2; 3\nhttps://vk.com/id4 -5 vk.com/club6 https://vk.com/durov',
    });

    // 1,2,3,4 → user IDs; -5 → community (signed → group); club6 → -6.
    // Screen names that cannot be resolved without VK API are dropped.
    assert.deepEqual(config.priorityFriendIds, [1, 2, 3, 4, -5, -6]);
  });

  it('parses invitation communities from links and id-prefixed forms', () => {
    const config = mergeWithDefaults({
      invitationPost: {
        communities:
          '64758790, https://vk.com/club34985835; club24261502\n53294903',
      },
    });

    assert.deepEqual(
      config.invitationPost.communities,
      [64758790, 34985835, 24261502, 53294903]
    );
  });

  it('keeps numeric arrays untouched but de-duplicates', () => {
    const config = mergeWithDefaults({
      priorityFriendIds: [1, 2, 2, 3, 0, '4', 'club5'],
    });
    assert.deepEqual(config.priorityFriendIds, [1, 2, 3, 4, -5]);
  });

  it('exposes the upstream invitation community list', () => {
    assert.equal(UPSTREAM_INVITATION_COMMUNITIES.length, 16);
    assert.ok(
      UPSTREAM_INVITATION_COMMUNITIES.every(
        (id) => typeof id === 'number' && id > 0
      )
    );
  });
});
