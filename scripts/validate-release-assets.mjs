#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expectedDesktopReleaseAssetNames,
  releaseVersionFromTag,
} from './check-release-needed.mjs';

function parseArgs(args) {
  const options = {
    dist: 'dist',
    tag: '',
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === '--dist') {
      options.dist = args[++index] ?? '';
    } else if (arg === '--tag') {
      options.tag = args[++index] ?? '';
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node scripts/validate-release-assets.mjs --dist dist --tag v0.9.10',
    '',
    'Validates that dist contains all desktop release assets for the release tag.',
  ].join('\n');
}

function listDistAssetNames(dist) {
  return readdirSync(dist, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

export function validateReleaseAssets({ assetNames, tag }) {
  const version = releaseVersionFromTag(tag);

  if (!version) {
    throw new Error(`Release tag must include a semantic version. Got: ${tag}`);
  }

  const available = new Set(assetNames);
  const expected = expectedDesktopReleaseAssetNames(version);
  const missing = expected.filter((assetName) => !available.has(assetName));

  return {
    expected,
    missing,
    version,
  };
}

export function formatMissingReleaseAssetErrors(missing, dist = 'dist') {
  return missing.map(
    (assetName) =>
      `::error file=${dist}/${assetName}::Required versioned release asset is missing.`
  );
}

export function main({
  argv = process.argv.slice(2),
  stderr = console.error,
  stdout = console.log,
} = {}) {
  try {
    const options = parseArgs(argv);

    if (options.help) {
      stdout(usage());
      return 0;
    }

    if (!options.dist) {
      throw new Error('--dist is required');
    }

    if (!options.tag) {
      throw new Error('--tag is required');
    }

    const assetNames = listDistAssetNames(options.dist);
    const result = validateReleaseAssets({
      assetNames,
      tag: options.tag,
    });

    stdout(`Validating desktop release assets for ${options.tag}`);
    stdout(`Expected version: ${result.version}`);
    stdout(`Found ${assetNames.length} file(s) in ${options.dist}`);

    if (result.missing.length > 0) {
      for (const line of formatMissingReleaseAssetErrors(
        result.missing,
        options.dist
      )) {
        stderr(line);
      }

      stderr('');
      stderr('Found assets:');
      for (const assetName of assetNames) {
        stderr(`  ${assetName}`);
      }

      return 1;
    }

    stdout('All required desktop release assets are present.');
    return 0;
  } catch (error) {
    stderr(`Error validating release assets: ${error.message}`);
    return 1;
  }
}

function isCliEntryPoint() {
  return (
    typeof process !== 'undefined' &&
    process.argv?.[1] &&
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  );
}

if (isCliEntryPoint()) {
  process.exitCode = main();
}
