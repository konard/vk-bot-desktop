import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import logger from '../logger.js';
import {
  INVITATION_MESSAGES,
  pickInvitationMessage,
} from '../messages/invitation-messages.js';
import { LinoStore } from '../../lino-store.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const POST_CACHE_NAME = 'invitation-posts';

const TEN_SECONDS_MS = 10 * 1000;
const FIVE_SECONDS_MS = 5 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

function resolveMessages(config) {
  if (config.invitationPost?.messages?.length > 0) {
    return config.invitationPost.messages;
  }
  if (config.invitationPost?.text) {
    return [config.invitationPost.text];
  }
  return INVITATION_MESSAGES;
}

export function readCachedPostIds(cache, communityId) {
  if (!cache || typeof cache !== 'object') {
    return [];
  }
  const bucket = cache.byCommunity?.[communityId];
  if (bucket === undefined || bucket === null) {
    return [];
  }
  if (Array.isArray(bucket)) {
    return bucket.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  }
  const numeric = Number(bucket);
  return Number.isFinite(numeric) ? [numeric] : [];
}

export function buildUpdatedCache(cache, communityId, postIds) {
  const next = {
    byCommunity: { ...(cache?.byCommunity || {}) },
  };
  const ids = postIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
  if (ids.length === 0) {
    delete next.byCommunity[communityId];
  } else {
    next.byCommunity[communityId] = ids;
  }
  return next;
}

async function readPostCache(store) {
  try {
    const value = await store.readCache(POST_CACHE_NAME);
    return value || { byCommunity: {} };
  } catch (error) {
    logger.warn('Could not read invitation-posts cache; starting fresh', {
      error,
    });
    return { byCommunity: {} };
  }
}

async function writePostCache(store, value) {
  try {
    await store.writeCache(POST_CACHE_NAME, value);
  } catch (error) {
    logger.warn('Could not persist invitation-posts cache', { error });
  }
}

async function getActiveAvatarUrl({ vk }) {
  try {
    const profiles = await vk.api.users.get({
      user_ids: 0,
      fields: 'photo_max_orig',
    });
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    return profile?.photo_max_orig || null;
  } catch (error) {
    logger.warn('Could not fetch active avatar URL', { error });
    return null;
  }
}

async function downloadToTempFile(url) {
  if (typeof fetch !== 'function') {
    return null;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`avatar download failed (HTTP ${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `vk-bot-desktop-avatar-${Date.now()}.jpeg`;
  const tempPath = path.join(os.tmpdir(), filename);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

async function uploadCommunityAvatar({ vk, config, communityId }) {
  const configuredPath = config.invitationPost?.avatarPath;
  let pathToUpload = null;
  let cleanupPath = null;
  try {
    if (configuredPath) {
      const { existsSync } = await import('node:fs');
      if (!existsSync(configuredPath)) {
        logger.warn(
          'Configured avatar image not found; falling back to active avatar',
          { path: configuredPath }
        );
      } else {
        pathToUpload = configuredPath;
      }
    }
    if (!pathToUpload) {
      const url = await getActiveAvatarUrl({ vk });
      if (!url) {
        return null;
      }
      try {
        pathToUpload = await downloadToTempFile(url);
        cleanupPath = pathToUpload;
      } catch (error) {
        logger.warn(
          'Could not download active avatar; posting without attachment',
          { error }
        );
        return null;
      }
    }
    const { createReadStream } = await import('node:fs');
    const photo = await vk.upload.wallPhoto({
      source: {
        value: createReadStream(pathToUpload),
        filename: 'avatar.jpeg',
      },
      group_id: communityId,
    });
    return `photo${photo.ownerId}_${photo.id}`;
  } catch (error) {
    logger.warn('Could not upload community avatar', { communityId, error });
    return null;
  } finally {
    if (cleanupPath) {
      fs.unlink(cleanupPath).catch(() => undefined);
    }
  }
}

async function fetchTopWallPostIds({ vk, ownerId }) {
  const topPosts = await vk.api.wall.get({ owner_id: ownerId, count: 10 });
  return (topPosts.items || []).map((post) => post.id);
}

function recordedPostStillVisible({ cachedIds, topPostIds }) {
  if (cachedIds.length === 0) {
    return false;
  }
  const visible = new Set(topPostIds);
  return cachedIds.some((id) => visible.has(id));
}

async function deleteRecordedPosts({ vk, ownerId, postIds }) {
  const stillCached = [];
  for (const postId of postIds) {
    try {
      await vk.api.wall.delete({ owner_id: ownerId, post_id: postId });
      logger.info('Old invitation post deleted', { ownerId, postId });
      await sleep(FIVE_SECONDS_MS);
    } catch (error) {
      if (error?.code === 104 || error?.code === 100) {
        logger.warn('Old invitation post already gone; dropping from cache', {
          ownerId,
          postId,
          code: error.code,
        });
        continue;
      }
      logger.warn('Could not delete old invitation post; keeping in cache', {
        ownerId,
        postId,
        error,
      });
      stillCached.push(postId);
    }
  }
  return stillCached;
}

function handlePostError(error, communityId) {
  if (error?.code === 14) {
    logger.warn('Captcha required; backing off', { communityId });
    return { backoffMs: ONE_MINUTE_MS };
  }
  if (error?.code === 219 || error?.code === 210 || error?.code === 15) {
    logger.warn('Posting blocked for community; skipping', {
      communityId,
      code: error.code,
    });
    return { backoffMs: ONE_MINUTE_MS, skip: true };
  }
  if (error?.code === 10) {
    logger.warn('VK internal error; backing off', { communityId });
    return { backoffMs: ONE_MINUTE_MS };
  }
  logger.error('Failed to send invitation post', { communityId, error });
  return {};
}

async function rotateCommunity({
  vk,
  config,
  store,
  communityId,
  messages,
  cache,
}) {
  const ownerId = `-${communityId}`;
  const cachedIds = readCachedPostIds(cache, communityId);
  const topPostIds = await fetchTopWallPostIds({ vk, ownerId });
  await sleep(TEN_SECONDS_MS);

  if (recordedPostStillVisible({ cachedIds, topPostIds })) {
    logger.info('Invitation post still in top 10; skipping community', {
      communityId,
      cached: cachedIds,
    });
    return { cache };
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

  const message = pickInvitationMessage(Math.random, messages).trim();
  const sent = await vk.api.wall.post({
    owner_id: ownerId,
    message,
    attachments: attachments.join(','),
  });
  logger.info('Invitation post sent', { communityId, postId: sent?.post_id });
  await sleep(FIVE_SECONDS_MS);

  const newPostId = sent?.post_id;
  let nextIds = newPostId ? [newPostId] : [];
  if (cachedIds.length > 0) {
    const survivors = await deleteRecordedPosts({
      vk,
      ownerId,
      postIds: cachedIds,
    });
    nextIds = [...nextIds, ...survivors];
  }

  const nextCache = buildUpdatedCache(cache, communityId, nextIds);
  await writePostCache(store, nextCache);
  return { cache: nextCache };
}

export async function sendInvitationPosts({ vk, config, store }) {
  const messages = resolveMessages(config);
  const communities = config.invitationPost?.communities || [];
  if (communities.length === 0) {
    logger.info('No invitation-post communities configured; skipping');
    return;
  }
  const resolvedStore = store || new LinoStore();
  let cache = await readPostCache(resolvedStore);
  for (const communityId of communities) {
    try {
      const { cache: nextCache } = await rotateCommunity({
        vk,
        config,
        store: resolvedStore,
        communityId,
        messages,
        cache,
      });
      cache = nextCache;
    } catch (error) {
      const { backoffMs } = handlePostError(error, communityId);
      if (backoffMs) {
        await sleep(backoffMs);
      }
    }
  }
}
