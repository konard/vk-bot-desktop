/**
 * Persistent state, configuration, and cache encoded as Links Notation.
 *
 * The issue requires:
 * - Layered configuration (local dev folder overrides global app folder).
 * - Cache stored in the application folder.
 * - Human-readable indented Links Notation, no JSON, no type markers.
 *
 * We delegate format work to `lino-objects-codec`'s `formatIndented` /
 * `parseIndented` helpers. They are loaded lazily so unit tests can run
 * without the dependency installed.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import logger from './bot/logger.js';

const DEFAULT_GLOBAL_DIR =
  process.env.VK_BOT_DESKTOP_GLOBAL_DIR ||
  path.join(os.homedir(), '.vk-bot-desktop');
const DEFAULT_LOCAL_DIR =
  process.env.VK_BOT_DESKTOP_LOCAL_DIR ||
  path.join(process.cwd(), '.vk-bot-desktop');

let codec;

async function loadCodec() {
  if (codec) {
    return codec;
  }
  try {
    codec = await import('lino-objects-codec');
  } catch (error) {
    logger.warn(
      'lino-objects-codec is not installed; falling back to inline indented codec.',
      { error: String(error) }
    );
    codec = inlineFallbackCodec();
  }
  return codec;
}

/**
 * Minimal inline implementation of `formatIndented` / `parseIndented` used as
 * a fallback when the upstream package is unavailable. The format mirrors the
 * one documented in `lino-objects-codec`:
 *
 *   key
 *     childKey "value"
 *     childKey 42
 *
 * Strings containing whitespace, quotes, or special characters are written in
 * double quotes with `""` escaping for embedded `"`.
 */
function inlineFallbackCodec() {
  function escape(value) {
    if (value === null || value === undefined) {
      return '""';
    }
    const str = String(value);
    if (/^[A-Za-z0-9_./:-]+$/.test(str)) {
      return str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  function unescape(token) {
    if (
      token.length >= 2 &&
      token.startsWith('"') &&
      token.endsWith('"')
    ) {
      return token.slice(1, -1).replace(/""/g, '"');
    }
    if (token === 'true') {
      return true;
    }
    if (token === 'false') {
      return false;
    }
    if (token === 'null') {
      return null;
    }
    if (token === '') {
      return '';
    }
    if (/^-?\d+$/.test(token)) {
      return Number(token);
    }
    if (/^-?\d*\.\d+$/.test(token)) {
      return Number(token);
    }
    return token;
  }

  function formatIndented({ value, indent = 0 } = {}) {
    const pad = '  '.repeat(indent);
    if (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return `${pad}${escape(value)}\n`;
    }
    if (Array.isArray(value)) {
      let out = '';
      for (const item of value) {
        out += formatIndented({ value: item, indent });
      }
      return out;
    }
    let out = '';
    for (const [key, raw] of Object.entries(value)) {
      if (
        raw !== null &&
        raw !== undefined &&
        typeof raw === 'object' &&
        !Array.isArray(raw)
      ) {
        out += `${pad}${escape(key)}\n`;
        out += formatIndented({ value: raw, indent: indent + 1 });
      } else if (Array.isArray(raw)) {
        const isScalarArray = raw.every(
          (item) =>
            item === null ||
            item === undefined ||
            typeof item === 'string' ||
            typeof item === 'number' ||
            typeof item === 'boolean'
        );
        if (isScalarArray && raw.length > 0) {
          out += `${pad}${escape(key)} ${raw.map(escape).join(' ')}\n`;
        } else {
          out += `${pad}${escape(key)}\n`;
          for (const item of raw) {
            out += formatIndented({ value: item, indent: indent + 1 });
          }
        }
      } else {
        out += `${pad}${escape(key)} ${escape(raw)}\n`;
      }
    }
    return out;
  }

  function tokenize(line) {
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === ' ' || ch === '\t') {
        i += 1;
        continue;
      }
      if (ch === '"') {
        let end = i + 1;
        while (end < line.length) {
          if (line[end] === '"' && line[end + 1] === '"') {
            end += 2;
            continue;
          }
          if (line[end] === '"') {
            break;
          }
          end += 1;
        }
        tokens.push(line.slice(i, end + 1));
        i = end + 1;
      } else {
        let end = i;
        while (end < line.length && line[end] !== ' ' && line[end] !== '\t') {
          end += 1;
        }
        tokens.push(line.slice(i, end));
        i = end;
      }
    }
    return tokens;
  }

  function parseIndented({ text } = {}) {
    const lines = text.split(/\r?\n/);
    const root = {};
    const stack = [{ indent: -1, container: root }];
    for (const rawLine of lines) {
      if (!rawLine.trim()) {
        continue;
      }
      const indent = rawLine.match(/^ */)[0].length / 2;
      const tokens = tokenize(rawLine);
      while (stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].container;
      if (tokens.length === 1) {
        const key = unescape(tokens[0]);
        const child = {};
        parent[key] = child;
        stack.push({ indent, container: child });
      } else {
        const [keyToken, ...valueTokens] = tokens;
        const key = unescape(keyToken);
        if (valueTokens.length === 1) {
          parent[key] = unescape(valueTokens[0]);
        } else {
          parent[key] = valueTokens.map(unescape);
        }
      }
    }
    return root;
  }

  return { formatIndented, parseIndented };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function deepMerge(base, overlay) {
  if (
    overlay === null ||
    overlay === undefined ||
    typeof overlay !== 'object' ||
    Array.isArray(overlay)
  ) {
    return overlay === undefined ? base : overlay;
  }
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  for (const [key, value] of Object.entries(overlay)) {
    out[key] = deepMerge(out[key], value);
  }
  return out;
}

export class LinoStore {
  constructor({
    globalDir = DEFAULT_GLOBAL_DIR,
    localDir = DEFAULT_LOCAL_DIR,
  } = {}) {
    this.globalDir = globalDir;
    this.localDir = localDir;
  }

  configPath(scope = 'global') {
    return path.join(this.dir(scope), 'config.lino');
  }

  cachePath(name, scope = 'global') {
    return path.join(this.dir(scope), 'cache', `${name}.lino`);
  }

  statePath(scope = 'global') {
    return path.join(this.dir(scope), 'state.lino');
  }

  dir(scope = 'global') {
    return scope === 'local' ? this.localDir : this.globalDir;
  }

  async loadLayered() {
    const { parseIndented } = await loadCodec();
    const result = {};
    for (const scope of ['global', 'local']) {
      const filePath = this.configPath(scope);
      const text = await readIfExists(filePath);
      if (!text) {
        continue;
      }
      try {
        const parsed = parseIndented({ text });
        Object.assign(result, deepMerge(result, parsed));
      } catch (error) {
        logger.warn('Failed to parse config', { scope, filePath, error });
      }
    }
    return result;
  }

  async saveConfig(value, scope = 'global') {
    const { formatIndented } = await loadCodec();
    const target = this.configPath(scope);
    await ensureDir(path.dirname(target));
    const text = formatIndented({ value });
    await fs.writeFile(target, text, 'utf8');
    return target;
  }

  async writeCache(name, value, scope = 'global') {
    const { formatIndented } = await loadCodec();
    const target = this.cachePath(name, scope);
    await ensureDir(path.dirname(target));
    const text = formatIndented({ value });
    await fs.writeFile(target, text, 'utf8');
    return target;
  }

  async readCache(name, scope = 'global') {
    const { parseIndented } = await loadCodec();
    const target = this.cachePath(name, scope);
    const text = await readIfExists(target);
    if (!text) {
      return null;
    }
    return parseIndented({ text });
  }

  async writeState(value, scope = 'global') {
    const { formatIndented } = await loadCodec();
    const target = this.statePath(scope);
    await ensureDir(path.dirname(target));
    const text = formatIndented({ value });
    await fs.writeFile(target, text, 'utf8');
    return target;
  }

  async readState(scope = 'global') {
    const { parseIndented } = await loadCodec();
    const target = this.statePath(scope);
    const text = await readIfExists(target);
    if (!text) {
      return null;
    }
    return parseIndented({ text });
  }
}

export const defaultStore = new LinoStore();
