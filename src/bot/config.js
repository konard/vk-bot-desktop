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

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeArray(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null) {
    return [];
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return [];
    }
    if (entries.every(([, child]) => isPlainObject(child))) {
      return entries.map(([key]) => key);
    }
  }
  return [value];
}

function mergeValue(defaultValue, overlayValue) {
  if (Array.isArray(defaultValue)) {
    return normalizeArray(overlayValue, [...defaultValue]);
  }
  if (isPlainObject(defaultValue)) {
    const merged = {};
    const keys = new Set([
      ...Object.keys(defaultValue),
      ...Object.keys(isPlainObject(overlayValue) ? overlayValue : {}),
    ]);
    for (const key of keys) {
      merged[key] = mergeValue(defaultValue[key], overlayValue?.[key]);
    }
    return merged;
  }
  return overlayValue === undefined ? defaultValue : overlayValue;
}

/**
 * Friends are merged from layered config so the user can edit either the
 * global file or a project-local override.
 */
export function mergeWithDefaults(overlay) {
  if (!overlay || typeof overlay !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  return mergeValue(DEFAULT_CONFIG, overlay);
}
