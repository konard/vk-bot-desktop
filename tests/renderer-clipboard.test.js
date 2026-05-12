import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { copyTextToClipboard } from '../electron/renderer/clipboard.js';

describe('renderer clipboard helper', () => {
  it('prefers the Electron preload API when available', async () => {
    let copied = '';
    await copyTextToClipboard('session log', {
      api: {
        copyText: async (text) => {
          copied = text;
          return { ok: true };
        },
      },
      navigator: {
        clipboard: {
          writeText: async () => {
            throw new Error('should not use browser clipboard');
          },
        },
      },
    });

    assert.equal(copied, 'session log');
  });

  it('falls back to navigator.clipboard.writeText outside Electron', async () => {
    let copied = '';
    await copyTextToClipboard('browser log', {
      navigator: {
        clipboard: {
          writeText: async (text) => {
            copied = text;
          },
        },
      },
    });

    assert.equal(copied, 'browser log');
  });

  it('throws when no clipboard implementation is available', async () => {
    await assert.rejects(
      () => copyTextToClipboard('log', {}),
      /Clipboard API is unavailable/
    );
  });
});

describe('Electron clipboard bridge', () => {
  it('exposes a copyText preload API backed by Electron clipboard.writeText', () => {
    const preload = readFileSync('electron/preload.cjs', 'utf8');
    const main = readFileSync('electron/main.cjs', 'utf8');

    assert.match(preload, /copyText/);
    assert.match(preload, /vkbot:copy-text/);
    assert.match(main, /clipboard/);
    assert.match(main, /clipboard\.writeText/);
  });
});
