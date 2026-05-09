import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveTheme,
  applyTheme,
  watchSystemTheme,
} from '../electron/renderer/theme.js';

describe('resolveTheme', () => {
  it('honors explicit light or dark preferences', () => {
    assert.equal(resolveTheme({ preference: 'light', systemTheme: 'dark' }), 'light');
    assert.equal(resolveTheme({ preference: 'dark', systemTheme: 'light' }), 'dark');
  });

  it('falls back to system theme when preference is auto', () => {
    assert.equal(resolveTheme({ preference: 'auto', systemTheme: 'dark' }), 'dark');
    assert.equal(resolveTheme({ preference: 'auto', systemTheme: 'light' }), 'light');
  });

  it('defaults to light when system theme is missing', () => {
    assert.equal(resolveTheme({ preference: 'auto' }), 'light');
  });
});

describe('applyTheme', () => {
  it('writes data-theme to the document element', () => {
    const attrs = {};
    const fakeDocument = {
      setAttribute(key, value) {
        attrs[key] = value;
      },
    };
    applyTheme(fakeDocument, 'dark');
    assert.equal(attrs['data-theme'], 'dark');
  });
});

describe('watchSystemTheme', () => {
  it('returns a no-op when matchMedia is unavailable', () => {
    const stop = watchSystemTheme(null, () => {});
    assert.equal(typeof stop, 'function');
    stop(); // should not throw
  });

  it('listens via addEventListener and reports dark/light', () => {
    let listener;
    const fakeMedia = {
      addEventListener(event, fn) {
        listener = fn;
      },
      removeEventListener() {},
    };
    const events = [];
    const stop = watchSystemTheme(() => fakeMedia, (value) => events.push(value));
    listener({ matches: true });
    listener({ matches: false });
    stop();
    assert.deepEqual(events, ['dark', 'light']);
  });
});
