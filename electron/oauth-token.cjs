'use strict';

const VK_OAUTH_BLANK_HOST = 'oauth.vk.com';
const VK_OAUTH_BLANK_PATH = '/blank.html';
const ALLOWED_VK_AUTH_HOSTS = new Set([
  'oauth.vk.com',
  'id.vk.com',
  'login.vk.com',
  'vk.com',
]);

function parseUrl(value) {
  try {
    return new URL(String(value || ''));
  } catch {
    return null;
  }
}

function paramsFromUrlPart(value) {
  const clean = String(value || '')
    .replace(/^#/, '')
    .replace(/^\?/, '');
  return new URLSearchParams(clean);
}

function isVkOAuthBlankRedirect(value) {
  const url = parseUrl(value);
  return Boolean(
    url &&
    url.protocol === 'https:' &&
    url.hostname === VK_OAUTH_BLANK_HOST &&
    url.pathname === VK_OAUTH_BLANK_PATH
  );
}

function extractVkOAuthBlankToken(value) {
  if (!isVkOAuthBlankRedirect(value)) {
    return '';
  }
  const url = parseUrl(value);
  const token =
    paramsFromUrlPart(url.hash).get('access_token') ||
    paramsFromUrlPart(url.search).get('access_token');
  return token ? token.trim() : '';
}

function isAllowedVkAuthNavigation(value) {
  const url = parseUrl(value);
  return Boolean(
    url && url.protocol === 'https:' && ALLOWED_VK_AUTH_HOSTS.has(url.hostname)
  );
}

module.exports = {
  extractVkOAuthBlankToken,
  isAllowedVkAuthNavigation,
  isVkOAuthBlankRedirect,
};
