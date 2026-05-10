import { test, expect } from '@playwright/test'

// Mock Electron APIs before any page script runs
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ipcRenderer', {
      value: { on: () => {}, send: () => {}, invoke: () => Promise.resolve(null), removeAllListeners: () => {} },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'api', {
      value: {
        listDir: () => Promise.resolve([]),
        readFile: () => Promise.resolve({ ok: false, content: null }),
        writeFile: () => Promise.resolve({ ok: true, mtime: Date.now() }),
        renameFile: () => Promise.resolve({ ok: true }),
        trashFile: () => Promise.resolve({ ok: true }),
        pickFolder: () => Promise.resolve({ path: '/tmp/test-vault' }),
        getConfig: () => Promise.resolve({ rootFolder: null, theme: 'light', version: 1, session: { openTabs: [], activeTab: null } }),
        setConfig: (data: Record<string, unknown>) => Promise.resolve(data),
        watchStart: () => Promise.resolve(),
        openExternal: () => Promise.resolve(),
        onTreeEntry: () => () => {},
        onTreeChanged: () => () => {},
        onFileChanged: () => () => {},
        onFileDeleted: () => () => {},
        onOpenFile: () => () => {},
        onThemeChanged: () => () => {},
      },
      writable: true,
      configurable: true,
    })
  })
})

test('app loads without crashing', async ({ page }) => {
  await page.goto('/')
  await expect(page).not.toHaveURL(/error/)
  await expect(page.locator('#root')).toBeAttached()
})

test('page has no console errors on load', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(errors).toHaveLength(0)
})
