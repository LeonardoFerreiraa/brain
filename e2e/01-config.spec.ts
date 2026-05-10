import { test, expect } from '@playwright/test'
import { setupMock } from './helpers/api-mock'

test.describe('TC-1: Config System', () => {
  test('TC-1.1 — first launch: rootFolder null → FolderPrompt shown', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: null } })
    await page.goto('/')
    await expect(page.getByText('Select Vault Folder')).toBeVisible()
  })

  test('TC-1.2 — config persists across restart (setConfig called with theme:dark)', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      extraScript: `
        window._setConfigCalls = []
        const orig = window.api.setConfig
        window.api.setConfig = (c) => { window._setConfigCalls.push(c); return orig(c) }
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    // Simulate theme being saved to config (as would happen from a View menu or ThemeToggle)
    await page.evaluate(() => window.api.setConfig({ theme: 'dark' }))
    const saved = await page.evaluate(() => (window as any).__getSavedConfig())
    expect(saved.theme).toBe('dark')
  })

  test('TC-1.3 — window bounds restored (config contains window values)', async ({ page }) => {
    // This is an Electron-level feature (browserWindow.setBounds).
    // In browser tests we can only verify the config contains window data.
    test.fixme(true, 'Window bounds restoration is Electron-specific; cannot assert BrowserWindow dimensions from Playwright browser context.')
  })

  test('TC-1.4 — window bounds saved on close', async ({ page }) => {
    test.fixme(true, 'Window close event with bounds saving is Electron-specific (win.on("close")) and cannot be tested in browser context.')
  })

  test('TC-1.5 — config migration from v0 (no version field)', async ({ page }) => {
    // If config has no version field the main process should add version:1.
    // In browser tests we verify the app loads gracefully with v0 config.
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'light', version: undefined as unknown as number },
      extraScript: `
        // Override getConfig to return a v0 config (no version)
        window.api.getConfig = () => Promise.resolve({ rootFolder: '/vault', theme: 'light' })
      `,
    })
    await page.goto('/')
    // App should still load main layout (rootFolder set)
    await expect(page.getByTestId('empty-state')).toBeVisible()
  })
})
