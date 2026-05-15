import logger from '../logger.js';
import { pickDeactivatedToDelete } from '../friend-prioritization.js';
import { isUnknownMethodError, reportUnknownMethod } from '../api-errors.js';

let unsupportedForProcess = false;

export function resetDeleteDeactivatedSupport() {
  unsupportedForProcess = false;
}

async function loadFriendsWithStatus({ vk }) {
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
    items.push(...response.items);
    if (response.items.length < 5000) {
      break;
    }
  }
  return items;
}

export async function deleteDeactivatedFriends({ vk, config }) {
  if (unsupportedForProcess) {
    return;
  }
  try {
    const friends = await loadFriendsWithStatus({ vk });
    const toDelete = pickDeactivatedToDelete({
      friends,
      priorityFriendIds: config.priorityFriendIds || [],
    });
    logger.info('Deactivated friends to delete', { count: toDelete.length });
    for (const friend of toDelete) {
      try {
        await vk.api.friends.delete({ user_id: friend.id });
        logger.info('Deactivated friend deleted', { userId: friend.id });
      } catch (error) {
        if (isUnknownMethodError(error)) {
          unsupportedForProcess = true;
          await reportUnknownMethod({
            vk,
            method: 'friends.delete',
            error,
            trigger: 'delete-deactivated-friends',
          });
          return;
        }
        logger.warn('Failed to delete deactivated friend', {
          userId: friend.id,
          error,
        });
      }
    }
  } catch (error) {
    logger.error('Could not delete deactivated friends', { error });
  }
}
