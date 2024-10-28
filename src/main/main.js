const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { IPC_CHANNELS, APP_STATES } = require('../shared/constants');
const P2PService = require('./services/p2p-service');

let mainWindow;
let isTraining = false;
let p2pService;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: true,
    minWidth: 800,
    minHeight: 600
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Initialize P2P service
  try {
    p2pService = new P2PService(mainWindow);
    await p2pService.init();
    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, APP_STATES.CONNECTED);
  } catch (error) {
    console.error('Failed to initialize P2P service:', error);
    mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
      message: 'P2P initialization failed',
      details: error.message
    });
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  startSystemMonitoring();
}

function startSystemMonitoring() {
  setInterval(() => {
    if (!mainWindow) return;

    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
    const memoryUsage = process.memoryUsage();

    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATS, {
      cpu: cpuUsage.toFixed(1),
      memory: memoryUsage.heapUsed,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    });
  }, 1000);
}

function setupIPCHandlers() {
  ipcMain.handle(IPC_CHANNELS.START_TRAINING, async () => {
    try {
      if (isTraining) return { success: false, message: 'Training already in progress' };
      
      isTraining = true;
      mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, APP_STATES.TRAINING);
      
      return { success: true };
    } catch (error) {
      console.error('Training error:', error);
      mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
        message: 'Failed to start training',
        details: error.message
      });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.STOP_TRAINING, async () => {
    try {
      isTraining = false;
      mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, APP_STATES.PAUSED);
      return { success: true };
    } catch (error) {
      console.error('Stop training error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-peer-count', () => {
    return p2pService ? p2pService.getPeerCount() : 0;
  });

  ipcMain.handle('broadcast-message', async (event, message) => {
    if (p2pService) {
      await p2pService.broadcast(message);
      return true;
    }
    return false;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupIPCHandlers();
  
  mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, APP_STATES.INITIALIZING);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
      message: 'An unexpected error occurred',
      details: error.message
    });
  }
});

app.on('before-quit', async () => {
  if (p2pService) {
    await p2pService.stop();
  }
});