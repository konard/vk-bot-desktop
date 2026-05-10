import { describe, it, expect } from 'test-anywhere';
import {
  CHECKSUM_ASSET_NAME,
  RELEASES_URL,
  assetsByName,
  downloadOptions,
  groupedOptions,
  primaryOptionFor,
  resolveChecksumHref,
  resolveDownloadHref,
} from '../site/downloads.js';

function releaseWithAssets(assetNames) {
  return {
    assets: assetNames.map((name) => ({
      name,
      browser_download_url: `https://example.test/download/${name}`,
    })),
  };
}

describe('Pages release download helpers', () => {
  it('resolves download links only from actual release assets', () => {
    const releaseAssets = assetsByName(
      releaseWithAssets(['vk-bot-desktop-linux-x64.AppImage'])
    );
    const linuxOption = primaryOptionFor('linux');
    const macOption = primaryOptionFor('macos');

    expect(resolveDownloadHref(linuxOption, releaseAssets)).toBe(
      'https://example.test/download/vk-bot-desktop-linux-x64.AppImage'
    );
    expect(resolveDownloadHref(macOption, releaseAssets)).toBeUndefined();
  });

  it('uses the release page rather than a synthetic checksum URL when missing', () => {
    expect(resolveChecksumHref({})).toBe(RELEASES_URL);

    const releaseAssets = assetsByName(
      releaseWithAssets([CHECKSUM_ASSET_NAME])
    );

    expect(resolveChecksumHref(releaseAssets)).toBe(
      `https://example.test/download/${CHECKSUM_ASSET_NAME}`
    );
  });

  it('keeps stable option groups for all supported operating systems', () => {
    expect(groupedOptions().map((group) => group.os)).toEqual([
      'macos',
      'windows',
      'linux',
    ]);
    expect(downloadOptions.map((option) => option.assetName)).toContain(
      'vk-bot-desktop-macos-arm64.dmg'
    );
    expect(primaryOptionFor('windows')?.assetName).toBe(
      'vk-bot-desktop-windows-installer-x64.exe'
    );
  });
});
