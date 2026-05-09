import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { StatsStore, isoWeek, pathsForDate } from '../src/bot/stats.js';

const isDenoRuntime = typeof Deno !== 'undefined';

async function makeStore(now) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vk-stats-'));
  return {
    store: new StatsStore({ rootDir: root, now }),
    cleanup: () => rm(root, { recursive: true, force: true }),
    root,
  };
}

describe('isoWeek', () => {
  it('returns the ISO week number for known dates', () => {
    // 2026-01-01 is a Thursday — ISO week 1 of 2026.
    assert.equal(isoWeek(new Date(Date.UTC(2026, 0, 1))), 1);
    // 2025-12-29 is a Monday in ISO week 1 of 2026.
    assert.equal(isoWeek(new Date(Date.UTC(2025, 11, 29))), 1);
    // 2026-05-09 is a Saturday — ISO week 19.
    assert.equal(isoWeek(new Date(Date.UTC(2026, 4, 9))), 19);
  });
});

describe('pathsForDate', () => {
  it('produces total + month + week paths', () => {
    const paths = pathsForDate('/tmp/x', new Date(Date.UTC(2026, 4, 9)));
    assert.equal(paths.total, path.join('/tmp/x', 'total.lino'));
    assert.equal(paths.monthDir, path.join('/tmp/x', '2026-05'));
    assert.equal(paths.month, path.join('/tmp/x', '2026-05', 'month.lino'));
    assert.equal(paths.week, path.join('/tmp/x', '2026-05', 'week-19.lino'));
  });
});

describe('StatsStore', { skip: isDenoRuntime }, () => {
  it('throws when rootDir missing', () => {
    assert.throws(() => new StatsStore({}));
  });

  it('records accepted friends in three files', async () => {
    const now = () => new Date(Date.UTC(2026, 4, 9));
    const { store, cleanup } = await makeStore(now);
    try {
      await store.recordAccepted({ count: 2, incomingRequestsSeen: 5 });
      const snap = await store.snapshot();
      assert.equal(snap.total.acceptedFriends, 2);
      assert.equal(snap.month.acceptedFriends, 2);
      assert.equal(snap.week.acceptedFriends, 2);
      assert.equal(snap.total.incomingRequestsSeen, 5);
    } finally {
      await cleanup();
    }
  });

  it('accumulates across multiple calls in the same week', async () => {
    const now = () => new Date(Date.UTC(2026, 4, 9));
    const { store, cleanup } = await makeStore(now);
    try {
      await store.recordAccepted({ count: 1, incomingRequestsSeen: 1 });
      await store.recordAccepted({ count: 3, incomingRequestsSeen: 2 });
      const snap = await store.snapshot();
      assert.equal(snap.total.acceptedFriends, 4);
      assert.equal(snap.week.acceptedFriends, 4);
      assert.equal(snap.total.incomingRequestsSeen, 3);
    } finally {
      await cleanup();
    }
  });

  it('isolates weeks: new week file when the date changes', async () => {
    let current = new Date(Date.UTC(2026, 4, 9)); // week 19
    const { store, cleanup } = await makeStore(() => current);
    try {
      await store.recordAccepted({ count: 5 });
      current = new Date(Date.UTC(2026, 4, 16)); // week 20
      await store.recordAccepted({ count: 2 });
      const snap = await store.snapshot();
      assert.equal(snap.total.acceptedFriends, 7);
      assert.equal(snap.month.acceptedFriends, 7);
      assert.equal(snap.week.acceptedFriends, 2);
    } finally {
      await cleanup();
    }
  });

  it('records initial friends count once and never overwrites', async () => {
    const now = () => new Date(Date.UTC(2026, 4, 9));
    const { store, cleanup } = await makeStore(now);
    try {
      await store.setInitialFriendsCount(123);
      await store.setInitialFriendsCount(456);
      const total = await store.readTotal();
      assert.equal(total.initialFriendsCount, 123);
    } finally {
      await cleanup();
    }
  });

  it('snapshot returns empty objects when no data exists', async () => {
    const now = () => new Date(Date.UTC(2026, 4, 9));
    const { store, cleanup } = await makeStore(now);
    try {
      const snap = await store.snapshot();
      assert.deepEqual(snap.total, {});
      assert.deepEqual(snap.month, {});
      assert.deepEqual(snap.week, {});
    } finally {
      await cleanup();
    }
  });
});
