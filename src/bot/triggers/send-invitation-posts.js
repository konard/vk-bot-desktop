import logger from '../logger.js';
import {
  INVITATION_MESSAGES,
  pickInvitationMessage,
} from '../messages/invitation-messages.js';
import { LinoStore } from '../../lino-store.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const POST_CACHE_NAME = 'invitation-posts';

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

const ACTIVE_AVATAR_FIELDS = 'photo_id,crop_photo';

function parsePhotoReference(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const match = value.match(/^(-?\d+)_(\d+)(?:_([A-Za-z0-9_-]+))?$/);
  if (!match) {
    return null;
  }
  return {
    photoId: `${match[1]}_${match[2]}`,
    accessKey: match[3] || null,
  };
}

function referenceFromPhotoObject(photo) {
  const ownerId = Number(photo?.owner_id);
  const id = Number(photo?.id);
  if (!Number.isFinite(ownerId) || !Number.isFinite(id)) {
    return null;
  }
  return {
    photoId: `${ownerId}_${id}`,
    accessKey:
      typeof photo.access_key === 'string' && photo.access_key.length > 0
        ? photo.access_key
        : null,
  };
}

function getProfileAvatarReference(profile) {
  return (
    parsePhotoReference(profile?.photo_id) ||
    referenceFromPhotoObject(profile?.crop_photo?.photo)
  );
}

function formatPhotoAttachment({ photoId, accessKey }) {
  return accessKey ? `photo${photoId}_${accessKey}` : `photo${photoId}`;
}

async function resolveAvatarAccessKey({ vk, reference }) {
  const { photoId } = reference;
  let { accessKey } = reference;
  if (accessKey) {
    return { photoId, accessKey };
  }
  try {
    const photos = await vk.api.photos.getById({
      photos: photoId,
      extended: 0,
    });
    const photo = Array.isArray(photos) ? photos[0] : null;
    const resolved = referenceFromPhotoObject(photo);
    if (resolved) {
      return {
        photoId: resolved.photoId,
        accessKey: resolved.accessKey || accessKey,
      };
    }
    if (typeof photo?.access_key === 'string' && photo.access_key.length > 0) {
      accessKey = photo.access_key;
    }
  } catch (error) {
    logger.warn('Could not fetch avatar access_key; attaching bare photo id', {
      photoId,
      error,
    });
  }
  return { photoId, accessKey };
}

// Builds the attachment string for the user's own avatar without re-uploading
// the image. Likes therefore accumulate on the original photo across reposts.
// Format: `photo<owner_id>_<photo_id>[_<access_key>]` — the access_key keeps
// the attachment resolvable when posting to communities where viewers may not
// otherwise have access to the source photo.
export async function getActiveAvatarAttachment({ vk }) {
  let profiles;
  try {
    profiles = await vk.api.users.get({
      fields: ACTIVE_AVATAR_FIELDS,
    });
  } catch (error) {
    logger.warn('Could not fetch active avatar photo_id', { error });
    return null;
  }

  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const reference = getProfileAvatarReference(profile);
  if (!reference) {
    logger.info(
      'Active avatar photo_id missing or malformed; posting without attachment',
      {
        photoId: profile?.photo_id,
        profileCount: Array.isArray(profiles) ? profiles.length : 0,
        profileId: profile?.id,
        profileKeys: profile ? Object.keys(profile).slice(0, 16) : [],
        hasCropPhoto: Boolean(profile?.crop_photo?.photo),
      }
    );
    return null;
  }

  const { photoId, accessKey } = await resolveAvatarAccessKey({
    vk,
    reference,
  });
  logger.debug('Active avatar attachment resolved', {
    photoId,
    hasAccessKey: Boolean(accessKey),
  });
  return formatPhotoAttachment({ photoId, accessKey });
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

async function rotateCommunity({ vk, store, communityId, messages, cache }) {
  const ownerId = `-${communityId}`;
  const cachedIds = readCachedPostIds(cache, communityId);
  const topPostIds = await fetchTopWallPostIds({ vk, ownerId });

  if (recordedPostStillVisible({ cachedIds, topPostIds })) {
    logger.info('Invitation post still in top 10; skipping community', {
      communityId,
      cached: cachedIds,
    });
    return { cache };
  }

  const attachments = [];
  const avatarAttachment = await getActiveAvatarAttachment({ vk });
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
