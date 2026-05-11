import logger from '../logger.js';

// VK API error code 3 means "Unknown method passed" — usually because the
// access token does not authorize the requested method. account.setOnline
// requires scope = offline (bit 65536). After we have logged a code-3
// failure once we keep warning the user but include a hint so the case
// study (docs/case-studies/issue-32) is reachable directly from the log.
const UNKNOWN_METHOD_CODE = 3;

export async function setOnlineStatus({ vk }) {
  try {
    await vk.api.account.setOnline();
    logger.info('Online status is set');
  } catch (error) {
    const code = extractVkErrorCode(error);
    if (code === UNKNOWN_METHOD_CODE) {
      logger.warn(
        'Could not set online status: VK API returned code 3 (Unknown method passed). ' +
          'The current access token most likely lacks the "offline" scope ' +
          'required by account.setOnline. See docs/case-studies/issue-32.',
        { error }
      );
      return;
    }
    logger.warn('Could not set online status', { error });
  }
}

function extractVkErrorCode(error) {
  if (!error) {
    return undefined;
  }
  if (typeof error.code === 'number') {
    return error.code;
  }
  const payload = error.payload || error.response || error.body;
  if (
    payload &&
    payload.error &&
    typeof payload.error.error_code === 'number'
  ) {
    return payload.error.error_code;
  }
  return undefined;
}
