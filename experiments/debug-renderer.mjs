/* global document */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', 'electron', 'renderer');
const types = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.map', 'application/json'],
]);
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname === '/' ? '/index.html' : u.pathname;
    const file = path.resolve(root, `.${p}`);
    const s = await stat(file);
    const body = await readFile(
      s.isDirectory() ? path.join(file, 'index.html') : file
    );
    res.writeHead(200, {
      'content-type':
        types.get(path.extname(file)) || 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('NF');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
console.log('serving', url);
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1078 },
});
const page = await ctx.newPage();
page.on('console', (msg) => console.log('console:', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('pageerror:', err.message));
page.on('requestfailed', (req) =>
  console.log('reqfail:', req.url(), req.failure()?.errorText)
);
await page.goto(url);
await new Promise((r) => setTimeout(r, 1500));
console.log('title:', await page.title());
console.log('html len:', (await page.content()).length);
console.log(
  'root contents:',
  await page.evaluate(() =>
    document.getElementById('root')?.innerHTML.slice(0, 500)
  )
);
console.log(
  'body classes:',
  await page.evaluate(() => document.body.className)
);
console.log(
  'html data-theme:',
  await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
);
await browser.close();
await new Promise((r) => server.close(r));
