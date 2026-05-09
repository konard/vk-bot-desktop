/**
 * Headless runner for the bot loop. The Electron main process forks this
 * file when the user clicks "Start" in local mode, and the same file is
 * run inside the Docker / screen session that server-mode installs.
 */

import logger from './logger.js';
import { mergeWithDefaults } from './config.js';
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
    try {
      await action();
    } catch (error) {
      logger.error('Trigger threw', { name, error });
    }
    if (stopped) {
      return;
    }
    timeoutHandle = setTimeout(run, ms);
    if (typeof timeoutHandle.unref === 'function') {
      timeoutHandle.unref();
    }
  };
  // Fire on the next tick so the caller gets a stop handle synchronously.
  timeoutHandle = setTimeout(run, 0);
  if (typeof timeoutHandle.unref === 'function') {
    timeoutHandle.unref();
  }
  return () => {
    stopped = true;
    clearTimeout(timeoutHandle);
  };
}

export async function startBot({ config: rawConfig, createVk }) {
  const config = mergeWithDefaults(rawConfig);
  if (!config.vk?.token) {
    throw new Error('VK access token is missing in configuration');
  }
  const factory =
    createVk ||
    (async () => {
      const { VK } = await import('vk-io');
      return new VK({ token: config.vk.token });
    });
  const vk = await factory({ token: config.vk.token });
  const stops = [];
  if (config.features?.onlineStatus) {
    stops.push(
      scheduleEvery(
        (config.intervals?.onlineStatusMinutes ?? 14) * MINUTE_MS,
        () => setOnlineStatus({ vk }),
        'set-online-status'
      )
    );
  }
  if (config.features?.acceptFriendRequests) {
    stops.push(
      scheduleEvery(
        (config.intervals?.acceptFriendRequestsMinutes ?? 20) * MINUTE_MS,
        () => acceptFriendRequests({ vk, config }),
        'accept-friend-requests'
      )
    );
  }
  if (config.features?.deleteDeactivatedFriends) {
    stops.push(
      scheduleEvery(
        (config.intervals?.deleteDeactivatedFriendsMinutes ?? 30) * MINUTE_MS,
        () => deleteDeactivatedFriends({ vk, config }),
        'delete-deactivated-friends'
      )
    );
  }
  if (config.features?.deleteOutgoingFriendRequests) {
    stops.push(
      scheduleEvery(
        (config.intervals?.deleteOutgoingFriendRequestsMinutes ?? 8) *
          MINUTE_MS,
        () => deleteOutgoingFriendRequests({ vk, config }),
        'delete-outgoing-friend-requests'
      )
    );
  }
  if (config.features?.sendInvitationPosts) {
    stops.push(
      scheduleEvery(
        (config.intervals?.sendInvitationPostsMinutes ?? 9) * MINUTE_MS,
        () => sendInvitationPosts({ vk, config }),
        'send-invitation-posts'
      )
    );
  }
  if (config.features?.sendBirthdayCongratulations) {
    stops.push(
      scheduleEvery(
        (config.intervals?.sendBirthdayCongratulationsHours ?? 23) * HOUR_MS,
        () => sendBirthdayCongratulations({ vk, config }),
        'send-birthday-congratulations'
      )
    );
  }
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
    try {
      const { LinoStore } = await import('../lino-store.js');
      const store = new LinoStore();
      const config = await store.loadLayered();
      const handle = await startBot({ config });
      const shutdown = () => {
        logger.info('Stopping bot');
        handle.stop();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      logger.info('Bot started');
    } catch (error) {
      logger.error('Bot failed to start', { error });
      process.exit(1);
    }
  })();
}
