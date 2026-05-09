import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INVITATION_MESSAGES,
  pickInvitationMessage,
  resetInvitationMessageState,
} from '../src/bot/messages/invitation-messages.js';

describe('invitation messages', () => {
  it('contains exactly 10 entries', () => {
    assert.equal(INVITATION_MESSAGES.length, 10);
  });

  it('every message is a non-empty Russian-language string', () => {
    for (const message of INVITATION_MESSAGES) {
      assert.ok(typeof message === 'string' && message.length > 0);
      assert.ok(/[А-Яа-яЁё]/.test(message), `"${message}" lacks Cyrillic`);
    }
  });

  it('does not pick the same index twice in a row', () => {
    resetInvitationMessageState();
    let seq = 0;
    const rng = () => {
      seq += 1;
      return seq % 2 === 0 ? 0.5 : 0;
    };
    const seen = [];
    for (let i = 0; i < 6; i += 1) {
      seen.push(pickInvitationMessage(rng));
    }
    for (let i = 1; i < seen.length; i += 1) {
      assert.notEqual(seen[i], seen[i - 1]);
    }
  });

  it('accepts a custom list', () => {
    resetInvitationMessageState();
    const result = pickInvitationMessage(() => 0, ['only one']);
    assert.equal(result, 'only one');
  });

  it('returns empty string for empty list', () => {
    resetInvitationMessageState();
    assert.equal(
      pickInvitationMessage(() => 0, []),
      ''
    );
  });
});
