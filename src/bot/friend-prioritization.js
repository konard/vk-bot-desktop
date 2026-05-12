/**
 * Friend-request prioritization.
 *
 * Acceptance is rate-limited to 10% of every incoming request the bot has
 * ever observed. With totalAcceptedEver and totalIncomingSeen tracked in the
 * stats store, each run accepts at most:
 *
 *   floor(totalIncomingSeen * 0.10) - totalAcceptedEver
 *
 * Plus, we never exceed maxFriends (10 000). When at the friend cap, we only
 * accept requests from users with whom we share at least one mutual friend.
 */

import { asList } from './list-values.js';

export const DEFAULT_LIMITS = {
  maxFriends: 10000,
  topPercentMutuals: 10,
  maxRequestsPerRun: 23,
};

/**
 * Number of incoming requests we are still allowed to accept under the global
 * 10% cap. `totalIncomingSeen` includes the requests already counted in the
 * current run.
 */
export function computePotentialAcceptanceQuota({
  totalIncomingSeen = 0,
  totalAcceptedEver = 0,
  topPercentMutuals = 10,
} = {}) {
  const allowed = Math.floor((totalIncomingSeen * topPercentMutuals) / 100);
  return Math.max(0, allowed - totalAcceptedEver);
}

function compareByMutualsDesc(a, b) {
  const da = (b.mutualCount ?? 0) - (a.mutualCount ?? 0);
  if (da !== 0) {
    return da;
  }
  return (a.userId ?? 0) - (b.userId ?? 0);
}

function readLimits(limits) {
  return {
    maxFriends: limits.maxFriends ?? DEFAULT_LIMITS.maxFriends,
    perRunCap: limits.maxRequestsPerRun ?? DEFAULT_LIMITS.maxRequestsPerRun,
    topPercent: limits.topPercentMutuals ?? DEFAULT_LIMITS.topPercentMutuals,
  };
}

export function selectIncomingRequests({
  requests = [],
  currentFriendCount = 0,
  limits = DEFAULT_LIMITS,
  totalAcceptedEver = 0,
  totalIncomingSeen = 0,
} = {}) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return [];
  }
  const { maxFriends, perRunCap, topPercent } = readLimits(limits);
  const remainingCapacity = Math.max(0, maxFriends - currentFriendCount);
  if (remainingCapacity <= 0) {
    return [];
  }
  const quota = computePotentialAcceptanceQuota({
    totalIncomingSeen: totalIncomingSeen || requests.length,
    totalAcceptedEver,
    topPercentMutuals: topPercent,
  });
  const cap = Math.min(remainingCapacity, perRunCap, quota);
  if (cap <= 0) {
    return [];
  }
  const sorted = [...requests].sort(compareByMutualsDesc);
  if (currentFriendCount >= maxFriends) {
    return sorted.filter((r) => (r.mutualCount ?? 0) > 0).slice(0, cap);
  }
  return sorted.slice(0, cap);
}

/**
 * Returns the priority requests we should send first. Combines a configured
 * priority list with whichever priority IDs are not yet in the friends list.
 */
export function pickPrioritySendList({
  priorityFriendIds = [],
  currentFriendIds = [],
  remainingCapacity = Infinity,
} = {}) {
  const friendsSet = new Set(asList(currentFriendIds));
  const out = [];
  for (const id of asList(priorityFriendIds)) {
    if (out.length >= remainingCapacity) {
      break;
    }
    if (!friendsSet.has(id)) {
      out.push(id);
    }
  }
  return out;
}

/**
 * Returns the deactivated friends that are safe to delete (i.e. not on the
 * priority list).
 */
export function pickDeactivatedToDelete({
  friends = [],
  priorityFriendIds = [],
  deactivatedValues = ['banned', 'deleted'],
} = {}) {
  const protectedSet = new Set(asList(priorityFriendIds));
  return friends.filter(
    (f) =>
      f.deactivated &&
      deactivatedValues.includes(f.deactivated) &&
      !protectedSet.has(f.id)
  );
}
