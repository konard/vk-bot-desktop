import logger from '../logger.js';
import { asList } from '../list-values.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide which outgoing friend requests should be cancelled.
 *
 * Cancellation is capacity-driven: we only cancel as many requests as needed
 * to make room for the planned incoming acceptance count. Requests on the
 * priority list are never cancelled, so the user does not lose explicit
 * connections.
 */
export function pickOutgoingToCancel({
  outgoing = [],
  priorityFriendIds = [],
  capacityNeeded = 0,
  hardCap = Infinity,
} = {}) {
  if (capacityNeeded <= 0) {
    return [];
  }
  const protectedSet = new Set(asList(priorityFriendIds));
  const cancellable = asList(outgoing).filter((id) => !protectedSet.has(id));
  return cancellable.slice(0, Math.min(capacityNeeded, hardCap));
}

export async function deleteOutgoingFriendRequests({ vk, config, context }) {
  const max = config.limits?.maxOutgoingDeletionsPerRun ?? 20;
  if (max <= 0) {
    return;
  }
  try {
    const requests = await vk.api.friends.getRequests({
      count: 1000,
      out: 1,
      need_viewed: 1,
    });
    const items = requests.items || [];
    if (items.length === 0) {
      logger.info('No outgoing friend requests to be deleted');
      return;
    }
    const capacityNeeded = context?.capacityNeeded ?? 0;
    const toCancel = pickOutgoingToCancel({
      outgoing: items,
      priorityFriendIds: config.priorityFriendIds || [],
      capacityNeeded,
      hardCap: max,
    });
    if (toCancel.length === 0) {
      logger.info(
        'Outgoing requests preserved (no incoming capacity needed or all priority)'
      );
      return;
    }
    for (const userId of toCancel) {
      try {
        await vk.api.friends.delete({ user_id: userId });
        logger.info('Deleted outgoing friend request', { userId });
      } catch (error) {
        logger.warn('Failed to delete outgoing friend request', {
          userId,
          error,
        });
      }
      await sleep(3000);
    }
  } catch (error) {
    logger.error('Could not delete outgoing friend requests', { error });
  }
}
