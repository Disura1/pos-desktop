const { app, BrowserWindow, ipcMain, Notification, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) app.quit();

let mainWindow;
let tray;

// Resolve icon from project root — works correctly with Webpack bundling
const ICON_PATH = path.resolve(app.getAppPath(), 'assets', 'icon.ico');

const createWindow = () => {
  mainWindow = new BrowserWindow({
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

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──────────────────────────────────────────────────

ipcMain.handle('print-receipt', async (event, receiptHtml) => {
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
