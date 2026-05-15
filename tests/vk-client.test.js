import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createVkClient } from '../src/bot/vk-client.js';

class FakeAPIRequest {
  constructor({ api, method, params = {}, headers = {} }) {
    this.api = api;
    this.method = method;
    this.params = params;
    this.headers = headers;
    this.retries = 0;
  }
  async make() {
    return this.api.__nextResponse;
  }
}

class FakeVK {
  constructor({ token }) {
    this.options = {
      token,
      apiBaseUrl: 'https://api.vk.ru/method',
      apiVersion: '5.199',
      apiHeaders: { 'User-Agent': 'fake/1.0' },
    };
  }
}

// Build a fresh fake vk-io module (with its own APIRequest class) plus a
// fresh log capture for each test. The per-call hook overrides ensure that
// concurrent test runners (Deno) do not share verbose flags or log sinks,
// and the bypass throttle keeps test latency at zero.
function makeFixture({ verbose = true } = {}) {
  class APIRequest extends FakeAPIRequest {}
  const captured = [];
  const fakeLogger = {
    debug: (...args) => captured.push({ level: 'debug', args }),
    info: (...args) => captured.push({ level: 'info', args }),
    warn: (...args) => captured.push({ level: 'warn', args }),
    error: (...args) => captured.push({ level: 'error', args }),
  };
  return {
    vkIoModule: { APIRequest, VK: FakeVK },
    hook: {
      isVerbose: () => verbose,
      logger: fakeLogger,
      throttle: (_method, fn) => fn(),
    },
    captured,
  };
}

function joinedMessage(entry) {
  return entry.args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
}

describe('createVkClient', () => {
  it('returns a VK instance constructed with the given token', async () => {
    const { vkIoModule } = makeFixture();
    const vk = await createVkClient({
      token: 'vk1.a.test_token',
      vkIoModule,
    });
    assert.ok(vk instanceof FakeVK);
    assert.equal(vk.options.token, 'vk1.a.test_token');
  });

  it('throws when no token is provided', async () => {
    const { vkIoModule } = makeFixture();
    await assert.rejects(() => createVkClient({ vkIoModule }), {
      message: /token is required/,
    });
  });

  it('logs request and response when verbose mode is on', async () => {
    const { vkIoModule, hook, captured } = makeFixture({ verbose: true });
    await createVkClient({ token: 'tok', vkIoModule, hook });
    const request = new vkIoModule.APIRequest({
      api: {
        options: {
          apiBaseUrl: 'https://api.vk.ru/method',
          apiVersion: '5.199',
          apiHeaders: { 'User-Agent': 'fake' },
        },
        __nextResponse: { response: { id: 1 } },
      },
      method: 'friends.add',
      params: { user_id: 42 },
    });
    const result = await request.make();
    assert.deepEqual(result, { response: { id: 1 } });
    const requestLog = captured.find((e) => e.args[0] === 'VK API request');
    assert.ok(requestLog, 'request log must be emitted');
    assert.equal(requestLog.args[1].method, 'friends.add');
    assert.match(requestLog.args[1].url, /api\.vk\.ru/);
    const responseLog = captured.find((e) => e.args[0] === 'VK API response');
    assert.ok(responseLog, 'response log must be emitted');
    assert.equal(responseLog.args[1].method, 'friends.add');
  });

  it('logs an APIError-shaped response (code 3) verbatim', async () => {
    const { vkIoModule, hook, captured } = makeFixture({ verbose: true });
    await createVkClient({ token: 'tok', vkIoModule, hook });
    const request = new vkIoModule.APIRequest({
      api: {
        options: {
          apiBaseUrl: 'https://api.vk.ru/method',
          apiVersion: '5.199',
          apiHeaders: {},
        },
        __nextResponse: {
          error: {
            error_code: 3,
            error_msg: 'Unknown method passed.',
          },
        },
      },
      method: 'account.setOnline',
      params: {},
    });
    const result = await request.make();
    assert.equal(result.error.error_code, 3);
    const responseLog = captured.find((e) => e.args[0] === 'VK API response');
    assert.ok(responseLog);
    assert.equal(responseLog.args[1].method, 'account.setOnline');
    assert.equal(responseLog.args[1].errorMsg, 'Unknown method passed.');
    assert.equal(responseLog.args[1].errorCode, 3);
  });

  it('skips request/response logging when verbose is off', async () => {
    const { vkIoModule, hook, captured } = makeFixture({ verbose: false });
    await createVkClient({ token: 'tok', vkIoModule, hook });
    const request = new vkIoModule.APIRequest({
      api: {
        options: {
          apiBaseUrl: 'https://api.vk.ru/method',
          apiVersion: '5.199',
          apiHeaders: {},
        },
        __nextResponse: { response: 1 },
      },
      method: 'friends.get',
      params: {},
    });
    await request.make();
    assert.equal(
      captured.filter((e) => e.args[0] === 'VK API request').length,
      0
    );
  });

  it('redacts access_token from logged params', async () => {
    const { vkIoModule, hook, captured } = makeFixture({ verbose: true });
    await createVkClient({ token: 'tok', vkIoModule, hook });
    const request = new vkIoModule.APIRequest({
      api: {
        options: {
          apiBaseUrl: 'https://api.vk.ru/method',
          apiVersion: '5.199',
          apiHeaders: {},
        },
        __nextResponse: { response: 1 },
      },
      method: 'friends.delete',
      params: {
        user_id: 1,
        access_token: 'super-secret-token-value-1234567890',
      },
    });
    await request.make();
    const all = captured.map(joinedMessage).join('\n');
    assert.doesNotMatch(all, /super-secret-token-value/);
  });
});
