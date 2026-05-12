/**
 * Default bot configuration.
 *
 * This object is the schema and the default value at the same time. It is
 * loaded by the runner at startup and merged with whatever the layered
 * lino store returns. Anything the user has not customized falls back to
 * the values declared here.
 */

import { INVITATION_MESSAGES } from './messages/invitation-messages.js';
import { BIRTHDAY_GREETINGS } from './messages/birthday-greetings.js';

export const DEFAULT_CONFIG = {
  vk: {
    token: '',
  },
  features: {
    onlineStatus: true,
    acceptFriendRequests: true,
    deleteDeactivatedFriends: true,
    deleteOutgoingFriendRequests: true,
    sendInvitationPosts: true,
    sendBirthdayCongratulations: true,
  },
  intervals: {
    onlineStatusMinutes: 14,
    acceptFriendRequestsMinutes: 20,
    deleteDeactivatedFriendsMinutes: 30,
    deleteOutgoingFriendRequestsMinutes: 8,
    sendInvitationPostsMinutes: 9,
    sendBirthdayCongratulationsHours: 23,
  },
  limits: {
    maxFriends: 10000,
    topPercentMutuals: 10,
    maxFriendRequestsPerRun: 23,
    maxOutgoingDeletionsPerRun: 20,
  },
  priorityFriendIds: [],
  invitationPost: {
    text: INVITATION_MESSAGES[0],
    messages: [...INVITATION_MESSAGES],
    communities: [],
  },
  birthdayGreetings: [...BIRTHDAY_GREETINGS],
};

function normalizeList(value, { numeric = false } = {}) {
  let items;
  if (Array.isArray(value)) {
    items = value;
  } else if (value === undefined || value === null) {
    items = [];
  } else if (typeof value === 'object') {
    items = [];
  } else {
    items = [value];
  }

  if (numeric) {
    return items
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  return items
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

export function normalizeConfigLists(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }
  const out = { ...config };
  if ('priorityFriendIds' in out) {
    out.priorityFriendIds = normalizeList(out.priorityFriendIds, {
      numeric: true,
    });
  }
  if (
    out.invitationPost &&
    typeof out.invitationPost === 'object' &&
    !Array.isArray(out.invitationPost)
  ) {
    out.invitationPost = { ...out.invitationPost };
    if ('messages' in out.invitationPost) {
      out.invitationPost.messages = normalizeList(out.invitationPost.messages);
    }
    if ('communities' in out.invitationPost) {
      out.invitationPost.communities = normalizeList(
        out.invitationPost.communities,
        { numeric: true }
      );
    }
  }
  if ('birthdayGreetings' in out) {
    out.birthdayGreetings = normalizeList(out.birthdayGreetings);
  }
  return out;
}

/**
 * Friends are merged from layered config so the user can edit either the
 * global file or a project-local override.
 */
export function mergeWithDefaults(overlay) {
  const result = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const normalizedOverlay = normalizeConfigLists(overlay);
  if (!normalizedOverlay || typeof normalizedOverlay !== 'object') {
    return result;
  }
  for (const [section, value] of Object.entries(normalizedOverlay)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[section] &&
      typeof result[section] === 'object' &&
      !Array.isArray(result[section])
    ) {
      result[section] = { ...result[section], ...value };
    } else {
      result[section] = value;
    }
  }
  return result;
}
