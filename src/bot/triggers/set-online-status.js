import logger from '../logger.js';

export async function setOnlineStatus({ vk }) {
  try {
    await vk.api.account.setOnline();
    logger.info('Online status is set');
  } catch (error) {
    logger.warn('Could not set online status', { error });
  }
}
