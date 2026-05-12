import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  asList,
  parseVkIdList,
  parseVkReference,
  parseVkReferenceList,
  splitListTokens,
} from '../src/bot/list-values.js';

describe('asList', () => {
  it('passes through arrays', () => {
    assert.deepEqual(asList([1, 2, 3]), [1, 2, 3]);
  });

  it('wraps primitives', () => {
    assert.deepEqual(asList('a'), ['a']);
    assert.deepEqual(asList(7), [7]);
  });

  it('returns empty for nullish or object input', () => {
    assert.deepEqual(asList(undefined), []);
    assert.deepEqual(asList(null), []);
    assert.deepEqual(asList({ a: 1 }), []);
  });
});

describe('splitListTokens', () => {
  it('splits on commas, semicolons, spaces, tabs and newlines', () => {
    assert.deepEqual(splitListTokens('1, 2; 3\n4\t5  6'), [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('trims and drops empty tokens', () => {
    assert.deepEqual(splitListTokens('  , , 9, , '), ['9']);
  });

  it('treats nullish input as empty list', () => {
    assert.deepEqual(splitListTokens(null), []);
    assert.deepEqual(splitListTokens(undefined), []);
    assert.deepEqual(splitListTokens(''), []);
  });
});

describe('parseVkReference', () => {
  it('parses raw positive integers as users by default', () => {
    assert.deepEqual(parseVkReference('123'), {
      id: 123,
      isGroup: false,
      raw: '123',
    });
  });

  it('parses raw negative integers as communities by default', () => {
    assert.deepEqual(parseVkReference('-64758790'), {
      id: 64758790,
      isGroup: true,
      raw: '-64758790',
    });
  });

  it('parses raw positive integers as communities when expecting community', () => {
    assert.deepEqual(parseVkReference('123', { expect: 'community' }), {
      id: 123,
      isGroup: true,
      raw: '123',
    });
  });

  it('parses idN, clubN, publicN and eventN', () => {
    assert.equal(parseVkReference('id42').id, 42);
    assert.equal(parseVkReference('id42').isGroup, false);
    assert.equal(parseVkReference('club42').id, 42);
    assert.equal(parseVkReference('club42').isGroup, true);
    assert.equal(parseVkReference('public42').isGroup, true);
    assert.equal(parseVkReference('event42').isGroup, true);
  });

  it('parses full and short VK links', () => {
    assert.equal(parseVkReference('https://vk.com/club12345').id, 12345);
    assert.equal(parseVkReference('https://vk.com/club12345').isGroup, true);
    assert.equal(parseVkReference('http://m.vk.com/id7').id, 7);
    assert.equal(parseVkReference('vk.com/public99').id, 99);
    assert.equal(parseVkReference('vk.ru/club5').id, 5);
  });

  it('parses screen-name links', () => {
    assert.deepEqual(parseVkReference('https://vk.com/durov'), {
      screenName: 'durov',
      raw: 'https://vk.com/durov',
    });
  });

  it('accepts bare screen names', () => {
    assert.deepEqual(parseVkReference('Cool.Guy_42'), {
      screenName: 'cool.guy_42',
      raw: 'Cool.Guy_42',
    });
  });

  it('rejects empty and zero tokens', () => {
    assert.equal(parseVkReference(''), null);
    assert.equal(parseVkReference('   '), null);
    assert.equal(parseVkReference('0'), null);
    assert.equal(parseVkReference('club0'), null);
  });

  it('rejects junk', () => {
    assert.equal(parseVkReference('!!!'), null);
    assert.equal(parseVkReference('some long sentence with spaces'), null);
  });
});

describe('parseVkReferenceList', () => {
  it('parses mixed separators and link formats', () => {
    const refs = parseVkReferenceList(
      '64758790, 34985835\nhttps://vk.com/club24261502; vk.com/durov  id7'
    );
    assert.deepEqual(
      refs.map((r) => ({ id: r.id, isGroup: r.isGroup, name: r.screenName })),
      [
        { id: 64758790, isGroup: false, name: undefined },
        { id: 34985835, isGroup: false, name: undefined },
        { id: 24261502, isGroup: true, name: undefined },
        { id: undefined, isGroup: undefined, name: 'durov' },
        { id: 7, isGroup: false, name: undefined },
      ]
    );
  });

  it('dedupes equivalent forms', () => {
    const refs = parseVkReferenceList(
      '123 vk.com/id123 id123 https://vk.com/id123'
    );
    assert.equal(refs.length, 1);
    assert.equal(refs[0].id, 123);
  });

  it('treats community context properly', () => {
    const refs = parseVkReferenceList('64758790, https://vk.com/club34985835', {
      expect: 'community',
    });
    assert.deepEqual(
      refs.map((r) => ({ id: r.id, isGroup: r.isGroup })),
      [
        { id: 64758790, isGroup: true },
        { id: 34985835, isGroup: true },
      ]
    );
  });
});

describe('parseVkIdList', () => {
  it('returns numeric IDs for user lists', () => {
    const { ids, unresolvedTokens } = parseVkIdList(
      '1, 2, -3, https://vk.com/id4, https://vk.com/durov'
    );
    assert.deepEqual(ids, [1, 2, -3, 4]);
    assert.deepEqual(unresolvedTokens, ['https://vk.com/durov']);
  });

  it('returns positive community IDs for community lists', () => {
    const { ids } = parseVkIdList(
      '64758790, https://vk.com/club34985835, club24261502',
      { expect: 'community' }
    );
    assert.deepEqual(ids, [64758790, 34985835, 24261502]);
  });
});
