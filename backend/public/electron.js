const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'AI Agent Dashboard',
    show: false
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    // Path to the backend executable
    const backendPath = path.join(__dirname, '..', 'backend', 'dist', 'AI-Agent-Dashboard.exe');
    
    // Check if executable exists
    if (!fs.existsSync(backendPath)) {
      console.log('Backend executable not found, starting Python backend...');
      
      // Start Python backend as fallback
      const pythonPath = path.join(__dirname, '..', 'backend', 'venv', 'Scripts', 'python.exe');
      const mainPath = path.join(__dirname, '..', 'backend', 'main.py');
      
      if (fs.existsSync(pythonPath)) {
        backendProcess = spawn(pythonPath, [mainPath], {
          cwd: path.join(__dirname, '..', 'backend'),
          stdio: 'pipe'
        });
      } else {
        // Try system Python
        backendProcess = spawn('python', [mainPath], {
          cwd: path.join(__dirname, '..', 'backend'),
          stdio: 'pipe'
        });
      }
    } else {
      // Start the executable
      backendProcess = spawn(backendPath, [], {
        stdio: 'pipe'
      });
    }

    // Handle backend output
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      if (data.toString().includes('Uvicorn running')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('Backend startup timeout, continuing...');
      resolve();
    }, 10000);
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open in Browser',
          click: () => {
            shell.openExternal('http://localhost:8000');
          }
        },
        {
          label: 'Backend Status',
          click: () => {
            shell.openExternal('http://localhost:8000/status');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About AI Agent Dashboard',
          click: () => {
            shell.openExternal('https://github.com/your-repo/ai-agent-dashboard');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
    createMenu();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
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

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 