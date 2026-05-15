/**
 * Global VK API throttle.
 *
 * Issue #55 requires a randomized minimum gap between every outgoing VK
 * API request to lower the probability of hitting VK rate limits (which
 * surface as captchas, error code 29, 10, 14, 219, 210, 15…). The gap
 * is keyed off the next request's kind:
 *
 *   - read  → 3000–7000 ms
 *   - write → 6000–13000 ms
 *
 * Pacing is enforced via a single shared Promise chain so calls made
 * from different triggers serialise correctly. The chain stores the
 * timestamp at which the previous call finished and waits at least the
 * randomised delay before letting the next call start.
 *
 * Method classification is heuristic but reliable for the VK API surface
 * we use: any method whose local name begins with `get`, `search`, `is`,
 * `are`, or `look` is a read; everything else is treated as a write so
 * we err on the side of the longer delay.
 */

const READ_RANGE = Object.freeze({ min: 3000, max: 7000 });
const WRITE_RANGE = Object.freeze({ min: 6000, max: 13000 });

const READ_PREFIXES = /^(get|search|is|are|look)/i;

export function classifyMethod(method) {
  if (typeof method !== 'string' || method.length === 0) {
    return 'write';
  }
  const localName = method.includes('.') ? method.split('.').pop() : method;
  return READ_PREFIXES.test(localName) ? 'read' : 'write';
}

export function pickDelay(range, random = Math.random) {
  const span = range.max - range.min;
  return Math.floor(range.min + random() * span);
}

export function createThrottle({
  random = Math.random,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
  readRange = READ_RANGE,
  writeRange = WRITE_RANGE,
} = {}) {
  let chain = Promise.resolve();
  let lastEndedAt = null;
  return {
    async throttle(method, fn) {
      const kind = classifyMethod(method);
      const range = kind === 'read' ? readRange : writeRange;
      // Reserve a slot in the global chain so concurrent callers serialise.
      // The slot covers both the inter-call wait AND the fn execution; the
      // next caller cannot inspect lastEndedAt until we've updated it.
      let releaseSlot;
      const slotComplete = new Promise((resolve) => {
        releaseSlot = resolve;
      });
      const previous = chain;
      chain = slotComplete;
      try {
        try {
          await previous;
        } catch {
          // Upstream errors don't block the next caller's pacing barrier.
        }
        if (lastEndedAt !== null) {
          const delay = pickDelay(range, random);
          const elapsed = now() - lastEndedAt;
          const wait = Math.max(0, delay - elapsed);
          if (wait > 0) {
            await sleep(wait);
          }
        }
        try {
          return await fn();
        } finally {
          lastEndedAt = now();
        }
      } finally {
        releaseSlot();
      }
    },
    reset() {
      chain = Promise.resolve();
      lastEndedAt = null;
    },
  };
}

let globalThrottle = createThrottle();

export function getGlobalThrottle() {
  return globalThrottle;
}

export function setGlobalThrottle(custom) {
  globalThrottle = custom;
}

export function resetGlobalThrottle() {
  globalThrottle = createThrottle();
}

export const READ_DELAY_RANGE_MS = READ_RANGE;
export const WRITE_DELAY_RANGE_MS = WRITE_RANGE;
