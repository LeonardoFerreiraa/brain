import { test, expect } from '@playwright/test'
import { setupMock } from './helpers/api-mock'

test.describe('TC-2: FolderPrompt', () => {
  test('TC-2.1 — modal shown on first launch (rootFolder null)', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: null } })
    await page.goto('/')
    await expect(page.getByText('Select Vault Folder')).toBeVisible()
    const input = page.locator('input[placeholder="~/Brain"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('~/Brain')
  })

  test('TC-2.2 — modal NOT shown when rootFolder is set', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: '/vault' } })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await expect(page.getByText('Select Vault Folder')).not.toBeVisible()
  })

  test('TC-2.3 — Browse button calls pickFolder and populates input', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: null },
      pickFolderResult: '/home/user/MyNotes',
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Browse' }).click()
    const input = page.locator('input[placeholder="~/Brain"]')
    await expect(input).toHaveValue('/home/user/MyNotes')
  })

  test('TC-2.4 — Confirm saves rootFolder to config and closes modal', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: null },
      extraScript: `
        window.api.setConfig = (c) => {
          window._setConfigArg = c
          return Promise.resolve({ rootFolder: c.rootFolder ?? null })
        }
      `,
    })
    await page.goto('/')
    const input = page.locator('input[placeholder="~/Brain"]')
    await input.fill('/home/user/Brain')
    await page.getByRole('button', { name: 'Open' }).click()
    // Modal should close
    await expect(page.getByText('Select Vault Folder')).not.toBeVisible()
    const arg = await page.evaluate(() => (window as any)._setConfigArg)
    expect(arg.rootFolder).toBe('/home/user/Brain')
  })

  test('TC-2.5 — warning when picking home directory', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: null } })
    await page.goto('/')
    const input = page.locator('input[placeholder="~/Brain"]')
    await input.fill('/home/user')
    await page.getByRole('button', { name: 'Open' }).click()
    // Warning message should appear
    await expect(page.getByText(/Warning.*home directory/i)).toBeVisible()
    // Button text changes to "Confirm anyway"
    await expect(page.getByRole('button', { name: 'Confirm anyway' })).toBeVisible()
  })

  test('TC-2.6 — warning when picking filesystem root', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: null } })
    await page.goto('/')
    const input = page.locator('input[placeholder="~/Brain"]')
    await input.fill('/')
    await page.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByText(/Warning.*root/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm anyway' })).toBeVisible()
  })

  test('TC-2.7 — warning when folder has >10k entries', async ({ page }) => {
    test.fixme(true, 'FolderPrompt.validate() does not yet check folder entry count. Need to add countEntries IPC call and show warning when count > 10000.')
  })

  test('TC-2.8 — File menu "Change Folder" reopens modal', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: '/vault' } })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    // Simulate the Electron menu emitting __change-folder__ via onOpenFile
    await page.evaluate(() => (window as any).__emitOpenFile('__change-folder__'))
    await expect(page.getByText('Select Vault Folder')).toBeVisible()
  })

  test('TC-2.9 — tilde expanded in stored rootFolder', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: null },
      extraScript: `
        // Simulate main process expanding tilde in setConfig response
        window.api.setConfig = (c) => {
          const expanded = c.rootFolder && c.rootFolder.replace(/^~/, '/home/testuser')
          const result = { ...c, rootFolder: expanded }
          window._setConfigResult = result
          return Promise.resolve(result)
        }
      `,
    })
    await page.goto('/')
    const input = page.locator('input[placeholder="~/Brain"]')
    await input.fill('~/Notes')
    await page.getByRole('button', { name: 'Open' }).click()
    const result = await page.evaluate(() => (window as any)._setConfigResult)
    expect(result.rootFolder).toBe('/home/testuser/Notes')
  })
})
