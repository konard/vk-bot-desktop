## Invitation improvements 

```
2026-05-13T15:53:25.719Z [info] Session log opened {
  "file": "/Users/konard/.vk-bot-desktop/logs/2026-05-13T15-53-25-718Z-81033.log"
}
2026-05-13T15:53:25.743Z [info] Bot started
2026-05-13T15:53:25.745Z [debug] Checking for 'send-invitation-posts' trigger...
2026-05-13T15:53:25.748Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-64758790",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:27.648Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:53:27.648Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-64758790",
    "message": "Новые друзья приветствуются. Заявки принимаются.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:53:27.994Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:53:27.995Z [info] Invitation post sent {
  "communityId": 64758790
}
2026-05-13T15:53:32.995Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-34985835",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:36.246Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:53:36.246Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-34985835",
    "message": "Жду заявку в друзья — давай знакомиться.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:53:36.694Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:53:36.694Z [info] Invitation post sent {
  "communityId": 34985835
}
2026-05-13T15:53:41.695Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-24261502",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:43.635Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:53:43.635Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-24261502",
    "message": "Заявки в друзья приветствуются.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:53:43.965Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:53:43.965Z [info] Invitation post sent {
  "communityId": 24261502
}
2026-05-13T15:53:48.966Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-53294903",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:49.882Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:53:49.882Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-53294903",
    "message": "Принимаю заявки в друзья — пишите",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:53:50.291Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:53:50.292Z [info] Invitation post sent {
  "communityId": 53294903
}
2026-05-13T15:53:55.293Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-33764742",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:55.888Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: wall is disabled"
}
2026-05-13T15:53:55.889Z [warn] Posting blocked for community; skipping {
  "communityId": 33764742,
  "code": 15
}
2026-05-13T15:53:55.889Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-8337923",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:56.117Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: you are in users blacklist"
}
2026-05-13T15:53:56.117Z [warn] Posting blocked for community; skipping {
  "communityId": 8337923,
  "code": 15
}
2026-05-13T15:53:56.268Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-94946045",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:53:56.758Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:53:56.759Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-94946045",
    "message": "Новые друзья приветствуются. Заявки принимаются.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:53:57.166Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:53:57.166Z [info] Invitation post sent {
  "communityId": 94946045
}
2026-05-13T15:54:02.168Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-194360448",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:02.756Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: you are in users blacklist"
}
2026-05-13T15:54:02.756Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-39130136",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:02.756Z [warn] Posting blocked for community; skipping {
  "communityId": 194360448,
  "code": 15
}
2026-05-13T15:54:03.225Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:03.225Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-39130136",
    "message": "Жду заявок в друзья — давайте знакомиться.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:03.599Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:03.599Z [info] Invitation post sent {
  "communityId": 39130136
}
2026-05-13T15:54:08.600Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-198580397",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:09.546Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:09.546Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-198580397",
    "message": "Можно подружиться. Жду заявку в друзья.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:09.922Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:09.922Z [info] Invitation post sent {
  "communityId": 198580397
}
2026-05-13T15:54:14.923Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-195285978",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:15.781Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:15.781Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-195285978",
    "message": "Жду заявок в друзья — давайте знакомиться.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:16.180Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:16.180Z [info] Invitation post sent {
  "communityId": 195285978
}
2026-05-13T15:54:21.181Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-47350356",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:22.121Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:22.121Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-47350356",
    "message": "Жду заявку в друзья — давай знакомиться.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:22.460Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:22.460Z [info] Invitation post sent {
  "communityId": 47350356
}
2026-05-13T15:54:27.461Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-61413825",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:28.306Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:28.306Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-61413825",
    "message": "Жду заявок в друзья — давайте знакомиться.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:28.723Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:28.723Z [info] Invitation post sent {
  "communityId": 61413825
}
2026-05-13T15:54:33.725Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-30345825",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:34.330Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: this wall available only for community members"
}
2026-05-13T15:54:34.330Z [warn] Posting blocked for community; skipping {
  "communityId": 30345825,
  "code": 15
}
2026-05-13T15:54:34.330Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-180442247",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:34.830Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:34.831Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-180442247",
    "message": "Если хочется пообщаться — добавляйтесь в друзья.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:35.269Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:35.269Z [info] Invitation post sent {
  "communityId": 180442247
}
2026-05-13T15:54:40.270Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-214787806",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T15:54:41.370Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T15:54:41.370Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-214787806",
    "message": "Принимаю заявки в друзья — пишите",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T15:54:41.742Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T15:54:41.742Z [info] Invitation post sent {
  "communityId": 214787806
}
2026-05-13T15:54:46.744Z [debug] 'send-invitation-posts' trigger executed in 80999 ms
2026-05-13T16:03:46.751Z [debug] Checking for 'send-invitation-posts' trigger...
2026-05-13T16:03:46.753Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-64758790",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:03:47.675Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:03:47.675Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-64758790",
    "message": "Жду заявок в друзья — давайте знакомиться.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T16:03:48.008Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T16:03:48.008Z [info] Invitation post sent {
  "communityId": 64758790
}
2026-05-13T16:03:53.009Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-34985835",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:03:53.940Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:03:53.941Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-34985835",
    "message": "Заявки в друзья приветствуются.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T16:03:54.321Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T16:03:54.322Z [info] Invitation post sent {
  "communityId": 34985835
}
2026-05-13T16:03:59.323Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-24261502",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:00.191Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:00.191Z [info] Invitation post already present; skipping community {
  "communityId": 24261502
}
2026-05-13T16:04:00.191Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-53294903",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:00.783Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:00.784Z [debug] VK API request {
  "method": "wall.post",
  "url": "https://api.vk.ru/method/wall.post",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-53294903",
    "message": "Можно подружиться. Жду заявку в друзья.",
    "attachments": "",
    "v": "5.199"
  }
}
2026-05-13T16:04:01.139Z [debug] VK API response {
  "method": "wall.post",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "post_id"
  ]
}
2026-05-13T16:04:01.139Z [info] Invitation post sent {
  "communityId": 53294903
}
2026-05-13T16:04:06.140Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-33764742",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:06.737Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: wall is disabled"
}
2026-05-13T16:04:06.737Z [warn] Posting blocked for community; skipping {
  "communityId": 33764742,
  "code": 15
}
2026-05-13T16:04:06.738Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-8337923",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:06.986Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: you are in users blacklist"
}
2026-05-13T16:04:06.986Z [warn] Posting blocked for community; skipping {
  "communityId": 8337923,
  "code": 15
}
2026-05-13T16:04:07.117Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-94946045",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:07.636Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:07.636Z [info] Invitation post already present; skipping community {
  "communityId": 94946045
}
2026-05-13T16:04:07.636Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-194360448",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:07.863Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: you are in users blacklist"
}
2026-05-13T16:04:07.863Z [warn] Posting blocked for community; skipping {
  "communityId": 194360448,
  "code": 15
}
2026-05-13T16:04:08.015Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-39130136",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:08.496Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:08.496Z [info] Invitation post already present; skipping community {
  "communityId": 39130136
}
2026-05-13T16:04:08.496Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-198580397",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:08.861Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:08.861Z [info] Invitation post already present; skipping community {
  "communityId": 198580397
}
2026-05-13T16:04:08.876Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-195285978",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:09.198Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:09.198Z [info] Invitation post already present; skipping community {
  "communityId": 195285978
}
2026-05-13T16:04:09.256Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-47350356",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:09.789Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:09.790Z [info] Invitation post already present; skipping community {
  "communityId": 47350356
}
2026-05-13T16:04:09.790Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-61413825",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:10.179Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:10.179Z [info] Invitation post already present; skipping community {
  "communityId": 61413825
}
2026-05-13T16:04:10.180Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-30345825",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:10.411Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": true,
  "errorCode": 15,
  "errorMsg": "Access denied: this wall available only for community members"
}
2026-05-13T16:04:10.411Z [warn] Posting blocked for community; skipping {
  "communityId": 30345825,
  "code": 15
}
2026-05-13T16:04:10.558Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-180442247",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:10.916Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:10.916Z [info] Invitation post already present; skipping community {
  "communityId": 180442247
}
2026-05-13T16:04:10.937Z [debug] VK API request {
  "method": "wall.get",
  "url": "https://api.vk.ru/method/wall.get",
  "retry": 0,
  "headers": {
    "User-Agent": "vk-io/4.10.0 (+https://github.com/negezor/vk-io)"
  },
  "params": {
    "owner_id": "-214787806",
    "count": 10,
    "v": "5.199"
  }
}
2026-05-13T16:04:11.215Z [debug] VK API response {
  "method": "wall.get",
  "retry": 0,
  "hasError": false,
  "responseKeys": [
    "count",
    "items",
    "reaction_sets"
  ]
}
2026-05-13T16:04:11.215Z [info] Invitation post already present; skipping community {
  "communityId": 214787806
}
2026-05-13T16:04:11.215Z [debug] 'send-invitation-posts' trigger executed in 24464 ms

```

