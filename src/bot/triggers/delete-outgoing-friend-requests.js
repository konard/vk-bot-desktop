import logger from '../logger.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function deleteOutgoingFriendRequests({ vk, config }) {
  const max = config.limits?.maxOutgoingDeletionsPerRun ?? 20;
  if (max <= 0) {
    return;
  }
  try {
    const requests = await vk.api.friends.getRequests({
      count: max,
      out: 1,
      need_viewed: 1,
    });
    const items = requests.items || [];
    if (items.length === 0) {
      logger.info('No outgoing friend requests to be deleted');
      return;
    }
    const protectedSet = new Set(config.priorityFriendIds || []);
    for (const userId of items) {
      if (protectedSet.has(userId)) {
        continue;
      }
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
