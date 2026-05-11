import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { openSessionLog } from '../src/bot/session-log.js';
import logger from '../src/bot/logger.js';

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'vk-bot-session-'));
}

describe('openSessionLog: writes log lines to a session file', () => {
  it('creates a file under the given directory and persists logger output', async () => {
    const dir = await tempDir();
    const session = await openSessionLog({ dir });
    try {
      logger.info('first line from session-log test');
      logger.warn('second line', { detail: 'value' });
    } finally {
      await session.close();
    }
    const text = await fs.readFile(session.filePath, 'utf8');
    assert.match(text, /first line from session-log test/);
    assert.match(text, /second line/);
    assert.equal(
      path.dirname(session.filePath),
      dir,
      'session log lives under the directory we passed in'
    );
  });
});

describe('openSessionLog: redacts secrets in persisted logs', () => {
  it('writes the masked representation, not the raw token', async () => {
    const dir = await tempDir();
    const session = await openSessionLog({ dir });
    try {
      logger.info('vk', { token: 'supersecrettoken-should-never-appear' });
    } finally {
      await session.close();
    }
    const text = await fs.readFile(session.filePath, 'utf8');
    assert.ok(
      !text.includes('supersecrettoken-should-never-appear'),
      'raw secret leaked into session log'
    );
    assert.match(text, /"token": "\*\*\*"/);
  });
});
