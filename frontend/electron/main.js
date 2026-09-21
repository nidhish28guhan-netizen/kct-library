'use strict';
/*
 * Electron main process — KCT Library desktop app.
 * Builds the Vite/React UI, starts the backend API as a child process,
 * waits for it to become healthy, then opens the window.
 */
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 4000;
const isDev = !app.isPackaged;
let apiProcess = null;
let mainWindow = null;

const rootDir = isDev
  ? path.join(__dirname, '..')
  : path.join(process.resourcesPath);
const backendDir = path.join(rootDir, 'backend');
const uiDir = path.join(rootDir, 'frontend', 'dist');

function startApi() {
  const entry = path.join(backendDir, 'src', 'server.js');
  apiProcess = spawn(process.execPath, [entry], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(PORT), ELECTRON_RUN_AS_NODE: undefined },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  apiProcess.stdout.on('data', (d) => process.stdout.write(`[api] ${d}`));
  apiProcess.stderr.on('data', (d) => process.stderr.write(`[api] ${d}`));
  apiProcess.on('exit', (code) => console.log(`[api] exited with ${code}`));
}

const waitForApi = () =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/health' }, (res) => {
        res.resume();
        res.statusCode === 200 ? resolve() : retry();
      });
      req.on('error', () => retry());
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('API did not become healthy in time'));
      setTimeout(tick, 500);
    };
    tick();
  });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 960, minHeight: 640,
    title: 'KCT Library',
    backgroundColor: '#f7f4ee',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(uiDir, 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  Menu.setApplicationMenu(null);
}

app.whenReady().then(async () => {
  if (isDev) {
    // dev: the Vite server must already be running (npm run electron:dev)
  } else {
    startApi();
  }
  try {
    if (!isDev) await waitForApi();
    else await waitForApi().catch(() => console.log('[main] API not up yet (dev mode)'));
  } catch (e) {
    console.error(e.message);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (apiProcess) { apiProcess.kill(); apiProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (apiProcess) { apiProcess.kill(); apiProcess = null; }
});
