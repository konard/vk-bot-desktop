import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mergeWithDefaults } from '../src/bot/config.js';

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
});
