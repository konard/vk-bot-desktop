import { useEffect, useMemo, useState } from 'react';
import {
  RELEASE_API,
  RELEASES_URL,
  assetsByName,
  groupedOptions,
  primaryOptionFor,
  resolveChecksumHref,
  resolveDownloadHref,
} from './downloads.js';

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
    statusFallback: 'Open latest release to download',
    downloadChecking: 'Checking release assets',
    downloadUnavailable: 'Not available in latest release',
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
    statusFallback: 'Откройте последний релиз для загрузки',
    downloadChecking: 'Проверяем файлы релиза',
    downloadUnavailable: 'Нет в последнем релизе',
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
  const primaryHref = resolveDownloadHref(primaryOption, releaseAssets);
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
            {primaryOption && primaryHref ? (
              <a className="primary-download" href={primaryHref}>
                <span>{text(locale, 'primaryAction')}</span>
                <strong>{text(locale, primaryOption.labelKey)}</strong>
              </a>
            ) : primaryOption ? (
              <div className="primary-download empty" aria-disabled="true">
                <span>{text(locale, 'primaryAction')}</span>
                <strong>{text(locale, primaryOption.labelKey)}</strong>
                <em>
                  {text(
                    locale,
                    releaseStatus === 'loading'
                      ? 'downloadChecking'
                      : 'downloadUnavailable'
                  )}
                </em>
              </div>
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
            <a href={resolveChecksumHref(releaseAssets)}>
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
              {group.options.map((option) => {
                const href = resolveDownloadHref(option, releaseAssets);
                const className =
                  option.os === detectedOs
                    ? 'download-row detected'
                    : 'download-row';

                return href ? (
                  <a key={option.id} href={href} className={className}>
                    <span>{text(locale, option.labelKey)}</span>
                    <code>{option.assetName}</code>
                  </a>
                ) : (
                  <div
                    key={option.id}
                    className={`${className} unavailable`}
                    aria-disabled="true"
                  >
                    <span>{text(locale, option.labelKey)}</span>
                    <code>{option.assetName}</code>
                    <small>
                      {text(
                        locale,
                        releaseStatus === 'loading'
                          ? 'downloadChecking'
                          : 'downloadUnavailable'
                      )}
                    </small>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="verify-note">{text(locale, 'verify')}</p>
      </section>
    </main>
  );
}
