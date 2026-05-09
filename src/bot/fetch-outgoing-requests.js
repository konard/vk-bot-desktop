/**
 * Helper that fetches the current outgoing friend requests so the UI can
 * pre-fill the priority friends list. Caller passes a vk-io instance.
 */
export async function fetchOutgoingRequestIds({ vk } = {}) {
  if (!vk?.api?.friends?.getRequests) {
    return [];
  }
  const response = await vk.api.friends.getRequests({
    count: 1000,
    out: 1,
    need_viewed: 1,
  });
  return Array.isArray(response?.items) ? response.items : [];
}
