export const KATE_MOBILE_TOKEN_URL =
  'https://oauth.vk.com/authorize?client_id=2685278&scope=1073737727&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1';

export const LOCALHOST_TOKEN_URL =
  'https://oauth.vk.com/authorize?client_id=2685278&scope=1073737727&redirect_uri=http://localhost:26852/vk-oauth&display=page&response_type=token&revoke=1';

function paramsFromUrlPart(value) {
  const clean = String(value || '')
    .replace(/^#/, '')
    .replace(/^\?/, '');
  return new URLSearchParams(clean);
}

export function extractVkAccessToken(value) {
  const input = String(value || '').trim();
  if (!input) {
    return '';
  }

  try {
    const url = new URL(input);
    const token =
      paramsFromUrlPart(url.hash).get('access_token') ||
      paramsFromUrlPart(url.search).get('access_token');
    return token ? token.trim() : '';
  } catch {
    // Raw VK tokens are accepted directly.
  }

  const inlineToken = paramsFromUrlPart(input).get('access_token');
  return (inlineToken || input).trim();
}
