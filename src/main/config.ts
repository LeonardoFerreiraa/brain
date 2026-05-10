import { app, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}

export interface SessionConfig {
  openTabs: string[]
  activeTab: string | null
}

export interface Config {
  version: number
  rootFolder: string | null
  window: WindowBounds
  session: SessionConfig
  recentFolders: string[]
  theme: 'system' | 'light' | 'dark'
}

const DEFAULT_CONFIG: Config = {
  version: 1,
  rootFolder: null,
  window: { x: 100, y: 100, width: 1200, height: 800, maximized: false },
  session: { openTabs: [], activeTab: null },
  recentFolders: [],
  theme: 'system',
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export async function readConfig(): Promise<Config> {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Config>
    return migrate(parsed)
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function migrate(raw: Partial<Config>): Config {
  // v0: missing version field → upgrade to v1
  if (!raw.version) {
    raw.version = 1
  }
  // Deep merge with defaults
  return {
    version: raw.version ?? DEFAULT_CONFIG.version,
    rootFolder: raw.rootFolder ?? DEFAULT_CONFIG.rootFolder,
    window: { ...DEFAULT_CONFIG.window, ...(raw.window ?? {}) },
    session: {
      openTabs: raw.session?.openTabs ?? [],
      activeTab: raw.session?.activeTab ?? null,
    },
    recentFolders: raw.recentFolders ?? [],
    theme: raw.theme ?? DEFAULT_CONFIG.theme,
  }
}

export async function writeConfig(config: Config): Promise<void> {
  const configPath = getConfigPath()
  const tmpPath = configPath + '.tmp'
  await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf-8')
  await fs.rename(tmpPath, configPath)
}

// BUG-19: serialize all mergeConfig calls through a promise chain so concurrent
// callers (e.g. saveWindowBounds on quit racing config:set from renderer) each
// read and write the fully-committed state of the previous write.
let writeQueue: Promise<unknown> = Promise.resolve()

export async function mergeConfig(partial: Partial<Config>): Promise<Config> {
  const result = writeQueue.then(async (): Promise<Config> => {
    const current = await readConfig()
    const merged: Config = {
      ...current,
      ...partial,
      version: current.version,
      // Objects: deep merge
      window: partial.window ? { ...current.window, ...partial.window } : current.window,
      session: partial.session ? { ...current.session, ...partial.session } : current.session,
      // Arrays: replace wholesale
      recentFolders: partial.recentFolders ?? current.recentFolders,
    }
    await writeConfig(merged)
    return merged
  })
  writeQueue = result.catch(() => {})
  return result
}

export function saveWindowBounds(win: BrowserWindow): Promise<void> {
  const bounds = win.getBounds()
  const maximized = win.isMaximized()
  return mergeConfig({ window: { ...bounds, maximized } }).then(() => undefined)
}

export function applyWindowBounds(win: BrowserWindow, bounds: WindowBounds): void {
  if (bounds.maximized) {
    win.maximize()
  } else {
    win.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height })
  }
}
