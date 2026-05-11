// Snapshot of konard/vk-bot index.js scheduling (extract), taken
// 2026-05-11 from /tmp/vk-bot-reference. Note `setInterval` without
// `.unref()` — this is the scheduling pattern that keeps the bot
// process alive. vk-bot-desktop's runner.js used to call .unref() on
// every setTimeout, which let the forked child exit immediately. See
// ../README.md "Root cause 1".
const { second, minute, ms } = require('./time-units');
const { executeTrigger, getToken } = require('./utils');
const { handleOutgoingMessage } = require('./outgoing-messages');

const token = getToken();
const { VK } = require('vk-io');
const vk = new VK({ token });

const messagesHandlerInterval = setInterval(
  handleOutgoingMessage,
  second / ms
);

const { trigger: setOnlineStatusTrigger } = require('./triggers/set-online-status');
const setOnlineStatusInterval = setInterval(async () => {
  await executeTrigger(setOnlineStatusTrigger, { vk });
}, (14 * minute) / ms);
