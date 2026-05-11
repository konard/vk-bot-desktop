/**
 * Verbose logger with secret redaction.
 *
 * Goals:
 * - Redact tokens, passwords, and other secrets before any value reaches
 *   stdout, stderr, files, or IPC.
 * - Provide deterministic output suitable for inclusion in user bug reports.
 *
 * Levels: 'debug' | 'info' | 'warn' | 'error'.
 *
 * Verbose mode (the default for now, see issue #32) prints every level,
 * including 'debug', so users can attach a full session log to their bug
 * reports without re-running the bot. Set `VK_BOT_DESKTOP_VERBOSE=0` (or
 * call `setVerbose(false)`) to suppress 'debug' lines.
 *
 * Redaction rules (applied in order):
 *
 * 1. Strings that look like a VK access token (long base64-ish run of >= 40
 *    characters using only [a-z0-9_-]) are replaced with their first six and
 *    last two characters joined by "***".
 * 2. Substrings matching `access_token=...`, `password=...`, or
 *    `api_key=...` (any URL or query-string style separator) keep their key
 *    name but the value is replaced with "***".
 * 3. When given an object, properties whose name (case-insensitive) is one of
 *    `token`, `accessToken`, `access_token`, `password`, `secret`,
 *    `apiKey`, `api_key`, `auth`, `authorization`, `privateKey`,
 *    `privatekey`, `cookie`, `cookies` are masked with "***" recursively.
 *
 * The logger never throws; if redaction encounters a value it cannot inspect
 * (e.g. a circular object), it falls back to the safe string "[unserializable]".
 */

const SECRET_KEY_NAMES = new Set([
  'token',
  'accesstoken',
  'access_token',
  'password',
  'pass',
  'secret',
  'apikey',
  'api_key',
  'auth',
  'authorization',
  'privatekey',
  'private_key',
  'cookie',
  'cookies',
]);

const TOKEN_LIKE = /\b[A-Za-z0-9_-]{40,}\b/g;
const QUERY_SECRET =
  /(access_token|password|api_key|token|secret)=([^&\s"']+)/gi;

const MASK = '***';

function maskTokenLike(input) {
  if (typeof input !== 'string') {
    return input;
  }
  let out = input.replace(QUERY_SECRET, (_, key) => `${key}=${MASK}`);
  out = out.replace(TOKEN_LIKE, (match) => {
    if (match.length < 12) {
      return match;
    }
    return `${match.slice(0, 6)}${MASK}${match.slice(-2)}`;
  });
  return out;
}

export function redact(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return maskTokenLike(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskTokenLike(value.message),
      stack: value.stack ? maskTokenLike(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[circular]';
    }
    seen.add(value);
    try {
      const out = {};
      for (const [key, raw] of Object.entries(value)) {
        if (SECRET_KEY_NAMES.has(key.toLowerCase())) {
          out[key] = MASK;
          continue;
        }
        out[key] = redact(raw, seen);
      }
      return out;
    } catch {
      return '[unserializable]';
    }
  }
  return String(value);
}

function format(level, args) {
  const stamp = new Date().toISOString();
  const safe = args.map((value) => {
    const r = redact(value);
    if (typeof r === 'string') {
      return r;
    }
    try {
      return JSON.stringify(r, null, 2);
    } catch {
      return '[unserializable]';
    }
  });
  return `${stamp} [${level}] ${safe.join(' ')}`;
}

const sinks = [
  (line, level) => {
    const stream = level === 'error' || level === 'warn' ? 'stderr' : 'stdout';
    process[stream].write(`${line}\n`);
  },
];

export function addSink(sink) {
  sinks.push(sink);
}

export function removeSink(sink) {
  const idx = sinks.indexOf(sink);
  if (idx !== -1) {
    sinks.splice(idx, 1);
  }
}

export function clearSinks() {
  sinks.length = 0;
}

// Verbose by default — see issue #32. Toggle with VK_BOT_DESKTOP_VERBOSE
// (anything other than "0" / "false" / "" stays verbose).
// The env read is wrapped in try/catch so the module still loads under
// runtimes that gate env access behind explicit permissions (e.g. Deno
// without `--allow-env`), in which case we fall back to the default.
let verbose = (() => {
  let raw = null;
  try {
    if (typeof process !== 'undefined') {
      raw = process.env?.VK_BOT_DESKTOP_VERBOSE ?? null;
    }
  } catch {
    raw = null;
  }
  if (raw === undefined || raw === null || raw === '') {
    return true;
  }
  return raw !== '0' && raw.toLowerCase() !== 'false';
})();

export function setVerbose(value) {
  verbose = Boolean(value);
}

export function isVerbose() {
  return verbose;
}

function emit(level, args) {
  if (level === 'debug' && !verbose) {
    return;
  }
  const line = format(level, args);
  for (const sink of sinks) {
    try {
      sink(line, level);
    } catch {
      // Sinks must never break the bot. Swallow.
    }
  }
}

export const logger = {
  debug: (...args) => emit('debug', args),
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args),
};

export default logger;
