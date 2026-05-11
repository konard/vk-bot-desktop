// Regression fixture for issue #32. Boots the real bot loop with a stub vk-io
// client and prints "trigger fired" whenever the scheduled trigger runs.
// The parent test asserts the process stays alive long enough for at least one
// firing — confirming that setTimeout handles in scheduleEvery() do not have
// their .unref() called.
import { startBot } from '../../src/bot/runner.js';

const fakeVk = {
  api: {
    account: {
      setOnline: () => {
        process.stdout.write('trigger fired\n');
        return Promise.resolve(true);
      },
    },
  },
};

await startBot({
  config: {
    vk: { token: 'vk1.a.testtoken_ok' },
    features: { onlineStatus: true },
    intervals: { onlineStatusMinutes: 60 },
  },
  createVk: () => Promise.resolve(fakeVk),
});
