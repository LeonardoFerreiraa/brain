import { test, expect } from '@playwright/test'

// Mock Electron APIs before any page script runs
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Mock window.ipcRenderer (used in main.tsx)
    Object.defineProperty(window, 'ipcRenderer', {
      value: {
        on: () => {},
        send: () => {},
        invoke: () => Promise.resolve(null),
        removeAllListeners: () => {},
      },
      writable: true,
    })

    // Mock window.api (used in components via preload contextBridge)
    Object.defineProperty(window, 'api', {
      value: {
        pickFolder: () => Promise.resolve({ path: '/tmp/test-vault' }),
        setConfig: (data: Record<string, unknown>) => Promise.resolve(data),
        getConfig: () => Promise.resolve({ rootFolder: null, theme: 'light' }),
        readDir: () => Promise.resolve([]),
        readFile: () => Promise.resolve(''),
        writeFile: () => Promise.resolve({ ok: true }),
        deleteFile: () => Promise.resolve({ ok: true }),
        renameFile: () => Promise.resolve({ ok: true }),
        watchDir: () => Promise.resolve(),
        unwatchDir: () => Promise.resolve(),
        onFileChanged: () => {},
        offFileChanged: () => {},
      },
      writable: true,
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
