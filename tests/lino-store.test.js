import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { LinoStore } from '../src/lino-store.js';

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

describe('LinoStore', () => {
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
