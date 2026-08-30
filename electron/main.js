const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const PORT = process.env.PORT || 3000;

const UPDATE_FEED_URL = 'https://smart-home-inventory-mu.vercel.app/updates/win';

let mainWindow;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function backendDir() {
  return path.join(__dirname, '..', 'backend');
}

function startBackend() {
  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'database.db')
    : path.join(backendDir(), 'database.db');

  process.env.DB_PATH = dbPath;

  const createServer = require(path.join(backendDir(), 'server.js'));
  const server = createServer();

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendUpdateStatus(status) {
  mainWindow?.webContents.send('update-status', status);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({ provider: 'generic', url: UPDATE_FEED_URL });

  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ state: 'up-to-date' }));
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ state: 'available', version: info.version });
    autoUpdater.downloadUpdate();
  });
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ state: 'downloading', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ state: 'ready', version: info.version });
  });
  autoUpdater.on('error', (err) => {
    sendUpdateStatus({ state: 'error', message: err.message });
  });

  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
      sendUpdateStatus({ state: 'dev-mode' });
      return;
    }
    autoUpdater.checkForUpdates().catch((err) => sendUpdateStatus({ state: 'error', message: err.message }));
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

if (gotSingleInstanceLock) {
  app.whenReady().then(async () => {
    try {
      await startBackend();
    } catch (err) {
      dialog.showErrorBox(
        'Smart Home Inventory failed to start',
        `The local server could not start (it may already be running): ${err.message}`
      );
      app.quit();
      return;
    }

    setupAutoUpdater();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
