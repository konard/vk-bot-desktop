# Issue 37 Online Research Notes

Investigation date: 2026-05-12.

Sources checked:

- Electron `webContents` navigation events:
  <https://www.electronjs.org/docs/latest/api/web-contents>
- Electron `BrowserWindow` / `webContents` relationship:
  <https://www.electronjs.org/docs/api/web-contents/>
- MDN `URL.hash`:
  <https://developer.mozilla.org/en-US/docs/Web/API/URL/hash>
- Stack Overflow discussion of VK standalone app auth with
  `redirect_uri=https://oauth.vk.com/blank.html`:
  <https://stackoverflow.com/questions/29200374/authorize-chrome-app-as-standalone-in-vkontakte-api>
- Stack Overflow discussion of retrieving a VK access token from the
  `blank.html#access_token=...` redirect:
  <https://stackoverflow.com/questions/43645448/retrieving-access-token-without-manual-copying>

Findings:

- Electron exposes main-frame document navigation events, redirect events, and
  same-document navigation events. A robust embedded OAuth flow should observe
  both normal redirects and in-page/hash navigations.
- The VK standalone OAuth flow used by this project returns the token in the URL
  fragment of `https://oauth.vk.com/blank.html`.
- Browser URL fragments are available to local browser code through the `hash`
  field, but fragments are not sent to a localhost HTTP server. The previous
  localhost callback therefore had to serve JavaScript and receive a secondary
  POST from the page, and it still could not run when VK rejected the localhost
  redirect URI before redirecting.
- The issue screenshot proves VK rejects
  `http://localhost:26852/vk-oauth` for app id `2685278` with
  `redirect_uri is incorrect, check application redirect uri in the settings page`.
- A custom application protocol could be a valid OAuth pattern only if the VK
  application settings accept that exact redirect URI and the desktop app
  registers the protocol at the OS level. That does not solve the current
  Kate Mobile app id flow, where `https://oauth.vk.com/blank.html` is the known
  working redirect.
