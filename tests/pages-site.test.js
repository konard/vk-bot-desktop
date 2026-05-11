import { describe, it, expect } from 'test-anywhere';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const pagesWorkflowPath = '.github/workflows/js.yml';
const pagesWorkflow = existsSync(pagesWorkflowPath)
  ? readFileSync(pagesWorkflowPath, 'utf8').replaceAll('\r\n', '\n')
  : '';
const siteApp = existsSync('site/App.jsx')
  ? readFileSync('site/App.jsx', 'utf8')
  : '';
const siteDownloads = existsSync('site/downloads.js')
  ? readFileSync('site/downloads.js', 'utf8')
  : '';
const siteIndex = existsSync('site/index.html')
  ? readFileSync('site/index.html', 'utf8')
  : '';
const pagesE2e = existsSync('scripts/test-pages-e2e.mjs')
  ? readFileSync('scripts/test-pages-e2e.mjs', 'utf8')
  : '';

function e2eLocalReleaseAssets() {
  return (
    pagesE2e.match(/const LOCAL_RELEASE_ASSETS = \[([\s\S]*?)\];/)?.[1] ?? ''
  );
}

describe('GitHub Pages download site', () => {
  it('has a reproducible React build script', () => {
    expect(packageJson.scripts['build:site']).toBe(
      'node scripts/build-site.mjs'
    );
    expect(pagesWorkflow).toContain('npm run test:pages:e2e');
    expect(existsSync('scripts/build-site.mjs')).toBe(true);
    expect(existsSync('site/downloads.js')).toBe(true);
    expect(siteIndex).toContain('<div id="root"></div>');
    expect(siteIndex).toContain('assets/app-preview.png');
  });

  it('deploys the built site with the official GitHub Pages actions', () => {
    expect(pagesWorkflow).toContain('actions/configure-pages@v5');
    expect(pagesWorkflow).toContain('actions/upload-pages-artifact@v4');
    expect(pagesWorkflow).toContain('actions/deploy-pages@v4');
    expect(pagesWorkflow).toContain('enablement: true');
    // Regression for issue #28: the deploy job must trigger on both
    // main-branch pushes AND tag pushes, so the download page is
    // never stale relative to the latest GitHub Release.
    expect(pagesWorkflow).toContain(
      "if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))"
    );
    expect(pagesWorkflow).toContain('path: site/dist');
    expect(pagesWorkflow).toContain('pages: write');
    expect(pagesWorkflow).toContain('id-token: write');
    expect(pagesWorkflow).toContain('timeout-minutes: 10');
  });

  it('rebuilds on every main push and tag push, not only when site files change', () => {
    // Regression for issue #28: the previous condition gated pages-build
    // on `pages-changed`, which left main/tag pushes that did not touch
    // site files with a silently skipped deploy. The current condition
    // must include both `refs/heads/main` and `refs/tags/v*` pushes.
    expect(pagesWorkflow).toContain(
      "(github.event_name == 'push' && github.ref == 'refs/heads/main')"
    );
    expect(pagesWorkflow).toContain(
      "(github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v'))"
    );
    // The PR path is still gated on pages-changed so PR feedback stays
    // fast for unrelated PRs.
    expect(pagesWorkflow).toContain(
      "(github.event_name == 'pull_request' && needs.detect-changes.outputs.pages-changed == 'true')"
    );
  });

  it('detects language, theme, and operating system for the primary download', () => {
    expect(siteApp).toContain('navigator.languages');
    expect(siteApp).toContain("matchMedia('(prefers-color-scheme: dark)'");
    expect(siteApp).toContain('navigator.userAgentData');
    expect(siteApp).toContain('detectOperatingSystem');
    expect(siteApp).toContain('detectLocale');
    expect(siteApp).toContain('detectTheme');
  });

  it('loads latest release assets without synthesizing absent asset links', () => {
    expect(siteDownloads).toContain(
      'https://api.github.com/repos/konard/vk-bot-desktop/releases/latest'
    );
    expect(siteApp).toContain('resolveDownloadHref');
    expect(siteApp).toContain('resolveDownloadAsset');
    expect(siteApp).toContain('resolveChecksumHref');
    expect(siteDownloads).toContain('assetNameFor');
    expect(siteApp).toContain('downloadUnavailable');
    expect(siteApp).toContain('download-primary-card');
    expect(siteApp).toContain('download-chip');
    expect(siteApp).not.toContain('/releases/latest/download/vk-bot-desktop-');
    expect(siteDownloads).not.toContain(
      '/releases/latest/download/vk-bot-desktop-'
    );
  });

  it('runs browser-commander e2e checks before and after Pages deployment', () => {
    expect(packageJson.scripts['test:pages:e2e']).toBe(
      'node scripts/test-pages-e2e.mjs'
    );
    expect(existsSync('scripts/test-pages-e2e.mjs')).toBe(true);
    expect(pagesWorkflow).toContain('browser-commander@0.8.0');
    expect(pagesWorkflow).toContain('playwright@1.59.1');
    expect(readFileSync('scripts/test-pages-e2e.mjs', 'utf8')).toContain(
      'Page links to release assets that are absent from the latest release'
    );
    expect(pagesWorkflow).toContain('Test built Pages site before deploy');
    expect(pagesWorkflow).toContain(
      'npm run test:pages:e2e -- --site-dir site/dist'
    );
    expect(pagesWorkflow).toContain('Test published Pages site after deploy');
    expect(pagesWorkflow).toContain(
      'npm run test:pages:e2e -- --url "${{ steps.deployment.outputs.page_url }}"'
    );
  });

  it('requires macOS assets in the built-site release fixture', () => {
    const localReleaseAssets = e2eLocalReleaseAssets();

    expect(localReleaseAssets).toContain(
      'vk-bot-desktop-macos-arm64-0.9.8.dmg'
    );
    expect(localReleaseAssets).toContain('vk-bot-desktop-macos-x64-0.9.8.dmg');
    expect(localReleaseAssets).toContain(
      'vk-bot-desktop-windows-installer-arm64-0.9.8.exe'
    );
    expect(localReleaseAssets).toContain(
      'vk-bot-desktop-linux-arm64-0.9.8.AppImage'
    );
  });

  it('has expandable verification instructions and OS-specific preview chrome', () => {
    expect(siteApp).toContain('verifyRegular');
    expect(siteApp).toContain('verifyAdvanced');
    expect(siteApp).toContain('VerificationTool');
    expect(siteApp).toContain('crypto.subtle.digest');
    expect(siteApp).toContain('gh attestation verify');
    expect(siteApp).toContain('resolveProvenanceHref');
    expect(siteApp).toContain('window-frame');
    expect(siteApp).toContain('previewImageFor(locale, theme)');
    expect(siteApp).toContain('className={`hero-media ${previewOs}`}');
    expect(siteDownloads).toContain('PROVENANCE_ASSET_NAME');
  });

  it('documents the macOS Gatekeeper first-launch workflow for ad-hoc builds', () => {
    expect(siteApp).toContain('install-macos');
    expect(siteApp).toContain('installMacosTitle');
    expect(siteApp).toContain('installMacosTerminalTitle');
    expect(siteApp).toContain('installMacosSettingsTitle');
    expect(siteApp).toContain('MACOS_INSTALL_COMMAND');
    expect(siteApp).toContain('xattr -dr com.apple.quarantine');
    expect(siteApp).toContain('Open the app on macOS');
    expect(siteApp).toContain('Открытие приложения на macOS');
    expect(
      siteApp.indexOf("installMacosSettingsTitle')}</summary>")
    ).toBeLessThan(siteApp.indexOf("installMacosTerminalTitle')}</summary>"));
  });
});
