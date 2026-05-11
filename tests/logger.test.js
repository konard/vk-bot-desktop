import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  redact,
  logger,
  addSink,
  removeSink,
  setVerbose,
  isVerbose,
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
    const sink = (line) => captured.push(line);
    addSink(sink);
    try {
      logger.info(`token=${'x'.repeat(50)}`);
    } finally {
      removeSink(sink);
    }
    assert.equal(captured.length, 1);
    assert.match(captured[0], /token=\*\*\*/);
    assert.match(captured[0], /\[info\]/);
  });

  it('pretty-prints object arguments with indentation', () => {
    const captured = [];
    const sink = (line) => captured.push(line);
    addSink(sink);
    try {
      logger.error('Could not set online status', {
        error: new Error('Unknown method passed.'),
      });
    } finally {
      removeSink(sink);
    }
    assert.equal(captured.length, 1);
    // Pretty-printed JSON contains newlines and two-space indents.
    assert.match(captured[0], /\n {2}"error":/);
    assert.match(captured[0], /\n {4}"message":/);
  });
});

describe('verbose mode', () => {
  it('is enabled by default so debug lines reach sinks', () => {
    const previous = isVerbose();
    setVerbose(true);
    const captured = [];
    const sink = (line) => captured.push(line);
    addSink(sink);
    try {
      logger.debug('verbose probe');
    } finally {
      removeSink(sink);
      setVerbose(previous);
    }
    assert.equal(captured.length, 1);
    assert.match(captured[0], /\[debug\]/);
    assert.match(captured[0], /verbose probe/);
  });

  it('suppresses debug lines when toggled off', () => {
    const previous = isVerbose();
    setVerbose(false);
    const captured = [];
    const sink = (line) => captured.push(line);
    addSink(sink);
    try {
      logger.debug('hidden');
      logger.info('shown');
    } finally {
      removeSink(sink);
      setVerbose(previous);
    }
    assert.equal(captured.length, 1);
    assert.match(captured[0], /\[info\]/);
  });
});
