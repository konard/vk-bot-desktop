import logger from '../logger.js';
import { isUnknownMethodError, reportUnknownMethod } from '../api-errors.js';

let unsupportedForProcess = false;

export function resetSetOnlineStatusSupport() {
  unsupportedForProcess = false;
}

export async function setOnlineStatus({ vk }) {
  if (unsupportedForProcess) {
    return;
  }
  try {
    await vk.api.account.setOnline();
    logger.info('Online status is set');
  } catch (error) {
    if (isUnknownMethodError(error)) {
      unsupportedForProcess = true;
      await reportUnknownMethod({
        vk,
        method: 'account.setOnline',
        error,
        trigger: 'set-online-status',
      });
      return;
    }
    logger.warn('Could not set online status', { error });
  }
}
