/**
 * Persists a copy of every bot session's log to the application directory.
 *
 * Per issue #32: while we still don't know why VK occasionally returns
 * "Unknown method passed" for account.setOnline, we need full session logs
 * on disk so the next bug report can be diagnosed from raw evidence rather
 * than guesses. Each session writes to a unique file named after the start
 * timestamp and the runner PID; old files are kept until the user cleans
 * them up manually.
 */

import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { addSink, removeSink } from './logger.js';

function defaultLogsDir() {
  const base =
    process.env.VK_BOT_DESKTOP_GLOBAL_DIR ||
    path.join(os.homedir(), '.vk-bot-desktop');
  return path.join(base, 'logs');
}

function sessionFileName({ now = new Date(), pid = process.pid } = {}) {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${stamp}-${pid}.log`;
}

export async function openSessionLog({ dir, now, pid } = {}) {
  const logsDir = dir ?? defaultLogsDir();
  await fs.mkdir(logsDir, { recursive: true });
  const filePath = path.join(logsDir, sessionFileName({ now, pid }));
  const stream = createWriteStream(filePath, { flags: 'a' });
  const sink = (line) => {
    stream.write(`${line}\n`);
  };
  addSink(sink);
  return {
    filePath,
    async close() {
      removeSink(sink);
      await new Promise((resolve) => stream.end(resolve));
    },
  };
}
