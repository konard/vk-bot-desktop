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
import { parseVkIdList } from './list-values.js';

/**
 * 16 community IDs hardcoded in upstream konard/vk-bot's
 * `triggers/send-invitation-posts-for-friends.js`. Used by the UI to
 * prefill `invitationPost.communities` on first successful token connect.
 */
export const UPSTREAM_INVITATION_COMMUNITIES = [
  64758790, 34985835, 24261502, 53294903, 33764742, 8337923, 94946045,
  194360448, 39130136, 198580397, 195285978, 47350356, 61413825, 30345825,
  180442247, 214787806,
];

export const DEFAULT_CONFIG = {
  vk: {
    token: '',
  },
  verbose: true,
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

function coerceToItems(value) {
  if (Array.isArray(value)) {
    return { items: value };
  }
  if (value === undefined || value === null) {
    return { items: [] };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'object') {
    return { items: [] };
  }
  return { items: [value] };
}

function dedupeNumericIds(items, expect) {
  const out = [];
  const seen = new Set();
  const push = (id) => {
    const key = `${id}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push(id);
  };
  for (const item of items) {
    if (typeof item === 'number' && Number.isFinite(item) && item !== 0) {
      push(item);
      continue;
    }
    const text = String(item ?? '').trim();
    if (!text) {
      continue;
    }
    const { ids } = parseVkIdList(text, { expect });
    for (const id of ids) {
      push(id);
    }
  }
  return out;
}

function normalizeStringList(value, items) {
  if (typeof value === 'string') {
    return value
      .split(/[\r\n]+/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  return items
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function normalizeList(value, { numeric = false, expect = 'user' } = {}) {
  const { items, stringValue } = coerceToItems(value);
  if (numeric) {
    if (stringValue !== undefined) {
      return parseVkIdList(stringValue, { expect }).ids;
    }
    return dedupeNumericIds(items, expect);
  }
  return normalizeStringList(stringValue, items ?? []);
}

export function normalizeConfigLists(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }
  const out = { ...config };
  if ('priorityFriendIds' in out) {
    out.priorityFriendIds = normalizeList(out.priorityFriendIds, {
      numeric: true,
      expect: 'user',
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
        { numeric: true, expect: 'community' }
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
