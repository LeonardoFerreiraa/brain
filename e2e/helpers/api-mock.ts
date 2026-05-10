/**
 * Shared window.api mock factory for Playwright tests.
 * Call setupMock(page, overrides) in beforeEach, then page.goto('/').
 */
import type { Page } from '@playwright/test'

export interface MockConfig {
  rootFolder?: string | null
  theme?: string
  version?: number
  session?: { openTabs?: string[]; activeTab?: string | null }
}

export interface MockOverrides {
  config?: MockConfig
  readFile?: Record<string, string>  // path → content
  writeFile?: 'ok' | 'fail'
  renameFile?: 'ok' | 'fail'
  pickFolderResult?: string | null
  /** Extra JS injected after mock setup (runs in browser context) */
  extraScript?: string
}

export function buildInitScript(overrides: MockOverrides = {}): string {
  const config: MockConfig = {
    rootFolder: overrides.config?.rootFolder ?? '/vault',
    theme: overrides.config?.theme ?? 'light',
    version: overrides.config?.version ?? 1,
    session: overrides.config?.session ?? { openTabs: [], activeTab: null },
    ...overrides.config,
  }

  const readFileMap = JSON.stringify(overrides.readFile ?? {})
  const writeFileOk = overrides.writeFile !== 'fail'
  const renameFileOk = overrides.renameFile !== 'fail'
  const pickFolderPath = overrides.pickFolderResult !== undefined
    ? overrides.pickFolderResult
    : '/tmp/test-vault'

  const extra = overrides.extraScript ?? ''

  return `
(function() {
  // ---- ipcRenderer stub ----
  Object.defineProperty(window, 'ipcRenderer', {
    value: { on: ()=>{}, send: ()=>{}, invoke: ()=>Promise.resolve(null), removeAllListeners: ()=>{} },
    writable: true,
    configurable: true,
  })

  // ---- event emitter helpers ----
  let _treeEntryCallbacks = []
  let _treeChangedCallbacks = []
  let _fileChangedCallbacks = []
  let _fileDeletedCallbacks = []
  let _openFileCallbacks = []
  let _themeChangedCallbacks = []
  let _savedConfig = ${JSON.stringify(config)}

  window.__emitTreeEntry = function(batch) {
    _treeEntryCallbacks.forEach(cb => cb(batch))
  }
  window.__emitTreeChanged = function() {
    _treeChangedCallbacks.forEach(cb => cb())
  }
  window.__emitFileChanged = function(data) {
    _fileChangedCallbacks.forEach(cb => cb(data))
  }
  window.__emitFileDeleted = function(data) {
    _fileDeletedCallbacks.forEach(cb => cb(data))
  }
  window.__emitOpenFile = function(filePath) {
    _openFileCallbacks.forEach(cb => cb(filePath))
  }
  window.__emitThemeChanged = function(isDark) {
    _themeChangedCallbacks.forEach(cb => cb(isDark))
  }
  window.__getSavedConfig = function() { return _savedConfig }

  const readFileMap = ${readFileMap}

  // ---- window.api stub ----
  Object.defineProperty(window, 'api', {
    value: {
      listDir: (_p) => Promise.resolve([]),
      readFile: (path) => {
        if (readFileMap[path] !== undefined) {
          return Promise.resolve({ ok: true, content: readFileMap[path] })
        }
        return Promise.resolve({ ok: false, content: null })
      },
      writeFile: (_p, _c) => Promise.resolve(${writeFileOk} ? { ok: true, mtime: Date.now() } : { ok: false, code: 'ENOSPC', message: 'disk full' }),
      renameFile: (oldPath, newPath) => Promise.resolve(${renameFileOk} ? { ok: true, newPath } : { ok: false }),
      trashFile: (_p) => Promise.resolve({ ok: true }),
      pickFolder: (_d) => {
        const p = ${JSON.stringify(pickFolderPath)}
        return Promise.resolve(p ? { path: p } : null)
      },
      getConfig: () => Promise.resolve(_savedConfig),
      setConfig: (updates) => {
        _savedConfig = Object.assign({}, _savedConfig, updates)
        return Promise.resolve(_savedConfig)
      },
      watchStart: (_p) => Promise.resolve(),
      openExternal: (_u) => Promise.resolve(),
      onTreeEntry: (cb) => {
        _treeEntryCallbacks.push(cb)
        return () => { _treeEntryCallbacks = _treeEntryCallbacks.filter(x => x !== cb) }
      },
      onTreeChanged: (cb) => {
        _treeChangedCallbacks.push(cb)
        return () => { _treeChangedCallbacks = _treeChangedCallbacks.filter(x => x !== cb) }
      },
      onFileChanged: (cb) => {
        _fileChangedCallbacks.push(cb)
        return () => { _fileChangedCallbacks = _fileChangedCallbacks.filter(x => x !== cb) }
      },
      onFileDeleted: (cb) => {
        _fileDeletedCallbacks.push(cb)
        return () => { _fileDeletedCallbacks = _fileDeletedCallbacks.filter(x => x !== cb) }
      },
      onOpenFile: (cb) => {
        _openFileCallbacks.push(cb)
        return () => { _openFileCallbacks = _openFileCallbacks.filter(x => x !== cb) }
      },
      onThemeChanged: (cb) => {
        _themeChangedCallbacks.push(cb)
        return () => { _themeChangedCallbacks = _themeChangedCallbacks.filter(x => x !== cb) }
      },
    },
    writable: true,
    configurable: true,
  })

  ${extra}
})()
`
}

export async function setupMock(page: Page, overrides: MockOverrides = {}) {
  await page.addInitScript({ content: buildInitScript(overrides) })
}

/** Open a file tab via the store's openFile action */
export async function openFileInStore(
  page: Page,
  filePath: string,
  fileName: string,
  type: 'markdown' | 'excalidraw',
) {
  await page.evaluate(
    ({ filePath, fileName, type }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (window as any).__appStore
      if (!store) throw new Error('__appStore not exposed')
      return store.getState().openFile(filePath, fileName, type)
    },
    { filePath, fileName, type },
  )
}

/** Emit tree entries to populate the sidebar */
export async function emitTreeEntries(
  page: Page,
  entries: Array<{ path: string; name: string; type: 'file' | 'dir'; depth: number }>,
) {
  await page.evaluate((batch) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__emitTreeEntry(batch)
  }, entries)
}
