import { describe, it, expect } from 'test-anywhere';

import {
  buildReleaseTag,
  getReleaseDecision,
  hasRequiredDesktopReleaseAssets,
  isGitHubReleaseComplete,
} from '../scripts/check-release-needed.mjs';

function createSpawn(result) {
  const calls = [];

  return {
    calls,
    spawn(command, args, options) {
      calls.push({ args, command, options });
      return result;
    },
  };
}

describe('desktop release detection', () => {
  it('builds GitHub release tags from the package version', () => {
    expect(buildReleaseTag('0.9.0')).toBe('v0.9.0');
    expect(buildReleaseTag('0.9.0', 'desktop-v')).toBe('desktop-v0.9.0');
    expect(buildReleaseTag('0.9.0', '')).toBe('0.9.0');
  });

  it('releases through a version bump when changesets exist', () => {
    expect(
      getReleaseDecision({ hasChangesets: true, releaseComplete: false })
    ).toEqual({
      shouldRelease: true,
      skipBump: false,
    });
  });

  it('skips release when the current GitHub Release already has artifacts', () => {
    expect(
      getReleaseDecision({ hasChangesets: false, releaseComplete: true })
    ).toEqual({
      shouldRelease: false,
      skipBump: false,
    });
  });

  it('retries release without a bump when the GitHub Release is incomplete', () => {
    expect(
      getReleaseDecision({ hasChangesets: false, releaseComplete: false })
    ).toEqual({
      shouldRelease: true,
      skipBump: true,
    });
  });

  it('requires checksum, provenance, and all desktop platform assets', () => {
    expect(
      hasRequiredDesktopReleaseAssets([
        'VK Bot Desktop-0.9.0.AppImage',
        'VK Bot Desktop-0.9.0.dmg',
        'VK Bot Desktop Setup 0.9.0.exe',
        'SHA256SUMS.txt',
        'BUILD-PROVENANCE.txt',
      ])
    ).toBe(true);

    expect(
      hasRequiredDesktopReleaseAssets([
        'VK Bot Desktop-0.9.0.AppImage',
        'SHA256SUMS.txt',
        'BUILD-PROVENANCE.txt',
      ])
    ).toBe(false);
  });

  it('checks GitHub Release artifact completeness with gh release view', () => {
    const recorder = createSpawn({
      status: 0,
      stderr: '',
      stdout: JSON.stringify({
        assets: [
          { name: 'VK Bot Desktop-0.9.0.AppImage' },
          { name: 'VK Bot Desktop-0.9.0.dmg' },
          { name: 'VK Bot Desktop Setup 0.9.0.exe' },
          { name: 'SHA256SUMS.txt' },
          { name: 'BUILD-PROVENANCE.txt' },
        ],
      }),
    });

    expect(
      isGitHubReleaseComplete({
        repository: 'owner/repo',
        spawn: recorder.spawn,
        tag: 'v0.9.0',
      })
    ).toBe(true);

    expect(recorder.calls).toEqual([
      {
        args: [
          'release',
          'view',
          'v0.9.0',
          '--repo',
          'owner/repo',
          '--json',
          'assets',
        ],
        command: 'gh',
        options: {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      },
    ]);
  });

  it('treats missing GitHub Releases as unpublished', () => {
    const recorder = createSpawn({
      status: 1,
      stderr: 'release not found',
      stdout: '',
    });

    expect(
      isGitHubReleaseComplete({
        repository: 'owner/repo',
        spawn: recorder.spawn,
        tag: 'v0.9.0',
      })
    ).toBe(false);
  });

  it('fails closed on unexpected gh release errors', () => {
    const recorder = createSpawn({
      status: 1,
      stderr: 'network unavailable',
      stdout: '',
    });

    expect(() =>
      isGitHubReleaseComplete({
        repository: 'owner/repo',
        spawn: recorder.spawn,
        tag: 'v0.9.0',
      })
    ).toThrow(/gh release view failed/);
  });
});
