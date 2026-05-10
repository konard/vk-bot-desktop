import { useEffect, useMemo, useState } from 'react';
import {
  RELEASE_API,
  RELEASES_URL,
  assetNameFor,
  assetsByName,
  groupedOptions,
  primaryOptionFor,
  releaseVersion,
  resolveDownloadAsset,
  resolveChecksumHref,
  resolveDownloadHref,
  resolveProvenanceHref,
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
    macArmZip: 'macOS Apple silicon zip',
    macIntel: 'macOS Intel',
    macIntelZip: 'macOS Intel zip',
    winInstaller: 'Windows installer',
    winInstallerArm: 'Windows ARM installer',
    winPortable: 'Windows portable',
    winPortableArm: 'Windows ARM portable',
    linuxAppImage: 'Linux AppImage',
    linuxAppImageArm: 'Linux ARM AppImage',
    linuxDeb: 'Linux .deb',
    linuxDebArm: 'Linux ARM .deb',
    linuxTar: 'Linux tar.gz',
    linuxTarArm: 'Linux ARM tar.gz',
    previewAlt: 'VK Bot Desktop application interface preview',
    verify: 'Verify downloads with SHA256SUMS.txt from the same release.',
    provenance: 'Build provenance',
    verifyTitle: 'Verify your download',
    verifyRegular: 'Regular check',
    verifyAdvanced: 'Advanced check',
    regularStepOne:
      'Download the app and SHA256SUMS.txt from the same release.',
    regularStepTwo:
      'Open the built-in checksum tool for your system and compare the SHA-256 value.',
    regularStepThree:
      'Install only when the value matches the line for the file you downloaded.',
    windowsCommand: 'Windows PowerShell',
    macosCommand: 'macOS Terminal',
    linuxCommand: 'Linux Terminal',
    advancedStepOne:
      'Check BUILD-PROVENANCE.txt for the repository, workflow run, tag, commit, and builder OS.',
    advancedStepTwo:
      'When release attestations are available, verify the artifact with GitHub CLI.',
    reproducibleNote:
      'Byte-for-byte reproducible desktop builds need a pinned rebuild environment; this release records provenance now and leaves that stronger guarantee explicit.',
    installMacosTitle: 'Open the app on macOS',
    installMacosWhy:
      'Builds are ad-hoc signed without an Apple Developer ID, so macOS Gatekeeper blocks the first launch with "Apple could not verify VK Bot Desktop is free of malware." After verifying the SHA-256 checksum above, use either of the workflows below to allow the app once.',
    installMacosTerminalTitle: 'Terminal one-liner',
    installMacosTerminalStep:
      'After dragging VK Bot Desktop.app into /Applications, remove the quarantine attribute from a Terminal:',
    installMacosSettingsTitle: 'System Settings (macOS 15 Sequoia)',
    installMacosSettingsStep1:
      'Double-click VK Bot Desktop, then click Done when "Apple could not verify..." appears.',
    installMacosSettingsStep2:
      'Open System Settings → Privacy & Security and scroll to the Security section.',
    installMacosSettingsStep3:
      'Click "Open Anyway" next to VK Bot Desktop, confirm, and authenticate with Touch ID or your admin password.',
    installMacosFooter:
      'Subsequent launches do not show the warning. Only run these steps for VK Bot Desktop release artifacts whose SHA-256 matches SHA256SUMS.txt from the same GitHub release.',
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
    macArmZip: 'macOS Apple silicon zip',
    macIntel: 'macOS Intel',
    macIntelZip: 'macOS Intel zip',
    winInstaller: 'Windows installer',
    winInstallerArm: 'Windows ARM installer',
    winPortable: 'Windows portable',
    winPortableArm: 'Windows ARM portable',
    linuxAppImage: 'Linux AppImage',
    linuxAppImageArm: 'Linux ARM AppImage',
    linuxDeb: 'Linux .deb',
    linuxDebArm: 'Linux ARM .deb',
    linuxTar: 'Linux tar.gz',
    linuxTarArm: 'Linux ARM tar.gz',
    previewAlt: 'Интерфейс приложения VK Bot Desktop',
    verify: 'Проверяйте загрузки через SHA256SUMS.txt из того же релиза.',
    provenance: 'Происхождение сборки',
    verifyTitle: 'Проверка загрузки',
    verifyRegular: 'Обычная проверка',
    verifyAdvanced: 'Расширенная проверка',
    regularStepOne:
      'Скачайте приложение и SHA256SUMS.txt из одного и того же релиза.',
    regularStepTwo:
      'Откройте встроенную проверку контрольных сумм для вашей системы и сравните SHA-256.',
    regularStepThree:
      'Устанавливайте файл только если значение совпало со строкой для скачанного файла.',
    windowsCommand: 'Windows PowerShell',
    macosCommand: 'macOS Terminal',
    linuxCommand: 'Linux Terminal',
    advancedStepOne:
      'Проверьте BUILD-PROVENANCE.txt: репозиторий, workflow run, тег, коммит и OS сборщика.',
    advancedStepTwo:
      'Когда attestation доступен в релизе, проверьте файл через GitHub CLI.',
    reproducibleNote:
      'Побайтово воспроизводимые desktop-сборки требуют зафиксированной среды пересборки; текущий релиз уже записывает provenance и явно отделяет это от более строгой гарантии.',
    installMacosTitle: 'Открытие приложения на macOS',
    installMacosWhy:
      'Сборки подписаны ad-hoc, без Apple Developer ID, поэтому Gatekeeper блокирует первый запуск сообщением «Не удалось проверить, что приложение «VK Bot Desktop» не содержит вредоносного ПО». Сначала сверьте SHA-256 выше, а затем выполните один из вариантов ниже, чтобы открыть приложение.',
    installMacosTerminalTitle: 'Команда в Терминале',
    installMacosTerminalStep:
      'Перетащите VK Bot Desktop.app в /Applications и снимите карантин в Терминале:',
    installMacosSettingsTitle: 'Системные настройки (macOS 15 Sequoia)',
    installMacosSettingsStep1:
      'Откройте VK Bot Desktop двойным щелчком и нажмите «Готово», когда появится предупреждение «Apple не удалось проверить...».',
    installMacosSettingsStep2:
      'Откройте Системные настройки → Конфиденциальность и безопасность и пролистайте до раздела «Безопасность».',
    installMacosSettingsStep3:
      'Нажмите «Открыть всё равно» рядом с VK Bot Desktop, подтвердите и введите пароль администратора или Touch ID.',
    installMacosFooter:
      'При последующих запусках предупреждение не появляется. Используйте эти шаги только для релизных файлов VK Bot Desktop, чья контрольная сумма SHA-256 совпала с SHA256SUMS.txt из того же релиза GitHub.',
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

function verificationCommands(release) {
  const version = releaseVersion(release) || '0.9.9';

  return [
    {
      key: 'windowsCommand',
      command: `Get-FileHash .\\vk-bot-desktop-windows-installer-x64-${version}.exe -Algorithm SHA256`,
    },
    {
      key: 'macosCommand',
      command: `shasum -a 256 vk-bot-desktop-macos-arm64-${version}.dmg`,
    },
    {
      key: 'linuxCommand',
      command: 'sha256sum -c SHA256SUMS.txt --ignore-missing',
    },
  ];
}

export const MACOS_INSTALL_COMMAND =
  'sudo xattr -dr com.apple.quarantine "/Applications/VK Bot Desktop.app"';

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
  const primaryHref = resolveDownloadHref(
    primaryOption,
    releaseAssets,
    release
  );
  const previewOs = selectedOs === 'unknown' ? 'macos' : selectedOs;
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
        <div
          className={`hero-media ${previewOs}`}
          aria-label={text(locale, 'previewAlt')}
        >
          <div className="window-frame">
            <div className="window-titlebar" aria-hidden="true">
              <span className="traffic-lights">
                <span />
                <span />
                <span />
              </span>
              <span className="window-title">VK Bot Desktop</span>
              <span className="window-actions">
                <span />
                <span />
                <span />
              </span>
            </div>
            <img
              src="assets/app-preview.png"
              alt={text(locale, 'previewAlt')}
            />
          </div>
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
                const asset = resolveDownloadAsset(
                  option,
                  releaseAssets,
                  release
                );
                const href = asset?.browser_download_url;
                const displayName =
                  asset?.name || assetNameFor(option, release);
                const className =
                  option.os === detectedOs
                    ? 'download-row detected'
                    : 'download-row';

                return href ? (
                  <a key={option.id} href={href} className={className}>
                    <span>{text(locale, option.labelKey)}</span>
                    <code>{displayName}</code>
                  </a>
                ) : (
                  <div
                    key={option.id}
                    className={`${className} unavailable`}
                    aria-disabled="true"
                  >
                    <span>{text(locale, option.labelKey)}</span>
                    <code>{displayName}</code>
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

      <section className="install-macos" aria-labelledby="install-macos-title">
        <div>
          <p className="eyebrow">{text(locale, 'macos')}</p>
          <h2 id="install-macos-title">{text(locale, 'installMacosTitle')}</h2>
        </div>
        <p className="install-macos-why">{text(locale, 'installMacosWhy')}</p>
        <div className="install-macos-grid">
          <details open>
            <summary>{text(locale, 'installMacosTerminalTitle')}</summary>
            <ol>
              <li>{text(locale, 'installMacosTerminalStep')}</li>
            </ol>
            <div className="command-list">
              <div>
                <strong>{text(locale, 'macosCommand')}</strong>
                <code>{MACOS_INSTALL_COMMAND}</code>
              </div>
            </div>
          </details>
          <details>
            <summary>{text(locale, 'installMacosSettingsTitle')}</summary>
            <ol>
              <li>{text(locale, 'installMacosSettingsStep1')}</li>
              <li>{text(locale, 'installMacosSettingsStep2')}</li>
              <li>{text(locale, 'installMacosSettingsStep3')}</li>
            </ol>
          </details>
        </div>
        <p className="install-macos-footer">
          {text(locale, 'installMacosFooter')}
        </p>
      </section>

      <section className="verification" aria-labelledby="verification-title">
        <div>
          <p className="eyebrow">{text(locale, 'checksum')}</p>
          <h2 id="verification-title">{text(locale, 'verifyTitle')}</h2>
        </div>
        <div className="verification-grid">
          <details open>
            <summary>{text(locale, 'verifyRegular')}</summary>
            <ol>
              <li>{text(locale, 'regularStepOne')}</li>
              <li>{text(locale, 'regularStepTwo')}</li>
              <li>{text(locale, 'regularStepThree')}</li>
            </ol>
            <div className="command-list">
              {verificationCommands(release).map((item) => (
                <div key={item.key}>
                  <strong>{text(locale, item.key)}</strong>
                  <code>{item.command}</code>
                </div>
              ))}
            </div>
          </details>
          <details>
            <summary>{text(locale, 'verifyAdvanced')}</summary>
            <ol>
              <li>{text(locale, 'advancedStepOne')}</li>
              <li>{text(locale, 'advancedStepTwo')}</li>
            </ol>
            <div className="command-list">
              <div>
                <strong>GitHub CLI</strong>
                <code>
                  gh attestation verify ./downloaded-file --repo
                  konard/vk-bot-desktop
                </code>
              </div>
            </div>
            <p>{text(locale, 'reproducibleNote')}</p>
          </details>
        </div>
        <nav className="support-links" aria-label="Verification links">
          <a href={resolveChecksumHref(releaseAssets)}>
            {text(locale, 'checksum')}
          </a>
          <a href={resolveProvenanceHref(releaseAssets)}>
            {text(locale, 'provenance')}
          </a>
        </nav>
      </section>
    </main>
  );
}
