#!/usr/bin/env node
/* global document */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { makeBrowserCommander } from 'browser-commander';
import { chromium } from 'playwright';

const RELEASE_API_URL =
  'https://api.github.com/repos/konard/vk-bot-desktop/releases/latest';
const RELEASE_TAG = 'v0.0.0-pages-e2e';
const REQUIRED_RELEASE_ASSETS = [
  'vk-bot-desktop-macos-arm64.dmg',
  'vk-bot-desktop-macos-x64.dmg',
  'vk-bot-desktop-windows-installer-x64.exe',
  'vk-bot-desktop-windows-portable-x64.exe',
  'vk-bot-desktop-linux-x64.AppImage',
  'vk-bot-desktop-linux-x64.deb',
  'vk-bot-desktop-linux-x64.tar.gz',
  'SHA256SUMS.txt',
];
const LOCAL_RELEASE_ASSETS = [
  'vk-bot-desktop-windows-installer-x64.exe',
  'vk-bot-desktop-windows-portable-x64.exe',
  'vk-bot-desktop-linux-x64.AppImage',
  'vk-bot-desktop-linux-x64.deb',
  'vk-bot-desktop-linux-x64.tar.gz',
  'SHA256SUMS.txt',
];

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--url') {
      args.url = argv[index + 1];
      index += 1;
    } else if (value === '--site-dir') {
      args.siteDir = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }

  if (!args.url && !args.siteDir) {
    throw new Error('Pass either --url <url> or --site-dir <path>.');
  }

  return args;
}

async function createStaticServer(siteDir) {
  const root = path.resolve(siteDir);

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

function makeReleaseFixture(assetNames) {
  return {
    tag_name: RELEASE_TAG,
    assets: assetNames.map((name) => ({
      name,
      browser_download_url: `https://github.com/konard/vk-bot-desktop/releases/download/${RELEASE_TAG}/${name}`,
    })),
  };
}

async function fetchLatestRelease() {
  const headers = {
    accept: 'application/vnd.github+json',
  };

  if (process.env.GH_TOKEN) {
    headers.authorization = `Bearer ${process.env.GH_TOKEN}`;
  }

  const response = await fetch(RELEASE_API_URL, { headers });

  if (!response.ok) {
    throw new Error(`Release request failed: ${response.status}`);
  }

  return response.json();
}

function releaseAssetNames(release) {
  return new Set((release?.assets || []).map((asset) => asset.name));
}

async function validatePage({ commander, release, url }) {
  const navigation = await commander.goto({
    url,
    waitForStableUrlBefore: false,
    waitForStableUrlAfter: false,
    waitForNetworkIdle: false,
    timeout: 30000,
    verificationTimeout: 5000,
  });

  if (!navigation.verified) {
    throw new Error(`Navigation was not verified: ${navigation.reason}`);
  }

  await commander.waitForSelector({
    selector: '.primary-download',
    timeout: 10000,
  });

  const result = await commander.evaluate({
    fn: (requiredAssets) => {
      const links = Array.from(document.querySelectorAll('a[href]')).map(
        (link) => ({
          href: link.href,
          text: link.textContent?.trim() ?? '',
        })
      );
      const linkedAssets = requiredAssets.filter((asset) =>
        links.some(({ href }) => href.endsWith(`/${asset}`))
      );

      return {
        title: document.title,
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
        groupCount: document.querySelectorAll('.download-group').length,
        primaryHref:
          document.querySelector('.primary-download')?.getAttribute('href') ??
          '',
        linkedAssets,
        links,
      };
    },
    args: [REQUIRED_RELEASE_ASSETS],
  });

  if (!result.title.includes('VK Bot Desktop')) {
    throw new Error(`Unexpected page title: ${result.title}`);
  }

  if (!result.heading.includes('VK Bot Desktop')) {
    throw new Error(`Unexpected page heading: ${result.heading}`);
  }

  if (result.groupCount < 3) {
    throw new Error(
      `Expected at least 3 download groups, got ${result.groupCount}.`
    );
  }

  if (!result.primaryHref.includes('/releases/download/')) {
    throw new Error(
      `Primary download does not use a release asset: ${result.primaryHref}`
    );
  }

  const availableAssets = releaseAssetNames(release);
  const missingLinkedAssets = result.linkedAssets.filter(
    (asset) => !availableAssets.has(asset)
  );
  const availableAssetsWithoutLinks = REQUIRED_RELEASE_ASSETS.filter(
    (asset) =>
      availableAssets.has(asset) && !result.linkedAssets.includes(asset)
  );

  if (missingLinkedAssets.length > 0) {
    throw new Error(
      `Page links to release assets that are absent from the latest release: ${missingLinkedAssets.join(', ')}`
    );
  }

  if (availableAssetsWithoutLinks.length > 0) {
    throw new Error(
      `Page does not link to available latest release assets: ${availableAssetsWithoutLinks.join(', ')}`
    );
  }
}

async function validateWithRetry({ commander, release, url }) {
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await validatePage({ commander, release, url });
      return;
    } catch (error) {
      lastError = error;

      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let server;
  let url = args.url;
  const release = args.siteDir
    ? makeReleaseFixture(LOCAL_RELEASE_ASSETS)
    : await fetchLatestRelease();

  if (!url) {
    server = await createStaticServer(args.siteDir);
    url = server.url;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  if (args.siteDir) {
    await page.route(RELEASE_API_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(release),
      })
    );
  }

  const commander = makeBrowserCommander({
    page,
    enableNavigationManager: false,
    enableNetworkTracking: false,
    verbose: process.env.PAGES_E2E_VERBOSE === '1',
  });

  try {
    await validateWithRetry({
      commander,
      release,
      url,
    });
    console.log(`Pages e2e checks passed for ${url}`);
  } finally {
    await commander.destroy();
    await browser.close();
    await server?.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
