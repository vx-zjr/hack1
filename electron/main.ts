import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#05080A',
    title: 'HACK//OS Demo',
    icon: path.join(__dirname, '../public/assets/logo-mark.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true,
    },
  });

  mainWindow.maximize();
  mainWindow.setFullScreen(true);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase();
    const zoomKey = ['+', '=', '-', '_', '0'].includes(key);
    if ((input.control || input.meta) && zoomKey) {
      event.preventDefault();
    }
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('high-dpi-support', '1');
if (process.env.HACKOS_PROXY_SERVER) {
  app.commandLine.appendSwitch('proxy-server', process.env.HACKOS_PROXY_SERVER);
  app.commandLine.appendSwitch('proxy-bypass-list', '<local>;127.0.0.1;localhost');
}

app.whenReady().then(() => {
  ipcMain.on('app:close-confirmed', () => {
    app.quit();
  });

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
