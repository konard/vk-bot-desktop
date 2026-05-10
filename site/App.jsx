import { useEffect, useMemo, useState } from 'react';

const RELEASE_API =
  'https://api.github.com/repos/konard/vk-bot-desktop/releases/latest';
const LATEST_DOWNLOAD =
  'https://github.com/konard/vk-bot-desktop/releases/latest/download';
const RELEASES_URL = 'https://github.com/konard/vk-bot-desktop/releases/latest';

const copy = {
  en: {
    eyebrow: 'Local VK automation',
    title: 'VK Bot Desktop',
    summary:
      'Run the VK bot from a signed desktop app with local and SSH server modes.',
    release: 'Latest release',
    checksum: 'Checksums',
    primaryUnknown: 'Choose your operating system',
    primaryAction: 'Download',
    otherSystems: 'Other downloads',
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    allReleases: 'All releases',
    statusReady: 'Release assets ready',
    statusLoading: 'Checking latest release',
    statusFallback: 'Using direct latest links',
    macArm: 'macOS Apple silicon',
    macIntel: 'macOS Intel',
    winInstaller: 'Windows installer',
    winPortable: 'Windows portable',
    linuxAppImage: 'Linux AppImage',
    linuxDeb: 'Linux .deb',
    linuxTar: 'Linux tar.gz',
    previewAlt: 'VK Bot Desktop application interface preview',
    verify: 'Verify downloads with SHA256SUMS.txt from the same release.',
  },
  ru: {
    eyebrow: 'Локальная автоматизация VK',
    title: 'VK Bot Desktop',
    summary:
      'Запускайте VK-бота из подписанного desktop-приложения с локальным и SSH-режимами.',
    release: 'Последний релиз',
    checksum: 'Контрольные суммы',
    primaryUnknown: 'Выберите операционную систему',
    primaryAction: 'Скачать',
    otherSystems: 'Другие загрузки',
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    allReleases: 'Все релизы',
    statusReady: 'Файлы релиза готовы',
    statusLoading: 'Проверяем последний релиз',
    statusFallback: 'Используем прямые latest-ссылки',
    macArm: 'macOS Apple silicon',
    macIntel: 'macOS Intel',
    winInstaller: 'Windows installer',
    winPortable: 'Windows portable',
    linuxAppImage: 'Linux AppImage',
    linuxDeb: 'Linux .deb',
    linuxTar: 'Linux tar.gz',
    previewAlt: 'Интерфейс приложения VK Bot Desktop',
    verify: 'Проверяйте загрузки через SHA256SUMS.txt из того же релиза.',
  },
};

const downloadOptions = [
  {
    id: 'macos-arm64',
    os: 'macos',
    labelKey: 'macArm',
    assetName: 'vk-bot-desktop-macos-arm64.dmg',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-macos-arm64.dmg',
  },
  {
    id: 'macos-x64',
    os: 'macos',
    labelKey: 'macIntel',
    assetName: 'vk-bot-desktop-macos-x64.dmg',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-macos-x64.dmg',
  },
  {
    id: 'windows-x64',
    os: 'windows',
    labelKey: 'winInstaller',
    assetName: 'vk-bot-desktop-windows-installer-x64.exe',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-windows-installer-x64.exe',
  },
  {
    id: 'windows-portable-x64',
    os: 'windows',
    labelKey: 'winPortable',
    assetName: 'vk-bot-desktop-windows-portable-x64.exe',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-windows-portable-x64.exe',
  },
  {
    id: 'linux-appimage-x64',
    os: 'linux',
    labelKey: 'linuxAppImage',
    assetName: 'vk-bot-desktop-linux-x64.AppImage',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-linux-x64.AppImage',
  },
  {
    id: 'linux-deb-x64',
    os: 'linux',
    labelKey: 'linuxDeb',
    assetName: 'vk-bot-desktop-linux-x64.deb',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-linux-x64.deb',
  },
  {
    id: 'linux-tar-x64',
    os: 'linux',
    labelKey: 'linuxTar',
    assetName: 'vk-bot-desktop-linux-x64.tar.gz',
    href: 'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-linux-x64.tar.gz',
  },
];

function text(locale, key) {
  return copy[locale]?.[key] || copy.en[key];
}

function detectLocale() {
  const languages =
    typeof navigator !== 'undefined'
      ? navigator.languages || [navigator.language]
      : ['en'];

  return languages.some((language) =>
    String(language || '')
      .toLowerCase()
      .startsWith('ru')
  )
    ? 'ru'
    : 'en';
}

function detectTheme() {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

function detectOperatingSystem() {
  const userAgentData =
    typeof navigator !== 'undefined' ? navigator.userAgentData : undefined;
  const platform = String(
    userAgentData?.platform ||
      (typeof navigator !== 'undefined' ? navigator.platform : '') ||
      ''
  ).toLowerCase();
  const userAgent = String(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  ).toLowerCase();
  const signal = `${platform} ${userAgent}`;

  if (signal.includes('mac')) {
    return 'macos';
  }

  if (signal.includes('win')) {
    return 'windows';
  }

  if (signal.includes('linux') || signal.includes('x11')) {
    return 'linux';
  }

  return 'unknown';
}

function primaryOptionFor(os) {
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

function assetsByName(release) {
  return Object.fromEntries(
    (release?.assets || []).map((asset) => [asset.name, asset])
  );
}

function resolveDownload(option, releaseAssets) {
  return releaseAssets[option.assetName]?.browser_download_url || option.href;
}

function groupedOptions() {
  return ['macos', 'windows', 'linux'].map((os) => ({
    os,
    options: downloadOptions.filter((option) => option.os === os),
  }));
}

export default function App() {
  const [locale, setLocale] = useState(() => detectLocale());
  const [theme, setTheme] = useState(() => detectTheme());
  const [detectedOs] = useState(() => detectOperatingSystem());
  const [selectedOs, setSelectedOs] = useState(() => detectOperatingSystem());
  const [release, setRelease] = useState(null);
  const [releaseStatus, setReleaseStatus] = useState('loading');

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
  }, [locale, theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(detectTheme());

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(RELEASE_API, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Release request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setRelease(data);
        setReleaseStatus('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setReleaseStatus('fallback');
        }
      });

    return () => controller.abort();
  }, []);

  const releaseAssets = useMemo(() => assetsByName(release), [release]);
  const primaryOption = primaryOptionFor(selectedOs);
  const statusKey =
    releaseStatus === 'ready'
      ? 'statusReady'
      : releaseStatus === 'loading'
        ? 'statusLoading'
        : 'statusFallback';

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="site-title">
        <div className="hero-copy">
          <div className="locale-switch" aria-label="Language">
            {['en', 'ru'].map((value) => (
              <button
                key={value}
                type="button"
                className={locale === value ? 'active' : ''}
                onClick={() => setLocale(value)}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="eyebrow">{text(locale, 'eyebrow')}</p>
          <h1 id="site-title">{text(locale, 'title')}</h1>
          <p className="summary">{text(locale, 'summary')}</p>
          <div className="status-row" role="status">
            <span>{text(locale, statusKey)}</span>
            {release?.tag_name ? <strong>{release.tag_name}</strong> : null}
          </div>
          <div className="download-panel">
            {primaryOption ? (
              <a
                className="primary-download"
                href={resolveDownload(primaryOption, releaseAssets)}
              >
                <span>{text(locale, 'primaryAction')}</span>
                <strong>{text(locale, primaryOption.labelKey)}</strong>
              </a>
            ) : (
              <div className="primary-download empty">
                <span>{text(locale, 'primaryUnknown')}</span>
              </div>
            )}
            <div className="os-tabs" aria-label={text(locale, 'otherSystems')}>
              {['macos', 'windows', 'linux'].map((os) => (
                <button
                  key={os}
                  type="button"
                  className={selectedOs === os ? 'active' : ''}
                  onClick={() => setSelectedOs(os)}
                >
                  {text(locale, os)}
                </button>
              ))}
            </div>
          </div>
          <nav className="support-links" aria-label="Release links">
            <a href={`${LATEST_DOWNLOAD}/SHA256SUMS.txt`}>
              {text(locale, 'checksum')}
            </a>
            <a href={RELEASES_URL}>{text(locale, 'allReleases')}</a>
          </nav>
        </div>
        <div className="hero-media" aria-label={text(locale, 'previewAlt')}>
          <img src="assets/app-preview.png" alt={text(locale, 'previewAlt')} />
        </div>
      </section>

      <section className="downloads" aria-labelledby="downloads-title">
        <div>
          <p className="eyebrow">{text(locale, 'otherSystems')}</p>
          <h2 id="downloads-title">{text(locale, 'release')}</h2>
        </div>
        <div className="download-grid">
          {groupedOptions().map((group) => (
            <div className="download-group" key={group.os}>
              <h3>{text(locale, group.os)}</h3>
              {group.options.map((option) => (
                <a
                  key={option.id}
                  href={resolveDownload(option, releaseAssets)}
                  className={
                    option.os === detectedOs
                      ? 'download-row detected'
                      : 'download-row'
                  }
                >
                  <span>{text(locale, option.labelKey)}</span>
                  <code>{option.assetName}</code>
                </a>
              ))}
            </div>
          ))}
        </div>
        <p className="verify-note">{text(locale, 'verify')}</p>
      </section>
    </main>
  );
}
