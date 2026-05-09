/**
 * Theme handling for the renderer.
 *
 * The theme can be one of `auto`, `light`, or `dark`. In `auto` we listen to
 * the OS-level preferred-color-scheme media query and update the document's
 * `data-theme` attribute. The Electron main process tells us the initial
 * system theme through `vkbot.getSystemTheme()` so the very first paint is
 * already correct.
 */

const STORAGE_KEY = 'vk-bot-desktop:theme';

export function loadStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable in tests
  }
  return 'auto';
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // best-effort
  }
}

export function resolveTheme({ preference, systemTheme }) {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemTheme || 'light';
}

export function applyTheme(documentElement, resolvedTheme) {
  documentElement.setAttribute('data-theme', resolvedTheme);
}

export function watchSystemTheme(matchMediaImpl, onChange) {
  if (!matchMediaImpl) {
    return () => {};
  }
  const media = matchMediaImpl('(prefers-color-scheme: dark)');
  const listener = (event) => onChange(event.matches ? 'dark' : 'light');
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }
  if (typeof media.addListener === 'function') {
    media.addListener(listener);
    return () => media.removeListener(listener);
  }
  return () => {};
}
