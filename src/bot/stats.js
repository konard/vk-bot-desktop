/**
 * Tracks accepted friend events. Persisted as Links Notation under a `stats`
 * directory inside the LinoStore root:
 *
 *   stats/
 *     total.lino                 -- lifetime totals + initialFriendsCount
 *     2026-05/
 *       month.lino               -- counters for that calendar month
 *       week-19.lino             -- ISO-week counters inside the month
 *
 * Each accepted friend event updates exactly three files: total, current
 * month, and current week. The directory layout means historical data is
 * written once and never rewritten by later events.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const TWO_DIGIT = (n) => String(n).padStart(2, '0');

export function isoWeek(date) {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}

export function pathsForDate(rootDir, date) {
  const year = date.getFullYear();
  const month = TWO_DIGIT(date.getMonth() + 1);
  const week = TWO_DIGIT(isoWeek(date));
  const monthDir = path.join(rootDir, `${year}-${month}`);
  return {
    total: path.join(rootDir, 'total.lino'),
    monthDir,
    month: path.join(monthDir, 'month.lino'),
    week: path.join(monthDir, `week-${week}.lino`),
  };
}

async function readFileOrEmpty(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function parse(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const [key, ...rest] = line.split(/\s+/);
    const value = rest.join(' ');
    const numeric = Number(value);
    out[key] = Number.isFinite(numeric) && value !== '' ? numeric : value;
  }
  return out;
}

function format(record) {
  return `${Object.entries(record)
    .map(([k, v]) => `${k} ${v}`)
    .join('\n')}\n`;
}

async function bumpFile(filePath, fields) {
  const current = parse(await readFileOrEmpty(filePath));
  for (const [key, delta] of Object.entries(fields)) {
    if (typeof delta === 'number') {
      current[key] = (Number(current[key]) || 0) + delta;
    } else {
      current[key] = delta;
    }
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, format(current), 'utf8');
  return current;
}

export class StatsStore {
  constructor({ rootDir, now = () => new Date() } = {}) {
    if (!rootDir) {
      throw new Error('StatsStore requires a rootDir');
    }
    this.rootDir = rootDir;
    this.now = now;
  }

  pathsNow() {
    return pathsForDate(this.rootDir, this.now());
  }

  async readTotal() {
    return parse(await readFileOrEmpty(this.pathsNow().total));
  }

  async readCurrentWeek() {
    return parse(await readFileOrEmpty(this.pathsNow().week));
  }

  async readCurrentMonth() {
    return parse(await readFileOrEmpty(this.pathsNow().month));
  }

  async setInitialFriendsCount(count) {
    const { total } = this.pathsNow();
    const current = parse(await readFileOrEmpty(total));
    if (current.initialFriendsCount === undefined) {
      current.initialFriendsCount = count;
      await fs.mkdir(path.dirname(total), { recursive: true });
      await fs.writeFile(total, format(current), 'utf8');
    }
    return current;
  }

  async recordAccepted({ count = 1, incomingRequestsSeen = 0 } = {}) {
    const paths = this.pathsNow();
    const fields = {
      acceptedFriends: count,
      incomingRequestsSeen,
    };
    const total = await bumpFile(paths.total, fields);
    const month = await bumpFile(paths.month, fields);
    const week = await bumpFile(paths.week, fields);
    return { total, month, week };
  }

  async snapshot() {
    return {
      total: await this.readTotal(),
      month: await this.readCurrentMonth(),
      week: await this.readCurrentWeek(),
    };
  }
}

export function statsRootFor(store) {
  return path.join(store.dir('global'), 'stats');
}
