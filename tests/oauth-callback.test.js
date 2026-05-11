import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const {
  CALLBACK_PATH,
  TOKEN_POST_PATH,
  callbackPageHtml,
  startOauthCallbackServer,
} = require('../electron/oauth-callback.cjs');

describe('Electron OAuth localhost callback', () => {
  it('serves a page that posts the URL fragment token back to the app', () => {
    const html = callbackPageHtml();

    assert.match(html, /access_token/);
    assert.match(html, new RegExp(TOKEN_POST_PATH));
  });

  it('accepts a token handoff from the callback page', async () => {
    let receivedToken = '';
    const callback = await startOauthCallbackServer({
      port: 0,
      onToken: (token) => {
        receivedToken = token;
      },
    });

    try {
      const origin = `http://${callback.host}:${callback.port}`;
      const page = await fetch(`${origin}${CALLBACK_PATH}`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Reading VK token/);

      const response = await fetch(`${origin}${TOKEN_POST_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: '  vk1.a.localhost_token  ' }),
      });

      assert.equal(response.status, 200);
      assert.equal(receivedToken, 'vk1.a.localhost_token');
    } finally {
      await callback.close();
    }
  });
});
