## Auto-accept friend requests fixes

```
2026-05-13T16:11:58.900Z [info] Session log opened {
  "file": "/Users/konard/.vk-bot-desktop/logs/2026-05-13T16-11-58-899Z-87865.log"
}
2026-05-13T16:11:58.924Z [info] Bot started
2026-05-13T16:11:58.926Z [debug] Checking for 'accept-friend-requests' trigger...
2026-05-13T16:11:58.929Z [debug] VK API request {
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
2026-05-13T16:12:03.289Z [debug] VK API response {
  "method": "friends.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items"
  ]
}
2026-05-13T16:12:03.291Z [debug] VK API request {
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
2026-05-13T16:12:07.640Z [debug] VK API response {
  "method": "friends.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items"
  ]
}
2026-05-13T16:12:07.653Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 198502458,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:07.877Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:07.878Z [error] Could not send priority friend request {
  "userId": 198502458,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:08.032Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 430832074,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:08.251Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:08.252Z [error] Could not send priority friend request {
  "userId": 430832074,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:08.412Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 432128061,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:08.634Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:08.634Z [error] Could not send priority friend request {
  "userId": 432128061,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:08.792Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 16305383,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:09.011Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:09.011Z [error] Could not send priority friend request {
  "userId": 16305383,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:09.172Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 9531119,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:09.393Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:09.393Z [error] Could not send priority friend request {
  "userId": 9531119,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
...
2026-05-13T16:12:10.692Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 256140921,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:10.952Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:10.952Z [error] Could not send priority friend request {
  "userId": 256140921,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:11.072Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 41444183,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:11.359Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:11.359Z [error] Could not send priority friend request {
  "userId": 41444183,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:11.451Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 288221158,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:11.665Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:11.665Z [error] Could not send priority friend request {
  "userId": 288221158,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:11.830Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 261636015,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:12.079Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:12.079Z [error] Could not send priority friend request {
  "userId": 261636015,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:12.210Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 686333206,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:12.429Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:12.430Z [error] Could not send priority friend request {
  "userId": 686333206,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:12.590Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 771681662,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:12.896Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:12.897Z [error] Could not send priority friend request {
  "userId": 771681662,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:12.970Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 14374586,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:13.204Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:13.204Z [error] Could not send priority friend request {
  "userId": 14374586,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:13.350Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 561231467,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:13.614Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:13.614Z [error] Could not send priority friend request {
  "userId": 561231467,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:13.729Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 379696004,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:14.331Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:14.331Z [error] Could not send priority friend request {
  "userId": 534795689,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:14.487Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 194656856,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:14.738Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:14.738Z [error] Could not send priority friend request {
  "userId": 194656856,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:14.866Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 158646820,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:15.086Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:15.086Z [error] Could not send priority friend request {
  "userId": 158646820,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:15.245Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 39502581,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:15.558Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:15.559Z [error] Could not send priority friend request {
  "userId": 39502581,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:15.625Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 155669831,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:15.845Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:15.846Z [error] Could not send priority friend request {
  "userId": 155669831,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:16.005Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 407552553,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:16.226Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:16.227Z [error] Could not send priority friend request {
  "userId": 407552553,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:16.383Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 712618469,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:16.686Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:16.686Z [error] Could not send priority friend request {
  "userId": 712618469,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:16.763Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 528022640,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:16.981Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:16.981Z [error] Could not send priority friend request {
  "userId": 528022640,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:17.142Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 597063510,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:17.358Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:17.358Z [error] Could not send priority friend request {
  "userId": 597063510,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:17.521Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 209280029,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:17.811Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:17.811Z [error] Could not send priority friend request {
  "userId": 209280029,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:17.900Z [debug] VK API request {
  "method": "friends.add",
  "url": "https://api.vk.ru/method/friends.add",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "user_id": 683950705,
    "text": "",
    "v": "5.199"
  }
}
2026-05-13T16:12:18.123Z [debug] VK API response {
  "method": "friends.add",
  "retry": 0,
  "hasError": true,
  "errorCode": 3,
  "errorMsg": "Unknown method passed"
}
2026-05-13T16:12:18.123Z [error] Could not send priority friend request {
  "userId": 683950705,
  "error": {
    "name": "APIError",
    "message": "Code №3 - Unknown method passed",
    "stack": "APIError: Code №3 - Unknown method passed\n    at SequentialWorker.execute (file:///private/var/folders/cl/831lqjgd58v5mb_m74cfdfcw0000gn/T/AppTranslocation/699D606C-4086-4E95-BC6E-929CE7D6A6EF/d/VK%20Bot%20Desktop.app/Contents/Resources/app.asar/node_modules/vk-io/lib/index.mjs:1854:44)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  }
}
2026-05-13T16:12:18.234Z [info] Stopping bot
Bot exited with code 0
```

Auto acception friends requests does not work, we should also respect API limits and don't do too much and too fast requests. Double check http://github.com/konard/vk-bot how does respect API limits, and reproduce it for all our features, timing is important and not random, every repeat cycle and interval from http://github.com/konard/vk-bot was fine tuned to get no captcha requests. Also on any `Unknown method passed` we should stop each trigger with such error immediately.

Also may be the problem is that we try to accept friends, that already have outgoing requests, we should check for that. For example now priority friends list is loaded by outgoing friends requests, so it may be the case.

Double check how http://github.com/konard/vk-bot does it, and if possible do better.

We also need a button to clear the log in addition to copy, for convenience of testing.

