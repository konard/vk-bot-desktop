import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  redact,
  logger,
  addSink,
  clearSinks,
} from '../src/bot/logger.js';

describe('redact', () => {
  it('masks long token-like strings', () => {
    const long = 'abcdef'.repeat(8); // 48 chars
    const out = redact(`token=${long}`);
    assert.match(out, /token=\*\*\*/);
  });

  it('masks query-style secrets', () => {
    const out = redact('https://api.vk.com/method?access_token=plain&v=5.131');
    assert.match(out, /access_token=\*\*\*/);
    assert.match(out, /v=5\.131/);
  });

  it('masks secret-named object properties', () => {
    const out = redact({
      vk: { token: 'super-secret-value' },
      password: 'p',
      cookie: 'c',
    });
    assert.equal(out.vk.token, '***');
    assert.equal(out.password, '***');
    assert.equal(out.cookie, '***');
  });

  it('handles circular references', () => {
    const a = { name: 'a' };
    a.self = a;
    const out = redact(a);
    assert.equal(out.name, 'a');
    assert.equal(out.self, '[circular]');
  });

  it('does not mask short ids', () => {
    const out = redact('user 12345 added');
    assert.equal(out, 'user 12345 added');
  });
});

describe('logger sinks', () => {
  it('routes log lines to registered sinks with redaction', () => {
    const captured = [];
    clearSinks();
    addSink((line) => captured.push(line));
    try {
      logger.info('token=' + 'x'.repeat(50));
    } finally {
      clearSinks();
    }
    assert.equal(captured.length, 1);
    assert.match(captured[0], /token=\*\*\*/);
    assert.match(captured[0], /\[info\]/);
  });
});
