const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (html) => ipcRenderer.invoke('print-receipt', html),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onLowStockAlert: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('low-stock-alert', handler);
    // Return a cleanup function so callers can remove the listener
    return () => ipcRenderer.removeListener('low-stock-alert', handler);
  },
  sendCartUpdate: (cartData) => ipcRenderer.invoke('cart-update', cartData),
  onCartUpdate: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('cart-updated', handler);
    return () => ipcRenderer.removeListener('cart-updated', handler);
  },
  exportFile: (defaultName, content) => ipcRenderer.invoke('export-file', { defaultName, content }),
  offlineCache: {
    getCatalog: () => ipcRenderer.invoke('offline-get-catalog'),
    setCatalog: (data) => ipcRenderer.invoke('offline-set-catalog', data),
    getQueue: () => ipcRenderer.invoke('offline-get-queue'),
    addToQueue: (sale) => ipcRenderer.invoke('offline-add-queue', sale),
    removeFromQueue: (localId) => ipcRenderer.invoke('offline-remove-queue', localId),
  },
});
