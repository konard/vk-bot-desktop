/**
 * Shared helpers for interpreting VK API errors.
 *
 * The most important case in 2025-2026 is error code 3 ("Unknown method
 * passed") returned for `friends.add`, `friends.delete`, `account.setOnline`
 * and a handful of other write methods. Despite the misleading message, VK is
 * not complaining that the method name is wrong — it is signalling that the
 * (token, method) pair has been gated server-side. See
 * docs/case-studies/issue-49/README.md §7 for the evidence.
 *
 * Each affected trigger should:
 *   1. Stop the current run on the first code-3 error (no point retrying every
 *      candidate).
 *   2. Surface a single, very visible diagnostic line including the result of
 *      `account.getAppPermissions` so the user sees the scope mask alongside
 *      the failure.
 *
 * `fetchAppPermissions` is cached per process: we only need the bitmask once,
 * but every trigger may want to call it after the first failure.
 */

import logger from './logger.js';

export const UNKNOWN_METHOD_CODE = 3;

export function isUnknownMethodError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = Number(error.code ?? error.error_code);
  return code === UNKNOWN_METHOD_CODE;
}

let permissionsPromise = null;

export function resetAppPermissionsCache() {
  permissionsPromise = null;
}

export async function fetchAppPermissions(vk) {
  if (!vk?.api?.account?.getAppPermissions) {
    return null;
  }
  if (!permissionsPromise) {
    permissionsPromise = (async () => {
      try {
        const mask = await vk.api.account.getAppPermissions({});
        return Number(mask) || 0;
      } catch (error) {
        logger.warn('Could not read account.getAppPermissions', { error });
        return null;
      }
    })();
  }
  return permissionsPromise;
}

/**
 * Log a single terminal diagnostic for a code-3 failure and short-circuit
 * the calling trigger.
 *
 * Returns `true` if the caller should stop its run (caller decides whether
 * to `return`, `break`, or rethrow).
 */
export async function reportUnknownMethod({ vk, method, error, trigger }) {
  const permissions = await fetchAppPermissions(vk);
  logger.error(
    'VK API rejected method as unknown; halting trigger for this cycle',
    {
      trigger,
      method,
      errorCode: Number(error?.code ?? error?.error_code) || null,
      errorMessage: error?.message || error?.error_msg || null,
      appPermissionsMask: permissions,
      hint:
        'VK has gated this method for the Kate Mobile OAuth app (see docs/case-studies/issue-49 §7). Re-runs will fail until the user switches OAuth flow.',
    }
  );
  return true;
}
