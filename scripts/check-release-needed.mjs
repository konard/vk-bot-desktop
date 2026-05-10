#!/usr/bin/env node

/**
 * Check if a desktop release is needed based on changesets and GitHub Releases.
 *
 * This repository temporarily distributes only Electron desktop binaries via
 * GitHub Releases. npm is not a release gate while desktop binaries are the
 * only supported distribution channel.
 *
 * The script checks:
 * 1. If there are changeset files to process
 * 2. If the current package version already has a complete GitHub Release
 *
 * This preserves the self-healing behavior from the npm publish workflow: if a
 * version bump landed but the release artifact workflow failed, the next push
 * to main detects the missing or incomplete GitHub Release and retries release
 * creation without requiring another changeset.
 *
 * Usage: node scripts/check-release-needed.mjs [--js-root <path>]
 *
 * Environment variables:
 *   - HAS_CHANGESETS: 'true' if changeset files exist
 *   - GITHUB_REPOSITORY or REPOSITORY: owner/repo for gh release lookup
 *   - TAG_PREFIX: release tag prefix, defaults to "v"
 *
 * Outputs (written to GITHUB_OUTPUT):
 *   - should_release: 'true' if a release should be created
 *   - skip_bump: 'true' if version bump should be skipped
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getJsRoot, parseJsRootConfig } from './js-paths.mjs';
import { readPackageInfo } from './package-info.mjs';

const REQUIRED_RELEASE_ASSET_GROUPS = {
  checksums: [/^SHA256SUMS\.txt$/],
  linux: [
    /^vk-bot-desktop-linux-(x64|arm64)-\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\.(AppImage|deb|tar\.gz)$/,
  ],
  macos: [
    /^vk-bot-desktop-macos-(x64|arm64)-\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\.(dmg|zip)$/,
  ],
  provenance: [/^BUILD-PROVENANCE\.txt$/],
  windows: [
    /^vk-bot-desktop-windows-(installer|portable)-(x64|arm64)-\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\.exe$/,
  ],
};

const RELEASE_ARTIFACTS = [
  ['macos', 'arm64', 'dmg'],
  ['macos', 'x64', 'dmg'],
  ['macos', 'arm64', 'zip'],
  ['macos', 'x64', 'zip'],
  ['linux', 'x64', 'AppImage'],
  ['linux', 'arm64', 'AppImage'],
  ['linux', 'x64', 'deb'],
  ['linux', 'arm64', 'deb'],
  ['linux', 'x64', 'tar.gz'],
  ['linux', 'arm64', 'tar.gz'],
];

const WINDOWS_RELEASE_ARTIFACTS = [
  ['installer', 'x64'],
  ['installer', 'arm64'],
  ['portable', 'x64'],
  ['portable', 'arm64'],
];

/**
 * Build the GitHub Release tag for a package version.
 * @param {string} version
 * @param {string} [tagPrefix]
 * @returns {string}
 */
export function buildReleaseTag(version, tagPrefix = 'v') {
  return `${tagPrefix}${version}`;
}

export function releaseVersionFromTag(tag) {
  const match = String(tag || '').match(
    /(?:^|-)v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/
  );

  return match?.[1];
}

export function expectedDesktopReleaseAssetNames(version) {
  if (!version) {
    return ['SHA256SUMS.txt', 'BUILD-PROVENANCE.txt'];
  }

  return [
    ...RELEASE_ARTIFACTS.map(
      ([platform, arch, extension]) =>
        `vk-bot-desktop-${platform}-${arch}-${version}.${extension}`
    ),
    ...WINDOWS_RELEASE_ARTIFACTS.map(
      ([kind, arch]) => `vk-bot-desktop-windows-${kind}-${arch}-${version}.exe`
    ),
    'SHA256SUMS.txt',
    'BUILD-PROVENANCE.txt',
  ];
}

/**
 * Decide whether the release workflow should run.
 * @param {Object} options
 * @param {boolean} options.hasChangesets
 * @param {boolean} options.releaseComplete
 * @returns {{ shouldRelease: boolean, skipBump: boolean }}
 */
export function getReleaseDecision({ hasChangesets, releaseComplete }) {
  if (hasChangesets) {
    return {
      shouldRelease: true,
      skipBump: false,
    };
  }

  if (releaseComplete) {
    return {
      shouldRelease: false,
      skipBump: false,
    };
  }

  return {
    shouldRelease: true,
    skipBump: true,
  };
}

function getAssetName(asset) {
  if (typeof asset === 'string') {
    return asset;
  }

  return typeof asset?.name === 'string' ? asset.name : '';
}

/**
 * Check whether release assets satisfy the desktop distribution contract.
 * @param {Array<string | { name?: string }>} assets
 * @param {string} [version]
 * @returns {boolean}
 */
export function hasRequiredDesktopReleaseAssets(assets, version) {
  const assetNames = assets.map(getAssetName).filter(Boolean);

  if (version) {
    const available = new Set(assetNames);

    return expectedDesktopReleaseAssetNames(version).every((name) =>
      available.has(name)
    );
  }

  return Object.values(REQUIRED_RELEASE_ASSET_GROUPS).every((patterns) =>
    patterns.some((pattern) => assetNames.some((name) => pattern.test(name)))
  );
}

function formatGhOutput(result) {
  return [result.stderr, result.stdout]
    .filter((output) => typeof output === 'string' && output.trim())
    .map((output) => output.trim())
    .join('\n');
}

/**
 * Check whether a GitHub Release already has the required desktop artifacts.
 * @param {Object} options
 * @param {string} options.repository
 * @param {string} options.tag
 * @param {typeof spawnSync} [options.spawn]
 * @returns {boolean}
 */
export function isGitHubReleaseComplete({
  repository,
  tag,
  spawn = spawnSync,
}) {
  if (!repository) {
    throw new Error('Repository is required to check GitHub release state');
  }

  const result = spawn(
    'gh',
    ['release', 'view', tag, '--repo', repository, '--json', 'assets'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  if (result.error) {
    throw new Error(`gh release view failed to start: ${result.error.message}`);
  }

  if (result.status === 0) {
    let release;
    try {
      release = JSON.parse(result.stdout || '{}');
    } catch (error) {
      throw new Error(
        `Could not parse gh release view output: ${error.message}`
      );
    }

    return hasRequiredDesktopReleaseAssets(
      release.assets ?? [],
      releaseVersionFromTag(tag)
    );
  }

  const output = formatGhOutput(result);
  if (/not\s+found|404/i.test(output)) {
    return false;
  }

  const details = output ? `:\n${output}` : '';
  throw new Error(`gh release view failed for ${tag}${details}`);
}

/**
 * Write output to GitHub Actions output file.
 * @param {string} name
 * @param {string} value
 * @param {NodeJS.ProcessEnv} env
 */
function setOutput(name, value, env) {
  const outputFile = env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`Output: ${name}=${value}`);
}

export function main({
  env = process.env,
  spawn = spawnSync,
  stderr = console.error,
  stdout = console.log,
} = {}) {
  try {
    const jsRootConfig = parseJsRootConfig();
    const jsRoot = getJsRoot({ jsRoot: jsRootConfig, verbose: true });
    const { name: packageName, version: currentVersion } = readPackageInfo({
      jsRoot,
    });
    const hasChangesets = env.HAS_CHANGESETS === 'true';
    const repository = env.REPOSITORY || env.GITHUB_REPOSITORY;
    const tag = buildReleaseTag(currentVersion, env.TAG_PREFIX ?? 'v');

    stdout(`Package: ${packageName}`);
    stdout(`Current version: ${currentVersion}`);
    stdout(`Release tag: ${tag}`);
    stdout(`Repository: ${repository || '(missing)'}`);
    stdout(`Has changesets: ${hasChangesets}`);

    let releaseComplete = false;
    if (!hasChangesets) {
      stdout(`Checking if GitHub Release ${tag} has desktop artifacts...`);
      releaseComplete = isGitHubReleaseComplete({ repository, spawn, tag });
      stdout(`GitHub Release complete: ${releaseComplete}`);
    }

    const decision = getReleaseDecision({ hasChangesets, releaseComplete });

    if (decision.shouldRelease && decision.skipBump) {
      stdout(
        `No changesets but ${tag} is missing complete GitHub Release artifacts - retrying release without a version bump`
      );
    } else if (decision.shouldRelease) {
      stdout('Found changesets, proceeding with release');
    } else {
      stdout(
        `No changesets and ${tag} already has desktop artifacts - no release needed`
      );
    }

    setOutput('should_release', String(decision.shouldRelease), env);
    setOutput('skip_bump', String(decision.skipBump), env);
    return 0;
  } catch (error) {
    stderr(`Error checking release state: ${error.message}`);
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
