import logger from '../logger.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendInvitationPosts({ vk, config }) {
  const message = (
    config.invitationPost?.text || 'Приму заявки в друзья.'
  ).trim();
  const communities = config.invitationPost?.communities || [];
  if (communities.length === 0) {
    logger.info('No invitation-post communities configured; skipping');
    return;
  }
  for (const communityId of communities) {
    const ownerId = `-${communityId}`;
    try {
      const topPosts = await vk.api.wall.get({
        owner_id: ownerId,
        count: 10,
      });
      const alreadyPosted = (topPosts.items || []).some((p) =>
        (p.text || '').includes(message)
      );
      if (alreadyPosted) {
        logger.info('Invitation post already present; skipping community', {
          communityId,
        });
        continue;
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
        message,
        attachments: attachments.join(','),
      });
      logger.info('Invitation post sent', { communityId });
      await sleep(5000);
    } catch (error) {
      if (error.code === 14) {
        logger.warn('Captcha required; backing off', { communityId });
        await sleep(60000);
        continue;
      }
      if (error.code === 219 || error.code === 210 || error.code === 15) {
        logger.warn('Posting blocked for community; skipping', {
          communityId,
          code: error.code,
        });
        continue;
      }
      logger.error('Failed to send invitation post', { communityId, error });
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
