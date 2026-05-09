import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectLocale,
  translate,
  TRANSLATIONS,
} from '../electron/renderer/i18n.js';

describe('detectLocale', () => {
  it('returns ru for Russian language tags', () => {
    assert.equal(detectLocale('ru-RU'), 'ru');
    assert.equal(detectLocale('RU'), 'ru');
  });

  it('falls back to en for unknown locales', () => {
    assert.equal(detectLocale('fr-FR'), 'en');
    assert.equal(detectLocale(''), 'en');
    assert.equal(detectLocale(undefined), 'en');
  });
});

describe('translate', () => {
  it('returns the translated string when available', () => {
    assert.equal(translate('en', 'start'), 'Start');
    assert.equal(translate('ru', 'start'), 'Запустить');
  });

  it('falls back to English when key missing in target locale', () => {
    const fakeKey = '__missing_key_for_test__';
    TRANSLATIONS.en[fakeKey] = 'fallback';
    try {
      assert.equal(translate('ru', fakeKey), 'fallback');
    } finally {
      delete TRANSLATIONS.en[fakeKey];
    }
  });

  it('returns the key itself when nothing matches', () => {
    assert.equal(translate('en', '__never_defined__'), '__never_defined__');
  });
});
