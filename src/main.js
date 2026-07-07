const { updateElectronApp } = require('update-electron-app');
updateElectronApp(); // checks your GitHub Releases automatically, no config needed

const { app, BrowserWindow, ipcMain, Notification, Menu, Tray, nativeImage, screen, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const Store = require('electron-store');
const offlineStore = new Store({ name: 'offline-data' });

if (require('electron-squirrel-startup')) app.quit();

let mainWindow;
let tray;
let customerWindow = null;

// __dirname is .webpack/main/ after bundling — assets are copied there by CopyWebpackPlugin
const ICON_PATH = path.join(__dirname, 'assets', 'icon.ico');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    kiosk: process.env.KIOSK_MODE === 'true',
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Teen Girl POS',
    backgroundColor: '#f5f5f5',
    show: false,
    icon: ICON_PATH,
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
};

const createTray = () => {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open Teen Girl POS', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { mainWindow.destroy(); app.quit(); } },
  ]);
  tray.setToolTip('Teen Girl POS System');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow.show());
};

const createCustomerWindow = () => {
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);
  if (!externalDisplay) return; // only one screen — nothing to open

  customerWindow = new BrowserWindow({
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    width: externalDisplay.bounds.width,
    height: externalDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  customerWindow.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?customerDisplay=1`);
  customerWindow.on('closed', () => { customerWindow = null; });
};

app.whenReady().then(() => {
  createWindow();
  createTray();
  createCustomerWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.setLoginItemSettings({ openAtLogin: true });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──────────────────────────────────────────────────

ipcMain.handle('cart-update', (event, cartData) => {
  customerWindow?.webContents.send('cart-updated', cartData);
});

ipcMain.handle('export-file', async (event, { defaultName, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (canceled || !filePath) return { saved: false };
  fs.writeFileSync(filePath, content, 'utf-8');
  return { saved: true, path: filePath };
});

ipcMain.handle('offline-get-catalog', () => offlineStore.get('catalog', []));

ipcMain.handle('offline-set-catalog', (event, data) => {
  if (!Array.isArray(data)) return false;
  offlineStore.set('catalog', data);
  return true;
});

ipcMain.handle('offline-get-queue', () => offlineStore.get('queue', []));

ipcMain.handle('offline-add-queue', (event, sale) => {
  const queue = offlineStore.get('queue', []);
  const entry = { localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, sale, queuedAt: Date.now() };
  queue.push(entry);
  offlineStore.set('queue', queue);
  return entry.localId;
});

ipcMain.handle('offline-remove-queue', (event, localId) => {
  const queue = offlineStore.get('queue', []).filter((q) => q.localId !== localId);
  offlineStore.set('queue', queue);
  return true;
});

ipcMain.handle('print-receipt', async (event, receiptHtml) => {
  // Basic validation — only accept strings, cap size at 100KB
  if (typeof receiptHtml !== 'string' || receiptHtml.length > 100000) {
    console.error('print-receipt: invalid or oversized HTML rejected');
    return;
  }
  const printWin = new BrowserWindow({
    show: false,
    width: 400,
    height: 700,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 72mm; }
    </style>
  </head><body>${receiptHtml}</body></html>`;

  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
  await new Promise(r => setTimeout(r, 300));

  printWin.webContents.print(
    { silent: false, printBackground: false, margins: { marginType: 'none' } },
    () => printWin.close()
  );
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.handle('toggle-fullscreen', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.handle('minimize-window', () => mainWindow.minimize());

ipcMain.handle('maximize-window', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});

ipcMain.handle('get-app-version', () => app.getVersion());
