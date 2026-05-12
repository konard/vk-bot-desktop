import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createVkClient } from '../src/bot/vk-client.js';
import { addSink, removeSink, setVerbose } from '../src/bot/logger.js';

function withCapturedLogs(fn) {
  const captured = [];
  const sink = (line) => captured.push(line);
  addSink(sink);
  return Promise.resolve(fn(captured)).finally(() => removeSink(sink));
}

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

function makeFakeVkIo() {
  // Each fake module exposes a fresh APIRequest class so the install hook
  // does not bleed between tests (the wrapper installs once per class).
  class APIRequest extends FakeAPIRequest {}
  return {
    APIRequest,
    VK: FakeVK,
  };
}

describe('createVkClient', () => {
  it('returns a VK instance constructed with the given token', async () => {
    const vkIoModule = makeFakeVkIo();
    const vk = await createVkClient({
      token: 'vk1.a.test_token',
      vkIoModule,
    });
    assert.ok(vk instanceof FakeVK);
    assert.equal(vk.options.token, 'vk1.a.test_token');
  });

  it('throws when no token is provided', async () => {
    await assert.rejects(() => createVkClient({ vkIoModule: makeFakeVkIo() }), {
      message: /token is required/,
    });
  });

  it('logs request and response when verbose mode is on', async () => {
    setVerbose(true);
    const vkIoModule = makeFakeVkIo();
    await createVkClient({ token: 'tok', vkIoModule });
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
    await withCapturedLogs(async (captured) => {
      const result = await request.make();
      assert.deepEqual(result, { response: { id: 1 } });
      const requestLog = captured.find((l) => l.includes('VK API request'));
      assert.ok(requestLog, 'request log must be emitted');
      assert.match(requestLog, /friends\.add/);
      assert.match(requestLog, /api\.vk\.ru/);
      const responseLog = captured.find((l) => l.includes('VK API response'));
      assert.ok(responseLog, 'response log must be emitted');
      assert.match(responseLog, /friends\.add/);
    });
  });

  it('logs an APIError-shaped response (code 3) verbatim', async () => {
    setVerbose(true);
    const vkIoModule = makeFakeVkIo();
    await createVkClient({ token: 'tok', vkIoModule });
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
    await withCapturedLogs(async (captured) => {
      const result = await request.make();
      assert.equal(result.error.error_code, 3);
      const responseLog = captured.find((l) => l.includes('VK API response'));
      assert.ok(responseLog);
      assert.match(responseLog, /account\.setOnline/);
      assert.match(responseLog, /Unknown method passed/);
      assert.match(responseLog, /"errorCode": 3/);
    });
  });

  it('skips request/response logging when verbose is off', async () => {
    setVerbose(false);
    const vkIoModule = makeFakeVkIo();
    await createVkClient({ token: 'tok', vkIoModule });
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
    await withCapturedLogs(async (captured) => {
      await request.make();
      assert.equal(
        captured.filter((l) => l.includes('VK API request')).length,
        0
      );
    });
    setVerbose(true);
  });

  it('redacts access_token from logged params', async () => {
    setVerbose(true);
    const vkIoModule = makeFakeVkIo();
    await createVkClient({ token: 'tok', vkIoModule });
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
    await withCapturedLogs(async (captured) => {
      await request.make();
      const all = captured.join('\n');
      assert.doesNotMatch(all, /super-secret-token-value/);
    });
  });
});
