const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (html) => ipcRenderer.invoke('print-receipt', html),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onLowStockAlert: (callback) => ipcRenderer.on('low-stock-alert', (_, data) => callback(data)),
});
