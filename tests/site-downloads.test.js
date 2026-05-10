import { describe, it, expect } from 'test-anywhere';
import {
  CHECKSUM_ASSET_NAME,
  RELEASES_URL,
  assetNameFor,
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
  it('resolves versioned download links from actual release assets', () => {
    const release = releaseWithAssets([
      'vk-bot-desktop-linux-x64-0.9.8.AppImage',
    ]);
    release.tag_name = 'v0.9.8';
    const releaseAssets = assetsByName(release);
    const linuxOption = primaryOptionFor('linux');
    const macOption = primaryOptionFor('macos');

    expect(resolveDownloadHref(linuxOption, releaseAssets, release)).toBe(
      'https://example.test/download/vk-bot-desktop-linux-x64-0.9.8.AppImage'
    );
    expect(
      resolveDownloadHref(macOption, releaseAssets, release)
    ).toBeUndefined();
  });

  it('prefers versioned assets while tolerating legacy assets during migration', () => {
    const release = releaseWithAssets([
      'vk-bot-desktop-linux-x64.AppImage',
      'vk-bot-desktop-linux-x64-0.9.8.AppImage',
    ]);
    release.tag_name = 'v0.9.8';
    const releaseAssets = assetsByName(release);
    const linuxOption = primaryOptionFor('linux');

    expect(resolveDownloadHref(linuxOption, releaseAssets, release)).toBe(
      'https://example.test/download/vk-bot-desktop-linux-x64-0.9.8.AppImage'
    );

    const legacyRelease = releaseWithAssets([
      'vk-bot-desktop-linux-x64.AppImage',
    ]);
    legacyRelease.tag_name = 'v0.9.7';

    expect(
      resolveDownloadHref(
        linuxOption,
        assetsByName(legacyRelease),
        legacyRelease
      )
    ).toBe('https://example.test/download/vk-bot-desktop-linux-x64.AppImage');
  });

  it('derives user-visible asset names from the latest release version', () => {
    const release = { tag_name: 'v0.9.8' };

    expect(assetNameFor(primaryOptionFor('macos'), release)).toBe(
      'vk-bot-desktop-macos-arm64-0.9.8.dmg'
    );
    expect(assetNameFor(primaryOptionFor('windows'), release)).toBe(
      'vk-bot-desktop-windows-installer-x64-0.9.8.exe'
    );
    expect(assetNameFor(primaryOptionFor('linux'), release)).toBe(
      'vk-bot-desktop-linux-x64-0.9.8.AppImage'
    );
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
    expect(downloadOptions.map((option) => option.id)).toEqual([
      'macos-arm64',
      'macos-arm64-zip',
      'macos-x64',
      'macos-x64-zip',
      'windows-x64',
      'windows-arm64',
      'windows-portable-x64',
      'windows-portable-arm64',
      'linux-appimage-x64',
      'linux-appimage-arm64',
      'linux-deb-x64',
      'linux-deb-arm64',
      'linux-tar-x64',
      'linux-tar-arm64',
    ]);
    expect(
      assetNameFor(primaryOptionFor('macos'), { tag_name: 'v0.9.8' })
    ).toBe('vk-bot-desktop-macos-arm64-0.9.8.dmg');
    expect(
      assetNameFor(primaryOptionFor('windows'), { tag_name: 'v0.9.8' })
    ).toBe('vk-bot-desktop-windows-installer-x64-0.9.8.exe');
  });
});
