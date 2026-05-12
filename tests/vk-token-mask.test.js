import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { maskVkToken } from '../electron/renderer/vk-token-mask.js';

describe('maskVkToken', () => {
  it('returns empty string for nullish or empty input', () => {
    assert.equal(maskVkToken(undefined), '');
    assert.equal(maskVkToken(null), '');
    assert.equal(maskVkToken(''), '');
  });

  it('returns the value unchanged when it fits within the visible window', () => {
    assert.equal(maskVkToken('a'.repeat(20)), 'a'.repeat(20));
    assert.equal(maskVkToken('short-token'), 'short-token');
  });

  it('keeps the first 10 and last 10 characters of long tokens', () => {
    const token =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_!@#$%';
    const masked = maskVkToken(token);
    assert.equal(masked.startsWith(token.slice(0, 10)), true);
    assert.equal(masked.endsWith(token.slice(-10)), true);
  });

  it('replaces the middle with a fixed bullet run', () => {
    const token = 'a'.repeat(70);
    const masked = maskVkToken(token);
    assert.equal(masked.length, 30);
    assert.match(masked, /^a{10}•{10}a{10}$/u);
  });
});
