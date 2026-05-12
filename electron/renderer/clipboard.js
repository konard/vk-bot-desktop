export async function copyTextToClipboard(
  text,
  { api, navigator: navigatorLike } = {}
) {
  const value = String(text ?? '');
  if (api?.copyText) {
    return api.copyText(value);
  }
  const nav =
    navigatorLike ?? (typeof navigator === 'undefined' ? null : navigator);
  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(value);
    return { ok: true };
  }
  throw new Error('Clipboard API is unavailable');
}
