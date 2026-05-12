'use strict';

const path = require('path');
const { fork, spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require('electron');
const {
  extractVkOAuthBlankToken,
  isAllowedVkAuthNavigation,
} = require('./oauth-token.cjs');

const KATE_MOBILE_TOKEN_URL =
  'https://oauth.vk.com/authorize?client_id=2685278&scope=1073737727&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1';
const ALLOWED_TOKEN_URLS = new Set([KATE_MOBILE_TOKEN_URL]);

function runLocalCommand(argv) {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', () => resolve({ exitCode: 1, stdout, stderr }));
    child.on('exit', (code) =>
      resolve({ exitCode: code ?? 1, stdout, stderr })
    );
  });
}

let mainWindow;
let botProcess = null;
let oauthWindow = null;

function botStatus() {
  return { running: Boolean(botProcess) };
}

function sendBotStatus() {
  mainWindow?.webContents.send('vkbot:status', botStatus());
}

function closeOauthWindow() {
  const current = oauthWindow;
  oauthWindow = null;
  if (current && !current.isDestroyed()) {
    current.close();
  }
}

function captureOauthTokenFromNavigation(url) {
  const token = extractVkOAuthBlankToken(url);
  if (!token) {
    return false;
  }
  mainWindow?.webContents.send('vkbot:token', token);
  closeOauthWindow();
  return true;
}

function handleOauthWindowNavigation(event, url) {
  if (captureOauthTokenFromNavigation(url)) {
    event.preventDefault();
    return;
  }
  if (!isAllowedVkAuthNavigation(url)) {
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  }
}

async function openOauthWindow(url) {
  closeOauthWindow();
  const window = new BrowserWindow({
    width: 720,
    height: 780,
    title: 'VK Authorization',
    parent: mainWindow,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  oauthWindow = window;
  window.removeMenu();
  window.webContents.on('will-redirect', handleOauthWindowNavigation);
  window.webContents.on('will-navigate', handleOauthWindowNavigation);
  window.webContents.on('did-navigate', (_event, navigationUrl) => {
    captureOauthTokenFromNavigation(navigationUrl);
  });
  window.webContents.on('did-navigate-in-page', (_event, navigationUrl) => {
    captureOauthTokenFromNavigation(navigationUrl);
  });
  window.webContents.setWindowOpenHandler(({ url: navigationUrl }) => {
    if (captureOauthTokenFromNavigation(navigationUrl)) {
      return { action: 'deny' };
    }
    if (isAllowedVkAuthNavigation(navigationUrl)) {
      window.loadURL(navigationUrl).catch(() => {});
    } else {
      shell.openExternal(navigationUrl).catch(() => {});
    }
    return { action: 'deny' };
  });
  window.on('closed', () => {
    if (oauthWindow === window) {
      oauthWindow = null;
    }
  });
  await window.loadURL(url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 720,
    title: 'VK Bot Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (botProcess) {
    botProcess.kill();
    botProcess = null;
  }
  closeOauthWindow();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('vkbot:get-system-theme', () =>
  nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
);

ipcMain.handle('vkbot:get-system-locale', () => {
  const locale = (app.getLocale() || 'en').toLowerCase();
  if (locale.startsWith('ru')) {
    return 'ru';
  }
  return 'en';
});

ipcMain.handle('vkbot:save-config', async (_event, config) => {
  const { LinoStore } = await import('../src/lino-store.js');
  const store = new LinoStore();
  return store.saveConfig(config, 'global');
});

ipcMain.handle('vkbot:load-config', async () => {
  const { LinoStore } = await import('../src/lino-store.js');
  const store = new LinoStore();
  return store.loadLayered();
});

ipcMain.handle('vkbot:get-status', () => botStatus());

ipcMain.handle('vkbot:open-token-url', async (_event, url) => {
  if (!ALLOWED_TOKEN_URLS.has(url)) {
    throw new Error('Unsupported token URL');
  }
  await openOauthWindow(url);
  return { ok: true };
});

ipcMain.handle('vkbot:start-local', async (_event, config) => {
  if (botProcess) {
    sendBotStatus();
    return { ok: true, alreadyRunning: true };
  }
  let stoppedOther = false;
  try {
    const { ensureMutualExclusion } =
      await import('../src/server/bot-lifecycle.js');
    const result = await ensureMutualExclusion({
      targetMode: 'local',
      localRunner: runLocalCommand,
    });
    stoppedOther = Boolean(result?.stoppedOther);
  } catch {
    stoppedOther = false;
  }
  botProcess = fork(path.join(__dirname, '..', 'src', 'bot', 'runner.js'), [], {
    env: {
      ...process.env,
      VK_BOT_DESKTOP_RUNTIME_CONFIG: JSON.stringify(config || {}),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  botProcess.stdout.on('data', (chunk) =>
    mainWindow?.webContents.send('vkbot:log', chunk.toString())
  );
  botProcess.stderr.on('data', (chunk) =>
    mainWindow?.webContents.send('vkbot:log', chunk.toString())
  );
  sendBotStatus();
  botProcess.on('exit', (code) => {
    mainWindow?.webContents.send('vkbot:log', `Bot exited with code ${code}\n`);
    botProcess = null;
    sendBotStatus();
  });
  return { ok: true, stoppedOther };
});

ipcMain.handle('vkbot:stop-local', () => {
  if (botProcess) {
    botProcess.kill();
    botProcess = null;
  }
  sendBotStatus();
  return { ok: true };
});

ipcMain.handle('vkbot:server-script', async (_event, options) => {
  const { buildInstallPlan } = await import('../src/server/ssh-installer.js');
  return buildInstallPlan({
    ...options,
    bundleArchiveBase64:
      options?.bundleArchiveBase64 || 'PLACEHOLDER_BUNDLE_NOT_BUILT',
  });
});

ipcMain.handle('vkbot:read-stats', async () => {
  const { LinoStore } = await import('../src/lino-store.js');
  const { StatsStore, statsRootFor } = await import('../src/bot/stats.js');
  const store = new LinoStore();
  const stats = new StatsStore({ rootDir: statsRootFor(store) });
  return stats.snapshot();
});

ipcMain.handle('vkbot:fetch-outgoing', async (_event, token) => {
  if (!token) {
    return [];
  }
  try {
    const { VK } = await import('vk-io');
    const vk = new VK({ token });
    const { fetchOutgoingRequestIds } =
      await import('../src/bot/fetch-outgoing-requests.js');
    return await fetchOutgoingRequestIds({ vk });
  } catch {
    return [];
  }
});
