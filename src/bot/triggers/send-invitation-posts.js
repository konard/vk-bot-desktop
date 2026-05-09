import logger from '../logger.js';
import {
  INVITATION_MESSAGES,
  pickInvitationMessage,
} from '../messages/invitation-messages.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveMessages(config) {
  if (config.invitationPost?.messages?.length > 0) {
    return config.invitationPost.messages;
  }
  if (config.invitationPost?.text) {
    return [config.invitationPost.text];
  }
  return INVITATION_MESSAGES;
}

async function alreadyHasInvitationPost({ vk, ownerId, messages }) {
  const topPosts = await vk.api.wall.get({ owner_id: ownerId, count: 10 });
  return (topPosts.items || []).some((p) =>
    messages.some((m) => (p.text || '').includes(m.trim()))
  );
}

function handlePostError(error, communityId) {
  if (error.code === 14) {
    logger.warn('Captcha required; backing off', { communityId });
    return { backoffMs: 60000 };
  }
  if (error.code === 219 || error.code === 210 || error.code === 15) {
    logger.warn('Posting blocked for community; skipping', {
      communityId,
      code: error.code,
    });
    return { skip: true };
  }
  logger.error('Failed to send invitation post', { communityId, error });
  return {};
}

async function postToCommunity({ vk, config, communityId, messages }) {
  const ownerId = `-${communityId}`;
  if (await alreadyHasInvitationPost({ vk, ownerId, messages })) {
    logger.info('Invitation post already present; skipping community', {
      communityId,
    });
    return;
  }
  const attachments = [];
  const avatarAttachment = await uploadCommunityAvatar({
    vk,
    config,
    communityId,
  });
  if (avatarAttachment) {
    attachments.push(avatarAttachment);
  }
  await vk.api.wall.post({
    owner_id: ownerId,
    message: pickInvitationMessage(Math.random, messages).trim(),
    attachments: attachments.join(','),
  });
  logger.info('Invitation post sent', { communityId });
  await sleep(5000);
}

export async function sendInvitationPosts({ vk, config }) {
  const messages = resolveMessages(config);
  const communities = config.invitationPost?.communities || [];
  if (communities.length === 0) {
    logger.info('No invitation-post communities configured; skipping');
    return;
  }
  for (const communityId of communities) {
    try {
      await postToCommunity({ vk, config, communityId, messages });
    } catch (error) {
      const { backoffMs } = handlePostError(error, communityId);
      if (backoffMs) {
        await sleep(backoffMs);
      }
    }
  }
}

async function uploadCommunityAvatar({ vk, config, communityId }) {
  const path = config.invitationPost?.avatarPath;
  if (!path) {
    return null;
  }
  try {
    // Lazy require so unit tests do not have to mock node:fs.
    const { createReadStream, existsSync } = await import('node:fs');
    if (!existsSync(path)) {
      logger.warn('Avatar image not found; posting without attachment', {
        path,
      });
      return null;
    }
    const photo = await vk.upload.wallPhoto({
      source: { value: createReadStream(path), filename: 'avatar.jpeg' },
      group_id: communityId,
    });
    return `photo${photo.ownerId}_${photo.id}`;
  } catch (error) {
    logger.warn('Could not upload community avatar', { communityId, error });
    return null;
  }
}
