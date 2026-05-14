#!/usr/bin/env node
/**
 * Regenerate every preview screenshot whose appearance is decided by code in
 * this repository (issue #51). Drives the renderer + the GitHub Pages site
 * through a Chromium controlled by `browser-commander`, so the screenshots
 * always reflect the current UI rather than a hand-captured snapshot.
 *
 * Outputs:
 *   - site/assets/app-preview-{en,ru}-{light,dark}.png   (renderer tiles)
 *   - site/assets/app-preview.png                        (en/light fallback)
 *   - docs/screenshots/issue-26-pages-en-dark.png        (README landing image)
 *
 * Usage:
 *   node scripts/update-preview-images.mjs
 *   PREVIEW_VERBOSE=1 node scripts/update-preview-images.mjs
 *   node scripts/update-preview-images.mjs --skip-build  # if you just ran build:* yourself
 *
 * The script:
 *   1. Runs `npm run build:renderer` and `npm run build:site` so the static
 *      bundles exist (skip with --skip-build).
 *   2. Starts two static HTTP servers — one rooted at electron/renderer for
 *      the desktop UI, one rooted at site/dist for the Pages site.
 *   3. For each (locale, theme) ∈ {en,ru} × {light,dark}, creates a new
 *      Playwright browser context with the matching `locale`, emulates the
 *      matching `prefers-color-scheme` via browser-commander, sets the
 *      theme localStorage key, navigates, waits for the rendered shell,
 *      and writes the PNG.
 *   4. Captures the Pages landing screenshot for README.md with the
 *      release-API call stubbed to a fixture (so the captured image is
 *      reproducible across runs and does not depend on a live network).
 *
 * Verbose mode (`PREVIEW_VERBOSE=1`) enables browser-commander tracing,
 * dumps each PNG signature, and prints the resolved `<html data-theme>` /
 * `<html lang>` so a future regression is diagnosable from CI logs alone.
 */
/* global document, window */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeBrowserCommander } from 'browser-commander';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const rendererDir = path.resolve(repoRoot, 'electron', 'renderer');
const siteDistDir = path.resolve(repoRoot, 'site', 'dist');
const siteAssetsDir = path.resolve(repoRoot, 'site', 'assets');
const readmeShotsDir = path.resolve(repoRoot, 'docs', 'screenshots');

const VERBOSE =
  process.env.PREVIEW_VERBOSE === '1' || process.env.PREVIEW_VERBOSE === 'true';

const RELEASE_API_URL =
  'https://api.github.com/repos/konard/vk-bot-desktop/releases/latest';

// Static (non-CI) fixture so the Pages screenshot is byte-stable across
// runs that happen between two real releases. The capture only needs the
// page to render with a representative latest-version label.
const PAGES_RELEASE_FIXTURE_TAG = 'v0.11.0';
const PAGES_RELEASE_FIXTURE_VERSION = '0.11.0';
const PAGES_RELEASE_FIXTURE_ASSETS = [
  `vk-bot-desktop-macos-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.dmg`,
  `vk-bot-desktop-macos-x64-${PAGES_RELEASE_FIXTURE_VERSION}.dmg`,
  `vk-bot-desktop-macos-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.zip`,
  `vk-bot-desktop-macos-x64-${PAGES_RELEASE_FIXTURE_VERSION}.zip`,
  `vk-bot-desktop-windows-installer-x64-${PAGES_RELEASE_FIXTURE_VERSION}.exe`,
  `vk-bot-desktop-windows-installer-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.exe`,
  `vk-bot-desktop-windows-portable-x64-${PAGES_RELEASE_FIXTURE_VERSION}.exe`,
  `vk-bot-desktop-windows-portable-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.exe`,
  `vk-bot-desktop-linux-x64-${PAGES_RELEASE_FIXTURE_VERSION}.AppImage`,
  `vk-bot-desktop-linux-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.AppImage`,
  `vk-bot-desktop-linux-x64-${PAGES_RELEASE_FIXTURE_VERSION}.deb`,
  `vk-bot-desktop-linux-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.deb`,
  `vk-bot-desktop-linux-x64-${PAGES_RELEASE_FIXTURE_VERSION}.tar.gz`,
  `vk-bot-desktop-linux-arm64-${PAGES_RELEASE_FIXTURE_VERSION}.tar.gz`,
  'SHA256SUMS.txt',
  'BUILD-PROVENANCE.txt',
];

const RENDERER_VIEWPORT = { width: 900, height: 1078 };
const PAGES_VIEWPORT = { width: 1440, height: 950 };

const LOCALES = [
  { locale: 'en', contextLocale: 'en-US' },
  { locale: 'ru', contextLocale: 'ru-RU' },
];
const THEMES = ['light', 'dark'];

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function log(message) {
  console.log(`[preview] ${message}`);
}

function verbose(message) {
  if (VERBOSE) {
    console.log(`[preview:verbose] ${message}`);
  }
}

function parseArgs(argv) {
  const args = { skipBuild: false };

  for (const value of argv) {
    if (value === '--skip-build') {
      args.skipBuild = true;
    } else if (value === '--help' || value === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }

  return args;
}

function runNpm(scriptName) {
  return new Promise((resolve, reject) => {
    log(`running npm run ${scriptName}`);
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCommand, ['run', scriptName], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm run ${scriptName} exited with code ${code}`));
      }
    });
  });
}

async function createStaticServer(rootDir) {
  const root = path.resolve(rootDir);

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const pathname =
        requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
      const requestedPath = path.resolve(
        root,
        `.${decodeURIComponent(pathname)}`
      );

      if (
        requestedPath !== root &&
        !requestedPath.startsWith(`${root}${path.sep}`)
      ) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const fileStat = await stat(requestedPath);
      const filePath = fileStat.isDirectory()
        ? path.join(requestedPath, 'index.html')
        : requestedPath;
      const body = await readFile(filePath);
      const contentType =
        contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream';

      response.writeHead(200, { 'content-type': contentType });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/`;

  return {
    url,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function pngDimensions(buffer) {
  if (
    buffer.length < 24 ||
    buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a'
  ) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function reportPng(label, filePath) {
  const buffer = await readFile(filePath);
  const dimensions = pngDimensions(buffer);
  const dimText = dimensions
    ? `${dimensions.width}x${dimensions.height}`
    : 'unknown';
  log(`wrote ${label} (${buffer.length} bytes, ${dimText}) -> ${filePath}`);
  if (VERBOSE) {
    verbose(`PNG signature: ${buffer.toString('hex', 0, 8)}`);
  }
}

async function capturePreviewTile({
  browser,
  locale,
  theme,
  contextLocale,
  url,
}) {
  const colorScheme = theme === 'dark' ? 'dark' : 'light';

  log(`capturing renderer tile: locale=${locale} theme=${theme}`);

  const context = await browser.newContext({
    locale: contextLocale,
    colorScheme,
    viewport: RENDERER_VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  await context.addInitScript(
    ([key, value]) => {
      try {
        // theme.js (`STORAGE_KEY = 'vk-bot-desktop:theme'`) reads this on boot
        // so the segmented Theme control mirrors the captured screenshot.
        window.localStorage.setItem(key, value);
      } catch {
        // localStorage may be locked down — emulateMedia covers the css path.
      }
    },
    ['vk-bot-desktop:theme', theme]
  );

  const page = await context.newPage();

  const commander = makeBrowserCommander({
    page,
    enableNavigationManager: false,
    enableNetworkTracking: false,
    verbose: VERBOSE,
  });

  try {
    await commander.emulateMedia({ colorScheme });

    const navigation = await commander.goto({
      url,
      waitForStableUrlBefore: false,
      waitForStableUrlAfter: false,
      waitForNetworkIdle: false,
      timeout: 30000,
      verificationTimeout: 5000,
    });
    if (!navigation.verified) {
      throw new Error(
        `renderer navigation not verified (${locale}/${theme}): ${navigation.reason}`
      );
    }

    await commander.waitForSelector({ selector: '.app', timeout: 10000 });
    await commander.waitForSelector({
      selector: '.app-header',
      timeout: 10000,
    });

    await page.waitForLoadState('networkidle');

    if (VERBOSE) {
      const probe = await commander.evaluate({
        fn: () => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          lang: document.documentElement.getAttribute('lang'),
          appTitle: document.querySelector('h1')?.textContent ?? '',
          headerControlCount:
            document.querySelectorAll('.header-control').length,
        }),
      });
      verbose(`probe(${locale}/${theme}): ${JSON.stringify(probe)}`);
      if (
        !probe.dataTheme ||
        (probe.dataTheme !== theme && theme !== 'light')
      ) {
        log(
          `WARNING: resolved data-theme="${probe.dataTheme}" but expected "${theme}"`
        );
      }
    }

    const outFile = path.resolve(
      siteAssetsDir,
      `app-preview-${locale}-${theme}.png`
    );
    await mkdir(siteAssetsDir, { recursive: true });
    await page.screenshot({
      path: outFile,
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
    });
    await reportPng(`renderer tile ${locale}/${theme}`, outFile);
    return outFile;
  } finally {
    await commander.destroy();
    await context.close();
  }
}

async function capturePagesLanding({ browser, url }) {
  log('capturing Pages landing screenshot (en/dark)');

  const context = await browser.newContext({
    locale: 'en-US',
    colorScheme: 'dark',
    viewport: PAGES_VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  const page = await context.newPage();

  await page.route(RELEASE_API_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tag_name: PAGES_RELEASE_FIXTURE_TAG,
        assets: PAGES_RELEASE_FIXTURE_ASSETS.map((name) => ({
          name,
          browser_download_url: `https://github.com/konard/vk-bot-desktop/releases/download/${PAGES_RELEASE_FIXTURE_TAG}/${name}`,
        })),
      }),
    })
  );

  const commander = makeBrowserCommander({
    page,
    enableNavigationManager: false,
    enableNetworkTracking: false,
    verbose: VERBOSE,
  });

  try {
    await commander.emulateMedia({ colorScheme: 'dark' });

    const navigation = await commander.goto({
      url,
      waitForStableUrlBefore: false,
      waitForStableUrlAfter: false,
      waitForNetworkIdle: false,
      timeout: 30000,
      verificationTimeout: 5000,
    });
    if (!navigation.verified) {
      throw new Error(`Pages navigation not verified: ${navigation.reason}`);
    }

    await commander.waitForSelector({
      selector: '.primary-download',
      timeout: 15000,
    });
    await page.waitForLoadState('networkidle');

    const outFile = path.resolve(readmeShotsDir, 'issue-26-pages-en-dark.png');
    await mkdir(readmeShotsDir, { recursive: true });
    await page.screenshot({
      path: outFile,
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
    });
    await reportPng('Pages landing image', outFile);
    return outFile;
  } finally {
    await commander.destroy();
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/update-preview-images.mjs [--skip-build]');
    return;
  }

  if (!args.skipBuild) {
    await runNpm('build:renderer');
    await runNpm('build:site');
  }

  const rendererServer = await createStaticServer(rendererDir);
  log(`renderer server: ${rendererServer.url}`);
  const siteServer = await createStaticServer(siteDistDir);
  log(`site server:     ${siteServer.url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const { locale, contextLocale } of LOCALES) {
      for (const theme of THEMES) {
        await capturePreviewTile({
          browser,
          locale,
          theme,
          contextLocale,
          url: rendererServer.url,
        });
      }
    }

    const fallback = path.resolve(siteAssetsDir, 'app-preview.png');
    const fallbackSource = path.resolve(
      siteAssetsDir,
      'app-preview-en-light.png'
    );
    await copyFile(fallbackSource, fallback);
    await reportPng('renderer tile fallback (en/light copy)', fallback);

    await capturePagesLanding({ browser, url: siteServer.url });
  } finally {
    await browser.close();
    await rendererServer.close();
    await siteServer.close();
  }

  log('all preview images regenerated');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
