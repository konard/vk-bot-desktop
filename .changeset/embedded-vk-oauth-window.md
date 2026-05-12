---
'vk-bot-desktop': patch
---

Replace the rejected localhost VK OAuth redirect with an embedded Electron
authorization window that captures the `oauth.vk.com/blank.html` token redirect
automatically.
