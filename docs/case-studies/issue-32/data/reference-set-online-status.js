// Snapshot of konard/vk-bot triggers/set-online-status.js taken
// 2026-05-11 from /tmp/vk-bot-reference. Used to confirm that the
// callsite in vk-bot-desktop matches the reference. The bug therefore
// is not in this trigger but in (a) how it is scheduled and (b) the
// VK access token scopes — see ../README.md.
async function setOnlineStatus({ vk }) {
  try {
    await vk.api.account.setOnline();
    console.log('Online status is set');
  } catch (error) {
    console.log('Could not set online status', error);
  }
}

const trigger = {
  name: 'SetOnlineStatus',
  action: async (context) => {
    return await setOnlineStatus(context);
  },
};

module.exports = {
  trigger,
};
