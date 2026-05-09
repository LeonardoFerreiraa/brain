import { app, BrowserWindow, session, nativeTheme, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers } from './ipc/fileSystem'
import { registerConfigHandlers, readConfig, mergeConfig, saveWindowBounds, applyWindowBounds, Config } from './config'

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
  win.setWindowOpenHandler(() => ({ action: 'deny' }))

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

  // Theme: sync nativeTheme with config
  const config = await readConfig()
  nativeTheme.themeSource = config.theme === 'system' ? 'system' : config.theme

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
