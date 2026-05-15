import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyMethod,
  pickDelay,
  createThrottle,
  READ_DELAY_RANGE_MS,
  WRITE_DELAY_RANGE_MS,
} from '../src/bot/vk-rate-limit.js';

describe('classifyMethod', () => {
  it('classifies VK read methods (get/search/is/are/look prefixes)', () => {
    assert.equal(classifyMethod('users.get'), 'read');
    assert.equal(classifyMethod('friends.getRequests'), 'read');
    assert.equal(classifyMethod('photos.getById'), 'read');
    assert.equal(classifyMethod('wall.search'), 'read');
    assert.equal(classifyMethod('friends.areFriends'), 'read');
    assert.equal(classifyMethod('account.isAppUser'), 'read');
    assert.equal(classifyMethod('account.lookupContacts'), 'read');
  });

  it('classifies VK write methods (anything not matching read prefixes)', () => {
    assert.equal(classifyMethod('friends.add'), 'write');
    assert.equal(classifyMethod('friends.delete'), 'write');
    assert.equal(classifyMethod('wall.post'), 'write');
    assert.equal(classifyMethod('wall.delete'), 'write');
    assert.equal(classifyMethod('messages.send'), 'write');
    assert.equal(classifyMethod('account.setOnline'), 'write');
  });

  it('treats invalid or empty inputs as write to use the safer (longer) delay', () => {
    assert.equal(classifyMethod(''), 'write');
    assert.equal(classifyMethod(undefined), 'write');
    assert.equal(classifyMethod(null), 'write');
    assert.equal(classifyMethod(42), 'write');
  });

  it('uses the last segment after the dot when present', () => {
    assert.equal(classifyMethod('namespace.getThing'), 'read');
    assert.equal(classifyMethod('namespace.doThing'), 'write');
  });

  it('classifies bare methods without a dot too', () => {
    assert.equal(classifyMethod('getSomething'), 'read');
    assert.equal(classifyMethod('doSomething'), 'write');
  });
});

describe('pickDelay', () => {
  it('returns the min when random() returns 0', () => {
    assert.equal(
      pickDelay({ min: 100, max: 500 }, () => 0),
      100
    );
  });

  it('returns near the max when random() returns ~1', () => {
    // floor(min + 0.999 * span) < max, but always >= min.
    const value = pickDelay({ min: 100, max: 500 }, () => 0.999);
    assert.ok(value >= 100 && value < 500, `value=${value}`);
  });

  it('respects the configured read range (3000–7000 ms)', () => {
    const min = pickDelay(READ_DELAY_RANGE_MS, () => 0);
    const max = pickDelay(READ_DELAY_RANGE_MS, () => 0.9999);
    assert.equal(min, 3000);
    assert.ok(max < 7000);
    assert.ok(max >= 3000);
  });

  it('respects the configured write range (6000–13000 ms)', () => {
    const min = pickDelay(WRITE_DELAY_RANGE_MS, () => 0);
    const max = pickDelay(WRITE_DELAY_RANGE_MS, () => 0.9999);
    assert.equal(min, 6000);
    assert.ok(max < 13000);
    assert.ok(max >= 6000);
  });
});

describe('createThrottle', () => {
  function makeFakeClock(startMs = 0) {
    let nowMs = startMs;
    const sleeps = [];
    return {
      sleeps,
      now: () => nowMs,
      sleep: async (ms) => {
        sleeps.push(ms);
        nowMs += ms;
      },
      tick: (ms) => {
        nowMs += ms;
      },
    };
  }

  it('fires the first call without any delay', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    let calls = 0;
    const result = await throttle.throttle('users.get', async () => {
      calls += 1;
      return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
    assert.equal(clock.sleeps.length, 0);
  });

  it('waits at least the picked read delay between two read calls', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0, // always pick the min
      sleep: clock.sleep,
      now: clock.now,
    });
    await throttle.throttle('users.get', async () => {});
    await throttle.throttle('photos.getById', async () => {});
    assert.equal(clock.sleeps.length, 1);
    assert.equal(clock.sleeps[0], READ_DELAY_RANGE_MS.min);
  });

  it('waits at least the picked write delay between two write calls', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    await throttle.throttle('friends.add', async () => {});
    await throttle.throttle('wall.post', async () => {});
    assert.equal(clock.sleeps.length, 1);
    assert.equal(clock.sleeps[0], WRITE_DELAY_RANGE_MS.min);
  });

  it('uses the NEXT method to pick the delay (read after write waits 3–7s)', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    await throttle.throttle('wall.post', async () => {});
    await throttle.throttle('users.get', async () => {});
    assert.equal(clock.sleeps[0], READ_DELAY_RANGE_MS.min);
  });

  it('does not sleep when enough wall-clock time has already elapsed', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    await throttle.throttle('users.get', async () => {});
    clock.tick(10_000); // simulate a long external pause
    await throttle.throttle('users.get', async () => {});
    assert.equal(clock.sleeps.length, 0);
  });

  it('serialises concurrent calls through a single chain', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    const order = [];
    const a = throttle.throttle('users.get', async () => {
      order.push('a');
    });
    const b = throttle.throttle('users.get', async () => {
      order.push('b');
    });
    const c = throttle.throttle('users.get', async () => {
      order.push('c');
    });
    await Promise.all([a, b, c]);
    assert.deepEqual(order, ['a', 'b', 'c']);
    // 2 inter-call sleeps for 3 serialised calls.
    assert.equal(clock.sleeps.length, 2);
  });

  it('records the end timestamp even when the inner function throws', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    await assert.rejects(() =>
      throttle.throttle('wall.post', async () => {
        throw new Error('boom');
      })
    );
    // Next call still needs to wait the write delay (lastEndedAt was set).
    await throttle.throttle('wall.post', async () => {});
    assert.equal(clock.sleeps.length, 1);
    assert.equal(clock.sleeps[0], WRITE_DELAY_RANGE_MS.min);
  });

  it('reset() clears the pacing state so the next call fires immediately', async () => {
    const clock = makeFakeClock();
    const throttle = createThrottle({
      random: () => 0,
      sleep: clock.sleep,
      now: clock.now,
    });
    await throttle.throttle('users.get', async () => {});
    throttle.reset();
    await throttle.throttle('users.get', async () => {});
    assert.equal(clock.sleeps.length, 0);
  });

  it('picks delays inside the documented range (3000–7000 for read, 6000–13000 for write)', () => {
    const samples = 200;
    const reads = [];
    const writes = [];
    for (let i = 0; i < samples; i += 1) {
      reads.push(pickDelay(READ_DELAY_RANGE_MS, Math.random));
      writes.push(pickDelay(WRITE_DELAY_RANGE_MS, Math.random));
    }
    for (const value of reads) {
      assert.ok(
        value >= 3000 && value < 7000,
        `read delay out of range: ${value}`
      );
    }
    for (const value of writes) {
      assert.ok(
        value >= 6000 && value < 13000,
        `write delay out of range: ${value}`
      );
    }
  });
});
