import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  KATE_MOBILE_TOKEN_URL,
  LOCALHOST_TOKEN_URL,
  extractVkAccessToken,
} from '../electron/renderer/vk-token.js';

describe('VK token helpers', () => {
  it('keeps the Kate Mobile blank-page OAuth URL requested by issue 26', () => {
    assert.equal(
      KATE_MOBILE_TOKEN_URL,
      'https://oauth.vk.com/authorize?client_id=2685278&scope=1073737727&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1'
    );
  });

  it('builds the experimental localhost redirect OAuth URL', () => {
    assert.equal(
      LOCALHOST_TOKEN_URL,
      'https://oauth.vk.com/authorize?client_id=2685278&scope=1073737727&redirect_uri=http://localhost:26852/vk-oauth&display=page&response_type=token&revoke=1'
    );
  });

  it('extracts access_token from pasted VK redirect URLs', () => {
    assert.equal(
      extractVkAccessToken(
        'https://oauth.vk.com/blank.html#access_token=vk1.a.ZRB_token&expires_in=0&user_id=3972090&email=user@example.test'
      ),
      'vk1.a.ZRB_token'
    );
    assert.equal(
      extractVkAccessToken(
        'http://localhost:26852/vk-oauth#access_token=vk1.a.LOCAL_token&expires_in=0'
      ),
      'vk1.a.LOCAL_token'
    );
  });

  it('accepts a raw token without changing it beyond trimming whitespace', () => {
    assert.equal(
      extractVkAccessToken('  vk1.a.raw_token  '),
      'vk1.a.raw_token'
    );
  });

  it('wires the whitelisted token URLs through Electron IPC', () => {
    const mainSource = fs.readFileSync('electron/main.cjs', 'utf8');
    const preloadSource = fs.readFileSync('electron/preload.cjs', 'utf8');

    assert.match(mainSource, /shell\.openExternal/);
    assert.match(mainSource, /startOauthCallbackServer/);
    assert.match(mainSource, /vkbot:open-token-url/);
    assert.match(mainSource, /vkbot:token/);
    assert.match(
      mainSource,
      new RegExp(KATE_MOBILE_TOKEN_URL.replace(/\?/g, '\\?'))
    );
    assert.match(
      mainSource,
      new RegExp(LOCALHOST_TOKEN_URL.replace(/\?/g, '\\?'))
    );
    assert.match(preloadSource, /openTokenUrl/);
    assert.match(preloadSource, /onToken/);
  });
});
