const { app, BrowserWindow, ipcMain, Notification, Menu, Tray, nativeImage, screen, dialog } = require('electron');

// Suppress GPU process crashes on machines with incompatible drivers
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
const path = require('node:path');
const fs = require('node:fs');

const Store = require('electron-store');
const offlineStore = new Store({ name: 'offline-data' });

if (require('electron-squirrel-startup')) app.quit();
// Auto-update only makes sense in a packaged, installed build — running it
// during `npm start` throws because there's no packaged app to check/update.
if (app.isPackaged) {
  const { updateElectronApp } = require('update-electron-app');
  updateElectronApp({
    repo: 'Disura1/pos-desktop',
    updateInterval: '1 hour',
  });
}

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
  screen.on('display-added', () => {
    if (!customerWindow) createCustomerWindow();
  });
  screen.on('display-removed', () => {
    if (customerWindow && screen.getAllDisplays().length <= 1) customerWindow.close();
  });
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
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
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
  if (typeof receiptHtml !== 'string' || receiptHtml.length > 100000) {
    console.error('print-receipt: invalid or oversized HTML rejected');
    return;
  }

  // 80mm roll — printable width is ~76mm (1.5mm non-printable each side per DBL 365B spec).
  // Body is centred with margin:0 auto so content fills the roll left-to-right correctly.
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        width: 73mm;
        margin-left: 5mm;
        padding: 10mm 0 7mm 0;
      }
    </style>
  </head><body>${receiptHtml}</body></html>`;

  // Write to a temp file — data: URLs block executeJavaScript so we can't measure height.
  const tmpFile = path.join(require('os').tmpdir(), `receipt_${Date.now()}.html`);
  fs.writeFileSync(tmpFile, fullHtml, 'utf8');

  const printWin = new BrowserWindow({
    show: false,
    width: 400,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await printWin.loadURL(`file://${tmpFile}`);
  // Measure exact content height so the printed page has no trailing blank paper.
  const contentHeightPx = await printWin.webContents.executeJavaScript(
    'document.body.scrollHeight'
  );
  fs.unlink(tmpFile, () => {});

  // Convert px (96dpi) → microns. Add 6mm (6000µm) bottom feed so the last line
  // clears the cutter blade before the printer cuts/stops.
  const heightMicrons = Math.round(contentHeightPx / 96 * 25.4 * 1000) + 3000;
  const widthMicrons  = 80000; // 80mm roll

  printWin.webContents.print(
    {
      silent: true,
      printBackground: false,
      margins: { marginType: 'none' },
      pageSize: { width: widthMicrons, height: heightMicrons },
    },
    () => printWin.close()
  );
});

ipcMain.handle('print-label', async (event, { html, widthMicrons, heightMicrons }) => {
  if (typeof html !== 'string' || html.length > 500000) return;

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; width: 30mm; background: #fff; }
    </style>
  </head><body>${html}</body></html>`;

  const tmpFile = path.join(require('os').tmpdir(), `label_${Date.now()}.html`);
  fs.writeFileSync(tmpFile, fullHtml, 'utf8');

  const printWin = new BrowserWindow({
    show: false,
    width: 200,
    height: 400,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await printWin.loadURL(`file://${tmpFile}`);
  fs.unlink(tmpFile, () => {});

  printWin.webContents.print(
    {
      silent: true,
      printBackground: true,
      margins: { marginType: 'none' },
      pageSize: { width: widthMicrons, height: heightMicrons },
    },
    () => printWin.close()
  );
});

ipcMain.handle('open-cash-drawer', async () => {
  if (require('os').platform() !== 'win32') return { ok: false };

  // Send ESC/POS drawer kick bytes via Windows RAW spooler using .NET P/Invoke.
  // This works with any USB thermal printer without extra npm packages.
  const ps = String.raw`
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
  public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] buf, int cb, out int written);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
  public struct DOCINFO { public int cbSize; public string pDocName; public string pOutputFile; public string pDatatype; public int fwType; }
}
"@
$name = (Get-WmiObject -Query "SELECT Name FROM Win32_Printer WHERE Default=$true").Name
if (!$name) { exit 1 }
$h = [IntPtr]::Zero
[RawPrint]::OpenPrinter($name, [ref]$h, [IntPtr]::Zero) | Out-Null
$di = New-Object RawPrint+DOCINFO; $di.cbSize=20; $di.pDocName="drawer"; $di.pDatatype="RAW"
[RawPrint]::StartDocPrinter($h, 1, [ref]$di) | Out-Null
[RawPrint]::StartPagePrinter($h) | Out-Null
$bytes = [byte[]](0x10,0x14,0x01,0x00,0x05); $w=0
[RawPrint]::WritePrinter($h, $bytes, $bytes.Length, [ref]$w) | Out-Null
[RawPrint]::EndPagePrinter($h) | Out-Null
[RawPrint]::EndDocPrinter($h) | Out-Null
[RawPrint]::ClosePrinter($h) | Out-Null
exit 0
`;

  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps],
      { timeout: 6000 },
      (err) => resolve({ ok: !err })
    );
  });
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
