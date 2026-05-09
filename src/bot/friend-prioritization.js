/**
 * Friend-request prioritization.
 *
 * The issue specifies two regimes for accepting friend requests:
 *
 * - Below the friend limit (10000): accept the top 10% of pending requests
 *   by mutual-friend count.
 * - At or above the friend limit: only accept requests from people with whom
 *   we share the most mutual friends.
 *
 * `selectIncomingRequests` encapsulates that logic in a pure function so it
 * is easy to test without hitting the VK API. It expects a list of incoming
 * requests, each shaped as `{ userId, mutualCount }`, plus the current
 * friend count.
 */

export const DEFAULT_LIMITS = {
  maxFriends: 10000,
  topPercentMutuals: 10,
  maxRequestsPerRun: 23,
};

function compareByMutualsDesc(a, b) {
  const da = (b.mutualCount ?? 0) - (a.mutualCount ?? 0);
  if (da !== 0) {
    return da;
  }
  return (a.userId ?? 0) - (b.userId ?? 0);
}

export function selectIncomingRequests({
  requests = [],
  currentFriendCount = 0,
  limits = DEFAULT_LIMITS,
} = {}) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return [];
  }

  const sorted = [...requests].sort(compareByMutualsDesc);
  const remainingCapacity = Math.max(
    0,
    (limits.maxFriends ?? DEFAULT_LIMITS.maxFriends) - currentFriendCount
  );
  const cap = Math.min(
    remainingCapacity,
    limits.maxRequestsPerRun ?? DEFAULT_LIMITS.maxRequestsPerRun
  );

  if (cap <= 0) {
    return [];
  }

  const aboveLimit =
    currentFriendCount >= (limits.maxFriends ?? DEFAULT_LIMITS.maxFriends);

  if (aboveLimit) {
    // Above the limit we only accept the very top requests by mutuals,
    // because at this point we cannot grow the friend list — only curate
    // it through cleanup.
    return sorted.filter((r) => (r.mutualCount ?? 0) > 0).slice(0, cap);
  }

  // Below the limit: keep the top X% of all requests, but never more than
  // the per-run cap and never more than the remaining capacity.
  const percent =
    (limits.topPercentMutuals ?? DEFAULT_LIMITS.topPercentMutuals) / 100;
  const topCount = Math.max(1, Math.ceil(sorted.length * percent));
  return sorted.slice(0, Math.min(topCount, cap));
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
  const friendsSet = new Set(currentFriendIds);
  const out = [];
  for (const id of priorityFriendIds) {
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
  const protectedSet = new Set(priorityFriendIds);
  return friends.filter(
    (f) =>
      f.deactivated &&
      deactivatedValues.includes(f.deactivated) &&
      !protectedSet.has(f.id)
  );
}
