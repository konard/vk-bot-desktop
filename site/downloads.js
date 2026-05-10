export const RELEASE_API =
  'https://api.github.com/repos/konard/vk-bot-desktop/releases/latest';
export const RELEASES_URL =
  'https://github.com/konard/vk-bot-desktop/releases/latest';
export const CHECKSUM_ASSET_NAME = 'SHA256SUMS.txt';

export const downloadOptions = [
  {
    id: 'macos-arm64',
    os: 'macos',
    labelKey: 'macArm',
    assetName: 'vk-bot-desktop-macos-arm64.dmg',
  },
  {
    id: 'macos-x64',
    os: 'macos',
    labelKey: 'macIntel',
    assetName: 'vk-bot-desktop-macos-x64.dmg',
  },
  {
    id: 'windows-x64',
    os: 'windows',
    labelKey: 'winInstaller',
    assetName: 'vk-bot-desktop-windows-installer-x64.exe',
  },
  {
    id: 'windows-portable-x64',
    os: 'windows',
    labelKey: 'winPortable',
    assetName: 'vk-bot-desktop-windows-portable-x64.exe',
  },
  {
    id: 'linux-appimage-x64',
    os: 'linux',
    labelKey: 'linuxAppImage',
    assetName: 'vk-bot-desktop-linux-x64.AppImage',
  },
  {
    id: 'linux-deb-x64',
    os: 'linux',
    labelKey: 'linuxDeb',
    assetName: 'vk-bot-desktop-linux-x64.deb',
  },
  {
    id: 'linux-tar-x64',
    os: 'linux',
    labelKey: 'linuxTar',
    assetName: 'vk-bot-desktop-linux-x64.tar.gz',
  },
];

export function primaryOptionFor(os) {
  if (os === 'macos') {
    return downloadOptions.find((option) => option.id === 'macos-arm64');
  }

  if (os === 'windows') {
    return downloadOptions.find((option) => option.id === 'windows-x64');
  }

  if (os === 'linux') {
    return downloadOptions.find((option) => option.id === 'linux-appimage-x64');
  }

  return undefined;
}

export function assetsByName(release) {
  return Object.fromEntries(
    (release?.assets || []).map((asset) => [asset.name, asset])
  );
}

export function resolveDownloadHref(option, releaseAssets) {
  if (!option) {
    return undefined;
  }

  return releaseAssets[option.assetName]?.browser_download_url;
}

export function resolveChecksumHref(releaseAssets) {
  return (
    releaseAssets[CHECKSUM_ASSET_NAME]?.browser_download_url || RELEASES_URL
  );
}

export function groupedOptions() {
  return ['macos', 'windows', 'linux'].map((os) => ({
    os,
    options: downloadOptions.filter((option) => option.os === os),
  }));
}
