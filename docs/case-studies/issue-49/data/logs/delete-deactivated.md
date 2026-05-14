## Delete deactivated/blocked friends fixes

```
2026-05-13T16:10:20.785Z [info] Session log opened {
  "file": "/Users/konard/.vk-bot-desktop/logs/2026-05-13T16-10-20-754Z-87265.log"
}
2026-05-13T16:10:20.813Z [info] Bot started
2026-05-13T16:10:20.815Z [debug] Checking for 'delete-deactivated-friends' trigger...
2026-05-13T16:10:20.817Z [debug] VK API request {
  "method": "friends.get",
  "url": "https://api.vk.ru/method/friends.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "count": 5000,
    "offset": 0,
    "fields": "deactivated",
    "v": "5.199"
  }
}
2026-05-13T16:10:25.137Z [debug] VK API response {
  "method": "friends.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items"
  ]
}
2026-05-13T16:10:25.138Z [debug] VK API request {
  "method": "friends.get",
  "url": "https://api.vk.ru/method/friends.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "count": 5000,
    "offset": 5000,
    "fields": "deactivated",
    "v": "5.199"
  }
}
2026-05-13T16:10:28.890Z [debug] VK API response {
  "method": "friends.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items"
  ]
}
2026-05-13T16:10:28.907Z [info] Deactivated friends to delete {
  "count": 33
}
2026-05-13T16:10:28.907Z [debug] VK API request {
  "method": "friends.delete",
  "url": "https://api.vk.ru/method/friends.delete",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 12598507,
    "v": "5.199"
  }
}
2026-05-13T16:10:29.130Z [debug] VK API response {
  "method": "friends.delete",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:10:29.131Z [warn] Failed to delete deactivated friend {
  "userId": 12598507,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:10:34.142Z [debug] VK API request {
  "method": "friends.delete",
  "url": "https://api.vk.ru/method/friends.delete",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 28418305,
    "v": "5.199"
  }
}
2026-05-13T16:10:34.727Z [debug] VK API response {
  "method": "friends.delete",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:10:34.727Z [warn] Failed to delete deactivated friend {
  "userId": 28418305,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:10:39.729Z [debug] VK API request {
  "method": "friends.delete",
  "url": "https://api.vk.ru/method/friends.delete",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 69444667,
    "v": "5.199"
  }
}
2026-05-13T16:10:40.370Z [debug] VK API response {
  "method": "friends.delete",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:10:40.371Z [warn] Failed to delete deactivated friend {
  "userId": 69444667,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:10:43.320Z [info] Stopping bot
Bot exited with code 0
```

At the moment delete deactived/blocked friends is not working. That must be fixed.

