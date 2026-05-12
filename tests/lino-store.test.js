import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { LinoStore } from '../src/lino-store.js';
import { mergeWithDefaults } from '../src/bot/config.js';

// Deno's restricted permission set used in CI (`deno test --allow-read`) does
// not grant env access, but `os.tmpdir()` reads TMPDIR/TEMP env vars. Skip
// the filesystem-backed tests under Deno; Node still exercises them fully.
const isDenoRuntime = typeof Deno !== 'undefined';

async function makeStore() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lino-store-'));
  const globalDir = path.join(root, 'global');
  const localDir = path.join(root, 'local');
  return {
    store: new LinoStore({ globalDir, localDir }),
    cleanup: () => rm(root, { recursive: true, force: true }),
    paths: { root, globalDir, localDir },
  };
}

describe('LinoStore', { skip: isDenoRuntime }, () => {
  it('round-trips a config through formatIndented/parseIndented', async () => {
    const { store, cleanup } = await makeStore();
    try {
      const value = {
        vk: { token: 'abc 123' },
        features: { onlineStatus: true, sendInvitationPosts: false },
        priorityFriendIds: [1, 2, 3],
      };
      await store.saveConfig(value, 'global');
      const loaded = await store.loadLayered();
      assert.deepEqual(loaded.vk.token, 'abc 123');
      assert.equal(loaded.features.onlineStatus, true);
      assert.equal(loaded.features.sendInvitationPosts, false);
      // Arrays of scalars are serialized as repeated child values; verify
      // we can read all three back.
      assert.deepEqual(loaded.priorityFriendIds, [1, 2, 3]);
    } finally {
      await cleanup();
    }
  });

  it('normalizes empty and scalar list fields after loading lino config', async () => {
    const { store, cleanup } = await makeStore();
    try {
      await store.saveConfig(
        {
          priorityFriendIds: [],
          invitationPost: {
            text: 'Custom invitation',
            messages: ['Custom invitation'],
            communities: ['123'],
          },
          birthdayGreetings: ['Custom greeting'],
        },
        'global'
      );
      const loaded = await store.loadLayered();
      assert.equal(Object.hasOwn(loaded, 'priorityFriendIds'), false);
      const merged = mergeWithDefaults({
        ...loaded,
        birthdayGreetings: 'Single greeting',
      });

      assert.deepEqual(merged.priorityFriendIds, []);
      assert.deepEqual(merged.invitationPost.messages, ['Custom invitation']);
      assert.deepEqual(merged.invitationPost.communities, [123]);
      assert.deepEqual(merged.birthdayGreetings, ['Single greeting']);
    } finally {
      await cleanup();
    }
  });

  it('normalizes legacy bare-key list shapes from existing config files', () => {
    const merged = mergeWithDefaults({
      priorityFriendIds: {},
      invitationPost: {
        messages: {},
        communities: {},
      },
      birthdayGreetings: {},
    });

    assert.deepEqual(merged.priorityFriendIds, []);
    assert.deepEqual(merged.invitationPost.messages, []);
    assert.deepEqual(merged.invitationPost.communities, []);
    assert.deepEqual(merged.birthdayGreetings, []);
  });

  it('local config overrides global', async () => {
    const { store, cleanup } = await makeStore();
    try {
      await store.saveConfig(
        { vk: { token: 'global' }, mode: 'local' },
        'global'
      );
      await store.saveConfig({ vk: { token: 'local' } }, 'local');
      const merged = await store.loadLayered();
      assert.equal(merged.vk.token, 'local');
      assert.equal(merged.mode, 'local');
    } finally {
      await cleanup();
    }
  });

  it('keeps empty invitation communities iterable after loading config', async () => {
    const { store, cleanup } = await makeStore();
    try {
      await store.saveConfig(
        {
          vk: { token: 'vk1.a.testtoken_ok' },
          features: { sendInvitationPosts: true },
          invitationPost: { communities: [] },
        },
        'global'
      );
      const loaded = await store.loadLayered();
      const config = mergeWithDefaults(loaded);
      assert.deepEqual(config.invitationPost.communities, []);
    } finally {
      await cleanup();
    }
  });

  it('returns empty object when no config files exist', async () => {
    const { store, cleanup } = await makeStore();
    try {
      const merged = await store.loadLayered();
      assert.deepEqual(merged, {});
    } finally {
      await cleanup();
    }
  });
});
