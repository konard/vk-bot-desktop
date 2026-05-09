'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vkbot', {
  getSystemTheme: () => ipcRenderer.invoke('vkbot:get-system-theme'),
  getSystemLocale: () => ipcRenderer.invoke('vkbot:get-system-locale'),
  loadConfig: () => ipcRenderer.invoke('vkbot:load-config'),
  saveConfig: (config) => ipcRenderer.invoke('vkbot:save-config', config),
  startLocal: (config) => ipcRenderer.invoke('vkbot:start-local', config),
  stopLocal: () => ipcRenderer.invoke('vkbot:stop-local'),
  buildServerScript: (options) =>
    ipcRenderer.invoke('vkbot:server-script', options),
  onLog: (handler) => {
    const listener = (_event, line) => handler(line);
    ipcRenderer.on('vkbot:log', listener);
    return () => ipcRenderer.removeListener('vkbot:log', listener);
  },
});
