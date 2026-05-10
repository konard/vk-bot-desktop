import { describe, it, expect } from 'test-anywhere';

import { expectedDesktopReleaseAssetNames } from '../scripts/check-release-needed.mjs';
import {
  formatMissingReleaseAssetErrors,
  validateReleaseAssets,
} from '../scripts/validate-release-assets.mjs';

describe('validate-release-assets.mjs', () => {
  it('validates release assets from the tag version, not the checkout package version', () => {
    const packageJsonVersionFromPublishCheckout = '0.9.9';
    const assetNames = expectedDesktopReleaseAssetNames('0.9.10');

    const result = validateReleaseAssets({
      assetNames,
      tag: 'v0.9.10',
    });

    expect(packageJsonVersionFromPublishCheckout).toBe('0.9.9');
    expect(result.version).toBe('0.9.10');
    expect(result.missing).toEqual([]);
  });

  it('reports each missing release asset with a GitHub annotation path', () => {
    const result = validateReleaseAssets({
      assetNames: ['SHA256SUMS.txt', 'BUILD-PROVENANCE.txt'],
      tag: 'v0.9.10',
    });

    expect(result.missing).toContain('vk-bot-desktop-macos-arm64-0.9.10.dmg');
    expect(result.missing).toContain(
      'vk-bot-desktop-windows-portable-x64-0.9.10.exe'
    );
    expect(formatMissingReleaseAssetErrors(result.missing, 'dist')).toContain(
      '::error file=dist/vk-bot-desktop-macos-arm64-0.9.10.dmg::Required versioned release asset is missing.'
    );
  });
});
