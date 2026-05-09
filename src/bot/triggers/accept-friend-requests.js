import logger from '../logger.js';
import {
  selectIncomingRequests,
  pickPrioritySendList,
} from '../friend-prioritization.js';

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadFriends({ vk }) {
  // VK's friends.get returns up to 5000 ids per page. For the desktop
  // application we keep the worst case to two pages (the same as vk-bot's
  // upper bound) — beyond 10000 friends VK refuses to add more anyway.
  const items = [];
  for (let offset = 0; offset < 10000; offset += 5000) {
    const response = await vk.api.friends.get({
      count: 5000,
      offset,
      fields: 'deactivated',
    });
    if (!response.items || response.items.length === 0) {
      break;
    }
    for (const item of response.items) {
      items.push(typeof item === 'object' ? item : { id: item });
    }
    if (response.items.length < 5000) {
      break;
    }
  }
  return items;
}

async function fetchIncomingRequestsWithMutuals({ vk, count }) {
  const response = await vk.api.friends.getRequests({ count, sort: 1 });
  const userIds = response.items || [];
  if (userIds.length === 0) {
    return [];
  }
  let mutualByUser = new Map();
  try {
    const mutuals = await vk.api.friends.getMutual({
      target_uids: userIds,
      source_uid: undefined,
    });
    if (Array.isArray(mutuals)) {
      for (const entry of mutuals) {
        mutualByUser.set(entry.id, entry.common_count ?? 0);
      }
    }
  } catch (error) {
    logger.warn(
      'Could not fetch mutual friends; falling back to default ordering',
      { error }
    );
  }
  return userIds.map((userId) => ({
    userId,
    mutualCount: mutualByUser.get(userId) ?? 0,
  }));
}

export async function acceptFriendRequests({ vk, config }) {
  try {
    const friends = await loadFriends({ vk });
    const friendIds = friends.map((f) => f.id);
    const remainingCapacity = Math.max(
      0,
      (config.limits?.maxFriends ?? 10000) - friendIds.length
    );

    const priorityToSend = pickPrioritySendList({
      priorityFriendIds: config.priorityFriendIds || [],
      currentFriendIds: friendIds,
      remainingCapacity,
    });
    for (const userId of priorityToSend) {
      try {
        await vk.api.friends.add({ user_id: userId, text: '' });
        logger.info('Friend request sent to priority friend', { userId });
        await sleep(10 * ONE_SECOND_MS);
      } catch (error) {
        if (error.code === 29) {
          logger.warn('Rate limit while adding priority friend; backing off', {
            userId,
          });
          await sleep(ONE_MINUTE_MS);
          break;
        }
        if (error.code === 242) {
          logger.warn('Friend limit exceeded; stopping priority send', {
            userId,
          });
          break;
        }
        logger.error('Could not send priority friend request', {
          userId,
          error,
        });
      }
    }

    const requests = await fetchIncomingRequestsWithMutuals({
      vk,
      count: config.limits?.maxFriendRequestsPerRun ?? 23,
    });
    if (requests.length === 0) {
      logger.info('No incoming friend requests to be accepted');
      return;
    }

    const selected = selectIncomingRequests({
      requests,
      currentFriendCount: friendIds.length,
      limits: {
        maxFriends: config.limits?.maxFriends ?? 10000,
        topPercentMutuals: config.limits?.topPercentMutuals ?? 10,
        maxRequestsPerRun:
          config.limits?.maxFriendRequestsPerRun ?? requests.length,
      },
    });

    logger.info('Selected incoming friend requests', {
      total: requests.length,
      selected: selected.length,
    });

    for (const request of selected) {
      try {
        await vk.api.friends.add({ user_id: request.userId, text: '' });
        logger.info('Incoming friend request accepted', {
          userId: request.userId,
          mutualCount: request.mutualCount,
        });
        await sleep(10 * ONE_SECOND_MS);
      } catch (error) {
        if (error.code === 242) {
          logger.warn('Friend limit exceeded; stopping run', {
            userId: request.userId,
          });
          break;
        }
        logger.error('Could not accept friend request', {
          userId: request.userId,
          error,
        });
      }
    }
  } catch (error) {
    logger.error('Could not accept friend requests', { error });
  }
}
