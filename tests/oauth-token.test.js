import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const {
  extractVkOAuthBlankToken,
  isAllowedVkAuthNavigation,
  isVkOAuthBlankRedirect,
} = require('../electron/oauth-token.cjs');

describe('VK OAuth blank-page redirect helpers', () => {
  it('extracts the access token from the VK blank-page fragment', () => {
    assert.equal(
      extractVkOAuthBlankToken(
        'https://oauth.vk.com/blank.html#access_token=vk1.a.window_token&expires_in=0&user_id=3972090'
      ),
      'vk1.a.window_token'
    );
  });

  it('recognizes VK blank-page redirects without accepting unrelated URLs', () => {
    assert.equal(
      isVkOAuthBlankRedirect(
        'https://oauth.vk.com/blank.html#access_token=vk1.a.window_token'
      ),
      true
    );
    assert.equal(
      isVkOAuthBlankRedirect(
        'http://localhost:26852/vk-oauth#access_token=vk1.a.localhost_token'
      ),
      false
    );
    assert.equal(
      extractVkOAuthBlankToken(
        'https://example.test/blank.html#access_token=vk1.a.bad_token'
      ),
      ''
    );
  });

  it('allows only VK authorization navigation hosts in the embedded window', () => {
    assert.equal(
      isAllowedVkAuthNavigation('https://oauth.vk.com/authorize'),
      true
    );
    assert.equal(isAllowedVkAuthNavigation('https://id.vk.com/auth'), true);
    assert.equal(isAllowedVkAuthNavigation('https://login.vk.com/'), true);
    assert.equal(isAllowedVkAuthNavigation('https://vk.com/'), true);
    assert.equal(isAllowedVkAuthNavigation('https://example.test/'), false);
    assert.equal(isAllowedVkAuthNavigation('http://oauth.vk.com/'), false);
  });
});
