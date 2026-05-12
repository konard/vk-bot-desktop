'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vkbot', {
  getSystemTheme: () => ipcRenderer.invoke('vkbot:get-system-theme'),
  getSystemLocale: () => ipcRenderer.invoke('vkbot:get-system-locale'),
  loadConfig: () => ipcRenderer.invoke('vkbot:load-config'),
  saveConfig: (config) => ipcRenderer.invoke('vkbot:save-config', config),
  startLocal: (config) => ipcRenderer.invoke('vkbot:start-local', config),
  stopLocal: () => ipcRenderer.invoke('vkbot:stop-local'),
  getStatus: () => ipcRenderer.invoke('vkbot:get-status'),
  openTokenUrl: (url) => ipcRenderer.invoke('vkbot:open-token-url', url),
  copyText: (text) => ipcRenderer.invoke('vkbot:copy-text', text),
  buildServerScript: (options) =>
    ipcRenderer.invoke('vkbot:server-script', options),
  readStats: () => ipcRenderer.invoke('vkbot:read-stats'),
  fetchOutgoing: (token) => ipcRenderer.invoke('vkbot:fetch-outgoing', token),
  onLog: (handler) => {
    const listener = (_event, line) => handler(line);
    ipcRenderer.on('vkbot:log', listener);
    return () => ipcRenderer.removeListener('vkbot:log', listener);
  },
  onStatus: (handler) => {
    const listener = (_event, status) => handler(status);
    ipcRenderer.on('vkbot:status', listener);
    return () => ipcRenderer.removeListener('vkbot:status', listener);
  },
  onToken: (handler) => {
    const listener = (_event, token) => handler(token);
    ipcRenderer.on('vkbot:token', listener);
    return () => ipcRenderer.removeListener('vkbot:token', listener);
  },
});
