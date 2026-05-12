/**
 * Headless runner for the bot loop. The Electron main process forks this
 * file when the user clicks "Start" in local mode, and the same file is
 * run inside the Docker / screen session that server-mode installs.
 */

import logger from './logger.js';
import { mergeWithDefaults } from './config.js';
import { createVkClient } from './vk-client.js';
import { setOnlineStatus } from './triggers/set-online-status.js';
import { acceptFriendRequests } from './triggers/accept-friend-requests.js';
import { deleteDeactivatedFriends } from './triggers/delete-deactivated-friends.js';
import { deleteOutgoingFriendRequests } from './triggers/delete-outgoing-friend-requests.js';
import { sendInvitationPosts } from './triggers/send-invitation-posts.js';
import { sendBirthdayCongratulations } from './triggers/send-birthday-congratulations.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

function scheduleEvery(ms, action, name) {
  let stopped = false;
  let timeoutHandle;
  const run = async () => {
    if (stopped) {
      return;
    }
    const start = Date.now();
    logger.debug(`Checking for '${name}' trigger...`);
    try {
      await action();
      logger.debug(`'${name}' trigger executed in ${Date.now() - start} ms`);
    } catch (error) {
      logger.error('Trigger threw', { name, error });
    }
    if (stopped) {
      return;
    }
    timeoutHandle = setTimeout(run, ms);
  };
  // Fire on the next tick so the caller gets a stop handle synchronously.
  // Note: we intentionally do NOT call .unref() here. Doing so allowed the
  // bot process to exit before any trigger ran (see docs/case-studies/issue-32).
  timeoutHandle = setTimeout(run, 0);
  return () => {
    stopped = true;
    clearTimeout(timeoutHandle);
  };
}

const TRIGGER_SPECS = [
  {
    flag: 'onlineStatus',
    intervalKey: 'onlineStatusMinutes',
    intervalUnit: MINUTE_MS,
    intervalDefault: 14,
    name: 'set-online-status',
    fn: ({ vk }) => setOnlineStatus({ vk }),
  },
  {
    flag: 'acceptFriendRequests',
    intervalKey: 'acceptFriendRequestsMinutes',
    intervalUnit: MINUTE_MS,
    intervalDefault: 20,
    name: 'accept-friend-requests',
    fn: ({ vk, config }) => acceptFriendRequests({ vk, config }),
  },
  {
    flag: 'deleteDeactivatedFriends',
    intervalKey: 'deleteDeactivatedFriendsMinutes',
    intervalUnit: MINUTE_MS,
    intervalDefault: 30,
    name: 'delete-deactivated-friends',
    fn: ({ vk, config }) => deleteDeactivatedFriends({ vk, config }),
  },
  {
    flag: 'deleteOutgoingFriendRequests',
    intervalKey: 'deleteOutgoingFriendRequestsMinutes',
    intervalUnit: MINUTE_MS,
    intervalDefault: 8,
    name: 'delete-outgoing-friend-requests',
    fn: ({ vk, config }) => deleteOutgoingFriendRequests({ vk, config }),
  },
  {
    flag: 'sendInvitationPosts',
    intervalKey: 'sendInvitationPostsMinutes',
    intervalUnit: MINUTE_MS,
    intervalDefault: 9,
    name: 'send-invitation-posts',
    fn: ({ vk, config }) => sendInvitationPosts({ vk, config }),
  },
  {
    flag: 'sendBirthdayCongratulations',
    intervalKey: 'sendBirthdayCongratulationsHours',
    intervalUnit: HOUR_MS,
    intervalDefault: 23,
    name: 'send-birthday-congratulations',
    fn: ({ vk, config }) => sendBirthdayCongratulations({ vk, config }),
  },
];

function scheduleEnabledTriggers({ vk, config }) {
  const stops = [];
  for (const spec of TRIGGER_SPECS) {
    if (!config.features?.[spec.flag]) {
      continue;
    }
    const ms =
      (config.intervals?.[spec.intervalKey] ?? spec.intervalDefault) *
      spec.intervalUnit;
    stops.push(scheduleEvery(ms, () => spec.fn({ vk, config }), spec.name));
  }
  return stops;
}

export async function startBot({ config: rawConfig, createVk }) {
  const config = mergeWithDefaults(rawConfig);
  if (!config.vk?.token) {
    throw new Error('VK access token is missing in configuration');
  }
  const factory = createVk || (({ token }) => createVkClient({ token }));
  const vk = await factory({ token: config.vk.token });
  const stops = scheduleEnabledTriggers({ vk, config });
  return {
    stop() {
      for (const cancel of stops) {
        cancel();
      }
    },
  };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('runner.js');

if (isDirectRun) {
  (async () => {
    const { openSessionLog } = await import('./session-log.js');
    let session;
    try {
      session = await openSessionLog();
      logger.info('Session log opened', { file: session.filePath });
    } catch (error) {
      logger.warn('Could not open session log', { error });
    }
    try {
      const { LinoStore } = await import('../lino-store.js');
      const store = new LinoStore();
      const config = await store.loadLayered();
      const handle = await startBot({ config });
      const shutdown = async () => {
        logger.info('Stopping bot');
        handle.stop();
        if (session) {
          await session.close();
        }
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      logger.info('Bot started');
    } catch (error) {
      logger.error('Bot failed to start', { error });
      if (session) {
        await session.close();
      }
      process.exit(1);
    }
  })();
}
