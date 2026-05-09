#!/usr/bin/env node
/**
 * Entry point for `node src/cli.mjs`. Uses lino-arguments to build a
 * unified configuration from CLI flags, environment variables, and the
 * lenv configuration file.
 *
 * The bot honours the same options that lino-arguments uses upstream:
 *  - --token <vk access token>
 *  - --mode <local|server>
 *  - --config <path to .lenv file>
 *
 * If `lino-arguments` is not installed (e.g. in a test environment) we
 * fall back to a tiny manual parser so the CLI still works.
 */

import path from 'node:path';

import logger from './bot/logger.js';
import { LinoStore } from './lino-store.js';
import { startBot } from './bot/runner.js';
import { mergeWithDefaults } from './bot/config.js';

async function loadCliConfig(argv) {
  try {
    const lino = await import('lino-arguments');
    const config = await lino.makeConfig({
      yargs: ({ yargs, getenv }) =>
        yargs
          .option('token', {
            type: 'string',
            default: getenv('VK_TOKEN', ''),
            describe: 'VK API access token',
          })
          .option('mode', {
            type: 'string',
            default: getenv('VK_BOT_MODE', 'local'),
            describe: 'Run mode: local or server',
          })
          .option('config', {
            type: 'string',
            describe: 'Path to a Links Notation config file',
          }),
      argv,
    });
    return config;
  } catch (error) {
    logger.warn('Falling back to manual CLI parser', { error });
    const config = { token: '', mode: 'local' };
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i];
      if (arg === '--token' && argv[i + 1]) {
        config.token = argv[i + 1];
        i += 1;
      } else if (arg === '--mode' && argv[i + 1]) {
        config.mode = argv[i + 1];
        i += 1;
      } else if (arg === '--config' && argv[i + 1]) {
        config.config = argv[i + 1];
        i += 1;
      }
    }
    return config;
  }
}

export async function runCli(argv = process.argv.slice(2)) {
  const cli = await loadCliConfig(argv);
  const store = new LinoStore({
    localDir: cli.config ? path.dirname(path.resolve(cli.config)) : undefined,
  });
  const file = await store.loadLayered();
  const merged = mergeWithDefaults({
    ...file,
    vk: { ...(file.vk || {}), token: cli.token || file.vk?.token || '' },
  });
  if (!merged.vk.token) {
    throw new Error(
      'VK access token missing. Provide --token, set VK_TOKEN, or write it to config.lino.'
    );
  }
  return startBot({ config: merged });
}

const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('cli.mjs') ||
    process.argv[1].endsWith('cli.js'));

if (isDirectRun) {
  runCli().catch((error) => {
    logger.error('CLI failed', { error });
    process.exit(1);
  });
}
