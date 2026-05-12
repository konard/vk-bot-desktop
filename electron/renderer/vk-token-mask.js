/**
 * Masks a VK access token so it can be displayed without exposing the
 * full secret. Keeps the first 10 and last 10 characters intact and
 * replaces the middle with a fixed bullet run. Returns an empty string
 * if the token is missing, and returns the token unchanged when it is
 * already shorter than the visible window.
 */
export function maskVkToken(token) {
  const value = String(token ?? '');
  if (!value) {
    return '';
  }
  const visibleHead = 10;
  const visibleTail = 10;
  if (value.length <= visibleHead + visibleTail) {
    return value;
  }
  const head = value.slice(0, visibleHead);
  const tail = value.slice(-visibleTail);
  return `${head}••••••••••${tail}`;
}
