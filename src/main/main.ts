import { app, BrowserWindow, session, nativeTheme, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers, setRootFolder } from './ipc/fileSystem'
import { registerConfigHandlers } from './ipc/config'
import { readConfig, mergeConfig, saveWindowBounds, applyWindowBounds, Config } from './config'

// Force software rendering on Linux — GBM driver errors (unsupported buffer
// formats) cause Chromium's GPU helper process to fail, leaving the window
// blank. disableHardwareAcceleration() alone is insufficient because the GPU
// sandbox process initializes GBM before the flag is honored.
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-software-rasterizer')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow(config: Config) {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  // Restore window bounds
  applyWindowBounds(win, config.window)

  // Save bounds on close
  win.on('close', () => {
    if (win) saveWindowBounds(win)
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Security: Block navigation and window.open
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

let cachedConfig: Config | null = null

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
    // Forward file path arg to renderer
    const filePath = argv.find(
      a => a.endsWith('.md') || a.endsWith('.excalidraw')
    )
    if (filePath) {
      win.webContents.send('open-file', filePath)
    }
  }
})

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    const config = cachedConfig || (await readConfig())
    createWindow(config)
  }
})

app.whenReady().then(async () => {
  // Security: Set Content Security Policy header
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        ],
      },
    })
  })

  registerIpcHandlers()
  registerConfigHandlers()
  cachedConfig = await readConfig()
  if (cachedConfig.rootFolder) setRootFolder(cachedConfig.rootFolder)

  // Theme: sync nativeTheme with config (use already-read cachedConfig — no second disk read)
  nativeTheme.themeSource = cachedConfig.theme === 'system' ? 'system' : cachedConfig.theme

  nativeTheme.on('updated', () => {
    if (win) {
      win.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
    }
  })

  createWindow(cachedConfig)

  // Theme IPC handlers
  ipcMain.handle('theme:get-system-dark', () => nativeTheme.shouldUseDarkColors)

  ipcMain.handle('theme:set', async (_e, setting: string) => {
    if (setting === 'system' || setting === 'light' || setting === 'dark') {
      nativeTheme.themeSource = setting
      await mergeConfig({ theme: setting as 'system' | 'light' | 'dark' })
    }
  })
})
