export function asList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || typeof value === 'object') {
    return [];
  }
  return [value];
}

const SEPARATOR_REGEX = /[\s,;]+/u;
const VK_LINK_REGEX =
  /^(?:https?:\/\/)?(?:m\.|www\.)?(?:vk\.com|vk\.ru|vkontakte\.ru)\/(.+?)\/?$/iu;

/**
 * Split free-form text into individual tokens. Accepts commas, semicolons,
 * any whitespace (including newlines) as separators. Returns trimmed,
 * non-empty tokens in input order.
 */
export function splitListTokens(value) {
  return String(value ?? '')
    .split(SEPARATOR_REGEX)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Parse a single token into a normalized descriptor.
 *
 * Returns one of:
 *   - { id: number, isGroup: boolean, raw: string }     for numeric IDs
 *     ("123", "-123", "id123", "club123", "public123", "event123")
 *   - { screenName: string, raw: string }               for screen names
 *     and VK links whose path is not numeric (e.g. "vk.com/durov")
 *   - null                                              if the token is not
 *     parseable as either of the above.
 *
 * `expect` controls how a bare numeric is interpreted:
 *   - 'user'      → negative numbers are treated as community IDs (sign
 *                   stripped, isGroup=true), positive numbers stay as users.
 *   - 'community' → positive numbers are treated as community IDs.
 *
 * This is deliberately permissive: anything that looks like a VK reference
 * is accepted. Resolution of screen names to numeric IDs is the caller's
 * responsibility (done lazily so this helper stays pure).
 */
function extractBody(raw) {
  const linkMatch = raw.match(VK_LINK_REGEX);
  let body = linkMatch ? linkMatch[1].split(/[?#]/u, 1)[0] : raw;
  body = body.replace(/^@/, '').trim();
  return body;
}

function parseNumericToken(body, expect, raw) {
  const numericMatch = body.match(/^(-?\d+)$/u);
  if (!numericMatch) {
    return undefined;
  }
  const value = Number(numericMatch[1]);
  if (!Number.isFinite(value) || value === 0) {
    return null;
  }
  if (expect === 'community' || value < 0) {
    return { id: Math.abs(value), isGroup: true, raw };
  }
  return { id: value, isGroup: false, raw };
}

function parsePrefixedToken(body, raw) {
  const prefixed = body.match(/^(id|club|public|event)(\d+)$/iu);
  if (!prefixed) {
    return undefined;
  }
  const value = Number(prefixed[2]);
  if (!Number.isFinite(value) || value === 0) {
    return null;
  }
  return {
    id: value,
    isGroup: prefixed[1].toLowerCase() !== 'id',
    raw,
  };
}

export function parseVkReference(token, { expect = 'user' } = {}) {
  const raw = String(token ?? '').trim();
  if (!raw) {
    return null;
  }
  const body = extractBody(raw);
  if (!body) {
    return null;
  }

  const numeric = parseNumericToken(body, expect, raw);
  if (numeric !== undefined) {
    return numeric;
  }

  const prefixed = parsePrefixedToken(body, raw);
  if (prefixed !== undefined) {
    return prefixed;
  }

  if (/^[A-Za-z0-9_.]{1,64}$/u.test(body)) {
    return { screenName: body.toLowerCase(), raw };
  }

  return null;
}

/**
 * Parse a free-form list of IDs and VK links. Pass `expect: 'community'`
 * when the list is a list of communities (so bare numbers are treated as
 * community IDs); leave the default for user-friend lists.
 *
 * Returns a deduplicated array of { id?, isGroup?, screenName?, raw }
 * descriptors in input order.
 */
export function parseVkReferenceList(value, { expect = 'user' } = {}) {
  const seen = new Set();
  const out = [];
  for (const token of splitListTokens(value)) {
    const ref = parseVkReference(token, { expect });
    if (!ref) {
      continue;
    }
    const key = ref.screenName
      ? `name:${ref.screenName}`
      : `id:${ref.isGroup ? '-' : ''}${ref.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(ref);
  }
  return out;
}

/**
 * Convenience: parse a list and return only the numeric IDs that could be
 * resolved without a network round-trip. Useful for the bot configuration
 * where screen names are not yet supported by the runtime — we keep raw
 * tokens around in `unresolvedTokens` so the UI / caller can warn.
 */
export function parseVkIdList(value, { expect = 'user' } = {}) {
  const refs = parseVkReferenceList(value, { expect });
  const ids = [];
  const unresolved = [];
  for (const ref of refs) {
    if (typeof ref.id === 'number' && Number.isFinite(ref.id)) {
      if (expect === 'community') {
        ids.push(ref.id);
      } else if (ref.isGroup) {
        ids.push(-ref.id);
      } else {
        ids.push(ref.id);
      }
    } else if (ref.screenName) {
      unresolved.push(ref.raw);
    }
  }
  return { ids, unresolvedTokens: unresolved };
}
