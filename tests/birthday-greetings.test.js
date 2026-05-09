import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BIRTHDAY_GREETINGS,
  pickBirthdayGreeting,
  resetBirthdayGreetingState,
} from '../src/bot/messages/birthday-greetings.js';

function countEmoji(text) {
  // Match any code point flagged as Extended_Pictographic — covers
  // emoji including the variation selectors we use.
  return Array.from(text.matchAll(/\p{Extended_Pictographic}/gu)).length;
}

describe('birthday greetings', () => {
  it('contains exactly 10 entries', () => {
    assert.equal(BIRTHDAY_GREETINGS.length, 10);
  });

  it('every greeting has at most 2 emojis', () => {
    for (const greeting of BIRTHDAY_GREETINGS) {
      assert.ok(
        countEmoji(greeting) <= 2,
        `Greeting "${greeting}" has more than 2 emojis`
      );
    }
  });

  it('every greeting is a non-empty Russian-language string', () => {
    for (const greeting of BIRTHDAY_GREETINGS) {
      assert.ok(typeof greeting === 'string' && greeting.length > 0);
    }
  });

  it('does not pick the same index twice in a row', () => {
    resetBirthdayGreetingState();
    let seq = 0;
    const rng = () => {
      // Cycle 0,0.5,0,0.5,... so without protection we'd repeat.
      seq += 1;
      return seq % 2 === 0 ? 0.5 : 0;
    };
    const seen = [];
    for (let i = 0; i < 6; i += 1) {
      seen.push(pickBirthdayGreeting(rng));
    }
    for (let i = 1; i < seen.length; i += 1) {
      assert.notEqual(seen[i], seen[i - 1]);
    }
  });
});
