import { describe, it, expect } from 'test-anywhere';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const pagesWorkflowPath = '.github/workflows/pages.yml';
const pagesWorkflow = existsSync(pagesWorkflowPath)
  ? readFileSync(pagesWorkflowPath, 'utf8').replaceAll('\r\n', '\n')
  : '';
const siteApp = existsSync('site/App.jsx')
  ? readFileSync('site/App.jsx', 'utf8')
  : '';
const siteIndex = existsSync('site/index.html')
  ? readFileSync('site/index.html', 'utf8')
  : '';

describe('GitHub Pages download site', () => {
  it('has a reproducible React build script', () => {
    expect(packageJson.scripts['build:site']).toBe(
      'node scripts/build-site.mjs'
    );
    expect(existsSync('scripts/build-site.mjs')).toBe(true);
    expect(siteIndex).toContain('<div id="root"></div>');
    expect(siteIndex).toContain('assets/app-preview.png');
  });

  it('deploys the built site with the official GitHub Pages actions', () => {
    expect(pagesWorkflow).toContain('actions/configure-pages@v5');
    expect(pagesWorkflow).toContain('actions/upload-pages-artifact@v4');
    expect(pagesWorkflow).toContain('actions/deploy-pages@v4');
    expect(pagesWorkflow).toContain('enablement: true');
    expect(pagesWorkflow).toContain(
      "if: github.event_name == 'push' && github.ref == 'refs/heads/main'"
    );
    expect(pagesWorkflow).toContain('path: site/dist');
    expect(pagesWorkflow).toContain('pages: write');
    expect(pagesWorkflow).toContain('id-token: write');
    expect(pagesWorkflow).toContain('timeout-minutes: 10');
  });

  it('detects language, theme, and operating system for the primary download', () => {
    expect(siteApp).toContain('navigator.languages');
    expect(siteApp).toContain("matchMedia('(prefers-color-scheme: dark)'");
    expect(siteApp).toContain('navigator.userAgentData');
    expect(siteApp).toContain('detectOperatingSystem');
    expect(siteApp).toContain('detectLocale');
    expect(siteApp).toContain('detectTheme');
  });

  it('loads latest release assets and keeps direct fallback download links', () => {
    expect(siteApp).toContain(
      'https://api.github.com/repos/konard/vk-bot-desktop/releases/latest'
    );
    expect(siteApp).toContain(
      'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-macos-arm64.dmg'
    );
    expect(siteApp).toContain(
      'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-linux-x64.AppImage'
    );
    expect(siteApp).toContain(
      'https://github.com/konard/vk-bot-desktop/releases/latest/download/vk-bot-desktop-windows-installer-x64.exe'
    );
    expect(siteApp).toContain('downloadOptions');
  });
});
