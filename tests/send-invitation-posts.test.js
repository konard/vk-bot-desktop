import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  readCachedPostIds,
  buildUpdatedCache,
  sendInvitationPosts,
} from '../src/bot/triggers/send-invitation-posts.js';

const clone = (v) =>
  v === null || v === undefined ? v : JSON.parse(JSON.stringify(v));

function fakeStore(initial = null) {
  let value = initial;
  return {
    readCache: async () => clone(value),
    writeCache: async (_name, v) => {
      value = clone(v);
    },
    get value() {
      return value;
    },
  };
}

async function runWithFastSleep(fn) {
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (cb) => original(cb, 0);
  try {
    await fn();
  } finally {
    globalThis.setTimeout = original;
  }
}

describe('readCachedPostIds', () => {
  it('returns [] when cache is missing', () => {
    assert.deepEqual(readCachedPostIds(null, 1), []);
    assert.deepEqual(readCachedPostIds(undefined, 1), []);
    assert.deepEqual(readCachedPostIds({}, 1), []);
  });

  it('returns [] for unknown community', () => {
    assert.deepEqual(readCachedPostIds({ byCommunity: { 99: [1, 2] } }, 1), []);
  });

  it('normalises scalar bucket to a single-element array', () => {
    assert.deepEqual(readCachedPostIds({ byCommunity: { 1: 42 } }, 1), [42]);
  });

  it('normalises array bucket to numbers and drops NaN', () => {
    assert.deepEqual(
      readCachedPostIds(
        { byCommunity: { 1: ['7', 'x', 8, undefined, 'abc'] } },
        1
      ),
      [7, 8]
    );
  });
});

describe('buildUpdatedCache', () => {
  it('writes the post id list under byCommunity', () => {
    const next = buildUpdatedCache(null, 42, [1, 2]);
    assert.deepEqual(next, { byCommunity: { 42: [1, 2] } });
  });

  it('removes the entry when post id list is empty', () => {
    const next = buildUpdatedCache(
      { byCommunity: { 42: [1], 99: [9] } },
      42,
      []
    );
    assert.deepEqual(next, { byCommunity: { 99: [9] } });
  });

  it('coerces string ids to numbers and drops invalid', () => {
    const next = buildUpdatedCache(null, 7, ['1', 'x', 2]);
    assert.deepEqual(next, { byCommunity: { 7: [1, 2] } });
  });

  it('does not mutate the input cache', () => {
    const input = { byCommunity: { 42: [1] } };
    buildUpdatedCache(input, 42, [9]);
    assert.deepEqual(input, { byCommunity: { 42: [1] } });
  });
});

function makeVk({ wallGet, wallPost, wallDelete, usersGet, uploadPhoto } = {}) {
  return {
    api: {
      wall: {
        get: wallGet ?? (async () => ({ items: [] })),
        post: wallPost ?? (async () => ({ post_id: 1 })),
        delete: wallDelete ?? (async () => 1),
      },
      users: {
        get: usersGet ?? (async () => [{ photo_max_orig: null }]),
      },
    },
    upload: {
      wallPhoto: uploadPhoto ?? (async () => ({ ownerId: -42, id: 100 })),
    },
  };
}

describe('sendInvitationPosts: basic flow', () => {
  it('skips communities when no communities configured', async () => {
    const store = fakeStore();
    let getCalls = 0;
    const vk = makeVk({
      wallGet: async () => {
        getCalls += 1;
        return { items: [] };
      },
    });
    await sendInvitationPosts({
      vk,
      config: { invitationPost: { communities: [] } },
      store,
    });
    assert.equal(getCalls, 0);
  });

  it('skips a community whose cached post is still in the top 10', async () => {
    const store = fakeStore({ byCommunity: { 42: [555] } });
    let posted = false;
    const vk = makeVk({
      wallGet: async () => ({ items: [{ id: 555 }, { id: 999 }] }),
      wallPost: async () => {
        posted = true;
        return { post_id: 1 };
      },
    });
    await runWithFastSleep(() =>
      sendInvitationPosts({
        vk,
        config: { invitationPost: { communities: [42] } },
        store,
      })
    );
    assert.equal(posted, false);
    assert.deepEqual(store.value, { byCommunity: { 42: [555] } });
  });
});

describe('sendInvitationPosts: post rotation', () => {
  it('posts a new message and deletes the old recorded post', async () => {
    const store = fakeStore({ byCommunity: { 42: [555] } });
    const wallDeleteCalls = [];
    const wallPostCalls = [];
    const vk = makeVk({
      wallGet: async () => ({ items: [{ id: 100 }, { id: 200 }] }),
      wallPost: async (args) => {
        wallPostCalls.push(args);
        return { post_id: 777 };
      },
      wallDelete: async (args) => {
        wallDeleteCalls.push(args);
        return 1;
      },
    });
    await runWithFastSleep(() =>
      sendInvitationPosts({
        vk,
        config: {
          invitationPost: { communities: [42], messages: ['hello!'] },
        },
        store,
      })
    );
    assert.equal(wallPostCalls.length, 1);
    assert.equal(wallPostCalls[0].owner_id, '-42');
    assert.equal(wallPostCalls[0].message, 'hello!');
    assert.deepEqual(wallDeleteCalls, [{ owner_id: '-42', post_id: 555 }]);
    assert.deepEqual(store.value, { byCommunity: { 42: [777] } });
  });

  it('drops cached id from cache when wall.delete reports code 104 (already gone)', async () => {
    const store = fakeStore({ byCommunity: { 42: [555, 666] } });
    const vk = makeVk({
      wallGet: async () => ({ items: [{ id: 100 }] }),
      wallPost: async () => ({ post_id: 777 }),
      wallDelete: async ({ post_id: postId }) => {
        if (postId === 555) {
          throw Object.assign(new Error('Post not found'), { code: 104 });
        }
        return 1;
      },
    });
    await runWithFastSleep(() =>
      sendInvitationPosts({
        vk,
        config: { invitationPost: { communities: [42] } },
        store,
      })
    );
    assert.deepEqual(store.value, { byCommunity: { 42: [777] } });
  });

  it('keeps a cached id when delete throws an unknown error', async () => {
    const store = fakeStore({ byCommunity: { 42: [555] } });
    const vk = makeVk({
      wallGet: async () => ({ items: [{ id: 100 }] }),
      wallPost: async () => ({ post_id: 777 }),
      wallDelete: async () => {
        throw Object.assign(new Error('Some other error'), { code: 999 });
      },
    });
    await runWithFastSleep(() =>
      sendInvitationPosts({
        vk,
        config: { invitationPost: { communities: [42] } },
        store,
      })
    );
    assert.deepEqual(store.value, { byCommunity: { 42: [777, 555] } });
  });
});

describe('sendInvitationPosts: avatar attachment', () => {
  it('attaches the configured avatar image when present', async () => {
    const store = fakeStore();
    let uploadArgs = null;
    let postedAttachments = null;
    const { promises: fs } = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const avatarPath = path.join(os.tmpdir(), `test-avatar-${Date.now()}.jpg`);
    await fs.writeFile(avatarPath, Buffer.from([0xff, 0xd8, 0xff]));
    const vk = makeVk({
      wallGet: async () => ({ items: [{ id: 100 }] }),
      wallPost: async ({ attachments }) => {
        postedAttachments = attachments;
        return { post_id: 1 };
      },
      uploadPhoto: async (args) => {
        uploadArgs = args;
        return { ownerId: -42, id: 200 };
      },
    });
    try {
      await runWithFastSleep(() =>
        sendInvitationPosts({
          vk,
          config: {
            invitationPost: { communities: [42], avatarPath },
          },
          store,
        })
      );
      assert.ok(uploadArgs, 'wallPhoto should be called');
      assert.equal(uploadArgs.group_id, 42);
      assert.equal(postedAttachments, 'photo-42_200');
    } finally {
      await fs.unlink(avatarPath).catch(() => undefined);
    }
  });

  it('posts without attachment when no avatar is available', async () => {
    const store = fakeStore();
    let postedAttachments = null;
    let uploadCalled = false;
    const vk = makeVk({
      wallGet: async () => ({ items: [{ id: 100 }] }),
      wallPost: async ({ attachments }) => {
        postedAttachments = attachments;
        return { post_id: 1 };
      },
      usersGet: async () => [{ photo_max_orig: null }],
      uploadPhoto: async () => {
        uploadCalled = true;
        return { ownerId: -42, id: 200 };
      },
    });
    await runWithFastSleep(() =>
      sendInvitationPosts({
        vk,
        config: { invitationPost: { communities: [42] } },
        store,
      })
    );
    assert.equal(uploadCalled, false);
    assert.equal(postedAttachments, '');
  });
});

describe('sendInvitationPosts: error handling', () => {
  it('does not crash on captcha (code 14); continues to next community', async () => {
    const store = fakeStore();
    const posted = [];
    const vk = makeVk({
      wallGet: async () => ({ items: [] }),
      wallPost: async ({ owner_id: ownerId }) => {
        if (ownerId === '-1') {
          throw Object.assign(new Error('Captcha'), { code: 14 });
        }
        posted.push(ownerId);
        return { post_id: 1 };
      },
    });
    await runWithFastSleep(() =>
      sendInvitationPosts({
        vk,
        config: { invitationPost: { communities: [1, 2] } },
        store,
      })
    );
    assert.deepEqual(posted, ['-2']);
  });
});
