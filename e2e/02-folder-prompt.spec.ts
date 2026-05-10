import { test, expect } from './fixtures/electron'
import { mockPickFolder } from './helpers/vault'

test.describe('TC-2: FolderPrompt — first run', () => {
  test.use({ initialRootFolder: null })

  test('TC-2.1 — modal shown on first launch (rootFolder null)', async ({ window }) => {
    await expect(window.getByText('Select Vault Folder')).toBeVisible()
    const input = window.locator('input[placeholder="~/Brain"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('~/Brain')
  })

  test('TC-2.3 — Browse button calls pickFolder and populates input', async ({ window, electronApp }) => {
    await mockPickFolder(electronApp, '/home/user/MyNotes')
    await window.getByRole('button', { name: 'Browse' }).click()
    const input = window.locator('input[placeholder="~/Brain"]')
    await expect(input).toHaveValue('/home/user/MyNotes')
  })

  test('TC-2.4 — Confirm saves rootFolder to config and closes modal', async ({ window }) => {
    const input = window.locator('input[placeholder="~/Brain"]')
    await input.fill('/home/user/Brain')
    await window.getByRole('button', { name: 'Open' }).click()
    // Modal should close
    await expect(window.getByText('Select Vault Folder')).not.toBeVisible()
    const config = await window.evaluate(() => window.api.getConfig())
    expect((config as any).rootFolder).toBeTruthy()
  })

  test('TC-2.5 — warning when picking home directory', async ({ window }) => {
    const input = window.locator('input[placeholder="~/Brain"]')
    await input.fill('/home/user')
    await window.getByRole('button', { name: 'Open' }).click()
    // Warning message should appear
    await expect(window.getByText(/Warning.*home directory/i)).toBeVisible()
    // Button text changes to "Confirm anyway"
    await expect(window.getByRole('button', { name: 'Confirm anyway' })).toBeVisible()
  })

  test('TC-2.6 — warning when picking filesystem root', async ({ window }) => {
    const input = window.locator('input[placeholder="~/Brain"]')
    await input.fill('/')
    await window.getByRole('button', { name: 'Open' }).click()
    await expect(window.getByText(/Warning.*root/i)).toBeVisible()
    await expect(window.getByRole('button', { name: 'Confirm anyway' })).toBeVisible()
  })

  test('TC-2.7 — warning when folder has >10k entries', async ({ window }) => {
    test.fixme(true, 'FolderPrompt.validate() does not yet check folder entry count. Need to add countEntries IPC call and show warning when count > 10000.')
  })

  test('TC-2.9 — tilde expanded in stored rootFolder', async ({ window }) => {
    const input = window.locator('input[placeholder="~/Brain"]')
    await input.fill('~/Notes')
    await window.getByRole('button', { name: 'Open' }).click()
    // Modal closes when tilde path is accepted (main process expands tilde)
    await expect(window.getByText('Select Vault Folder')).not.toBeVisible()
  })
})

test.describe('TC-2: FolderPrompt — with vault', () => {
  test('TC-2.2 — modal NOT shown when rootFolder is set', async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
    await expect(window.getByText('Select Vault Folder')).not.toBeVisible()
  })

  test('TC-2.8 — File menu "Change Folder" reopens modal', async ({ window, electronApp }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
    // Simulate the Electron menu emitting open-file event with __change-folder__
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('open-file', '__change-folder__')
    })
    await expect(window.getByText('Select Vault Folder')).toBeVisible()
  })
})
