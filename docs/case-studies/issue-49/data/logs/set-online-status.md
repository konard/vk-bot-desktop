## `Keep online status while running` fixes

```
2026-05-13T16:17:44.314Z [info] Session log opened {
  "file": "/Users/konard/.vk-bot-desktop/logs/2026-05-13T16-17-44-314Z-89981.log"
}
2026-05-13T16:17:44.336Z [info] Bot started
2026-05-13T16:17:44.338Z [debug] Checking for 'set-online-status' trigger...
2026-05-13T16:17:44.341Z [debug] VK API request {
  "method": "account.setOnline",
  "url": "https://api.vk.ru/method/account.setOnline",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "v": "5.199"
  }
}
2026-05-13T16:17:44.961Z [debug] VK API response {
  "method": "account.setOnline",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:17:44.962Z [warn] Could not set online status {
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:17:44.963Z [debug] 'set-online-status' trigger executed in 625 ms
2026-05-13T16:17:47.729Z [info] Stopping bot
Bot exited with code 0
```

`Keep online status while running` is still does not work.

