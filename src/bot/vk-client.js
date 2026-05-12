/**
 * Thin wrapper around `vk-io`'s VK client.
 *
 * Adds a verbose-only hook on `APIRequest.prototype.make` so that every
 * outgoing VK API request and its raw response are dumped to the logger.
 * This produces the evidence needed to debug `APIError Code №3 "Unknown
 * method passed"` (see `docs/case-studies/issue-41`): without this hook the
 * stock vk-io path swallows both the request body and the response text
 * before throwing, leaving no way to compare a failing `friends.add` call
 * against a succeeding `friends.get` call.
 *
 * The hook is installed once per process, gated behind the logger's verbose
 * flag (default on, see `src/bot/logger.js`). When verbose is off the
 * wrapper is a no-op.
 */
import logger, { isVerbose } from './logger.js';

const PATCHED = Symbol.for('vk-bot-desktop.vkClient.patched');

function summarizeParams(params) {
  if (!params || typeof params !== 'object') {
    return params;
  }
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'access_token') {
      out[key] = '***';
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.length > 8 ? `[${value.length} items]` : value;
      continue;
    }
    if (typeof value === 'string' && value.length > 200) {
      out[key] = `${value.slice(0, 200)}…(${value.length})`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function safeHeaders(headers) {
  if (!headers) {
    return undefined;
  }
  try {
    const out = {};
    if (typeof headers.forEach === 'function') {
      headers.forEach((value, key) => {
        out[key] = value;
      });
      return out;
    }
    return { ...headers };
  } catch {
    return undefined;
  }
}

function installRawHttpHook(APIRequest, hookOptions = {}) {
  if (APIRequest.prototype[PATCHED]) {
    return;
  }
  APIRequest.prototype[PATCHED] = true;
  const verbosePredicate = hookOptions.isVerbose ?? isVerbose;
  const log = hookOptions.logger ?? logger;
  const originalMake = APIRequest.prototype.make;
  APIRequest.prototype.make = async function patchedMake(...args) {
    if (!verbosePredicate()) {
      return originalMake.apply(this, args);
    }
    const { options } = this.api;
    const url = `${options.apiBaseUrl}/${this.method}`;
    log.debug('VK API request', {
      method: this.method,
      url,
      retry: this.retries,
      headers: safeHeaders({
        ...options.apiHeaders,
        ...this.headers,
      }),
      params: summarizeParams({
        ...this.params,
        v: options.apiVersion,
        ...(options.language !== undefined ? { lang: options.language } : {}),
      }),
    });
    try {
      const result = await originalMake.apply(this, args);
      log.debug('VK API response', {
        method: this.method,
        retry: this.retries,
        hasError: result?.error !== undefined,
        errorCode: result?.error?.error_code,
        errorMsg: result?.error?.error_msg,
        responseKeys: result?.response
          ? Object.keys(result.response).slice(0, 16)
          : undefined,
      });
      return result;
    } catch (error) {
      log.error('VK API transport error', {
        method: this.method,
        retry: this.retries,
        url,
        error,
      });
      throw error;
    }
  };
}

export async function createVkClient({ token, vkIoModule, hook } = {}) {
  if (!token) {
    throw new Error('createVkClient: token is required');
  }
  const vkIo = vkIoModule || (await import('vk-io'));
  if (vkIo.APIRequest) {
    installRawHttpHook(vkIo.APIRequest, hook);
  }
  const vk = new vkIo.VK({ token });
  return vk;
}
