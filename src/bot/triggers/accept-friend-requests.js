import logger from '../logger.js';
import {
  selectIncomingRequests,
  pickPrioritySendList,
} from '../friend-prioritization.js';
import { StatsStore, statsRootFor } from '../stats.js';
import { LinoStore } from '../../lino-store.js';
import { isUnknownMethodError, reportUnknownMethod } from '../api-errors.js';

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let unsupportedForProcess = false;

export function resetAcceptFriendRequestsSupport() {
  unsupportedForProcess = false;
}

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

async function loadOutgoingRequestIds({ vk }) {
  try {
    const response = await vk.api.friends.getRequests({
      count: 1000,
      out: 1,
      need_viewed: 1,
    });
    return new Set(response.items || []);
  } catch (error) {
    logger.warn(
      'Could not list outgoing friend requests; assuming none and continuing',
      { error }
    );
    return new Set();
  }
}

async function fetchIncomingRequestsWithMutuals({ vk, count }) {
  const response = await vk.api.friends.getRequests({ count, sort: 1 });
  const userIds = response.items || [];
  if (userIds.length === 0) {
    return [];
  }
  const mutualByUser = new Map();
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

async function sendPriorityRequests({ vk, priorityToSend, alreadyOutgoing }) {
  for (const userId of priorityToSend) {
    if (alreadyOutgoing.has(userId)) {
      logger.debug('Skipping priority friend with existing outgoing request', {
        userId,
      });
      continue;
    }
    try {
      await vk.api.friends.add({ user_id: userId, text: '' });
      alreadyOutgoing.add(userId);
      logger.info('Friend request sent to priority friend', { userId });
      await sleep(10 * ONE_SECOND_MS);
    } catch (error) {
      if (isUnknownMethodError(error)) {
        unsupportedForProcess = true;
        await reportUnknownMethod({
          vk,
          method: 'friends.add',
          error,
          trigger: 'accept-friend-requests',
        });
        return { stop: true };
      }
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
        return { stop: true };
      }
      if (error.code === 177) {
        logger.warn('Priority user not found; continuing', { userId });
        continue;
      }
      logger.error('Could not send priority friend request', {
        userId,
        error,
      });
    }
  }
  return { stop: false };
}

async function acceptIncomingRequests({
  vk,
  selected,
  stats,
  incomingRequestsSeen = 0,
}) {
  let accepted = 0;
  for (const request of selected) {
    try {
      await vk.api.friends.add({ user_id: request.userId, text: '' });
      accepted += 1;
      logger.info('Incoming friend request accepted', {
        userId: request.userId,
        mutualCount: request.mutualCount,
      });
      await sleep(10 * ONE_SECOND_MS);
    } catch (error) {
      if (isUnknownMethodError(error)) {
        unsupportedForProcess = true;
        await reportUnknownMethod({
          vk,
          method: 'friends.add',
          error,
          trigger: 'accept-friend-requests',
        });
        break;
      }
      if (error.code === 29) {
        logger.warn('Rate limit hit; backing off and stopping run', {
          userId: request.userId,
        });
        await sleep(ONE_MINUTE_MS);
        break;
      }
      if (error.code === 242) {
        logger.warn('Friend limit exceeded; stopping run', {
          userId: request.userId,
        });
        break;
      }
      if (error.code === 177) {
        logger.warn('Incoming requester not found; continuing', {
          userId: request.userId,
        });
        continue;
      }
      logger.error('Could not accept friend request', {
        userId: request.userId,
        error,
      });
    }
  }
  if (stats && (accepted > 0 || incomingRequestsSeen > 0)) {
    try {
      await stats.recordAccepted({ count: accepted, incomingRequestsSeen });
    } catch (error) {
      logger.warn('Could not record stats for accepted friends', { error });
    }
  }
  return accepted;
}

function resolveStats(providedStats) {
  if (providedStats) {
    return providedStats;
  }
  try {
    const store = new LinoStore();
    return new StatsStore({ rootDir: statsRootFor(store) });
  } catch (error) {
    logger.warn('Stats store unavailable; running without persistence', {
      error,
    });
    return null;
  }
}

async function recordInitialFriendsCount(stats, count) {
  if (!stats) {
    return;
  }
  try {
    await stats.setInitialFriendsCount(count);
  } catch (error) {
    logger.warn('Could not record initial friends count', { error });
  }
}

async function readTotals(stats, currentBatch) {
  if (!stats) {
    return { totalIncomingSeen: currentBatch, totalAcceptedEver: 0 };
  }
  try {
    const total = await stats.readTotal();
    return {
      totalIncomingSeen:
        (Number(total.incomingRequestsSeen) || 0) + currentBatch,
      totalAcceptedEver: Number(total.acceptedFriends) || 0,
    };
  } catch (error) {
    logger.warn('Could not read stats; falling back to batch size', { error });
    return { totalIncomingSeen: currentBatch, totalAcceptedEver: 0 };
  }
}

export async function acceptFriendRequests({
  vk,
  config,
  stats: providedStats,
}) {
  if (unsupportedForProcess) {
    return 0;
  }
  try {
    const stats = resolveStats(providedStats);
    const friends = await loadFriends({ vk });
    const friendIds = friends.map((f) => f.id);
    await recordInitialFriendsCount(stats, friendIds.length);

    const maxFriends = config.limits?.maxFriends ?? 10000;
    const remainingCapacity = Math.max(0, maxFriends - friendIds.length);

    const alreadyOutgoing = await loadOutgoingRequestIds({ vk });

    const priorityToSend = pickPrioritySendList({
      priorityFriendIds: config.priorityFriendIds || [],
      currentFriendIds: friendIds,
      remainingCapacity,
    });
    const { stop } = await sendPriorityRequests({
      vk,
      priorityToSend,
      alreadyOutgoing,
    });
    if (stop) {
      return 0;
    }

    const requests = await fetchIncomingRequestsWithMutuals({
      vk,
      count: config.limits?.maxFriendRequestsPerRun ?? 23,
    });
    if (requests.length === 0) {
      logger.info('No incoming friend requests to be accepted');
      return 0;
    }

    const { totalIncomingSeen, totalAcceptedEver } = await readTotals(
      stats,
      requests.length
    );

    const selected = selectIncomingRequests({
      requests,
      currentFriendCount: friendIds.length,
      limits: {
        maxFriends,
        topPercentMutuals: config.limits?.topPercentMutuals ?? 10,
        maxRequestsPerRun:
          config.limits?.maxFriendRequestsPerRun ?? requests.length,
      },
      totalIncomingSeen,
      totalAcceptedEver,
    });

    logger.info('Selected incoming friend requests', {
      total: requests.length,
      selected: selected.length,
      totalIncomingSeen,
      totalAcceptedEver,
    });

    return await acceptIncomingRequests({
      vk,
      selected,
      stats,
      incomingRequestsSeen: requests.length,
    });
  } catch (error) {
    logger.error('Could not accept friend requests', { error });
    return 0;
  }
}
