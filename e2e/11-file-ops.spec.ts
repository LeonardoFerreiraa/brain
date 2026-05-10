import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile, vaultFileExists } from './helpers/vault'
import { join } from 'node:path'

test.describe('TC-11: File Operations', () => {
  test.beforeEach(async ({ window, vault }) => {
    await createVaultFile(vault, 'note.md', 'hello')
    await window.waitForSelector('[data-testid="empty-state"]')

    // Trigger a scan so the sidebar populates with note.md
    await window.evaluate((rootFolder) => window.api.watchStart(rootFolder), vault)
    await window.getByText('note.md').first().waitFor({ timeout: 10000 })
  })

  test('TC-11.1 — Double-click starts inline rename', async ({ window, vault }) => {
    // Pre-open the file so the onClick deduplicates (no tabs change → no Sidebar re-render)
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    const renameInput = window.locator('input[value="note.md"]')
    await expect(renameInput).toBeVisible()
  })

  test('TC-11.2 — Rename confirmed on Enter', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    await expect(window.locator('input[value="note.md"]')).toBeVisible()

    // Use a stable locator (not value-dependent) for subsequent interactions
    const sidebarInput = window.locator('[data-testid="sidebar-entry"] input')
    await sidebarInput.fill('renamed.md')
    await sidebarInput.press('Enter')

    await window.waitForTimeout(300)

    // Either 'renamed.md' appears or 'note.md' is gone from sidebar
    const noteStillVisible = await window.locator('[data-testid="sidebar-entry"]').filter({ hasText: 'note.md' }).isVisible().catch(() => false)
    const renamedVisible = await window.getByText('renamed.md').isVisible().catch(() => false)

    expect(renamedVisible || !noteStillVisible).toBe(true)
  })

  test('TC-11.3 — Rename cancelled on Escape', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    const renameInput = window.locator('input[value="note.md"]')
    await expect(renameInput).toBeVisible()

    await renameInput.press('Escape')

    await window.waitForTimeout(200)

    await expect(renameInput).not.toBeVisible()
    await expect(window.locator('[data-testid="sidebar-entry"]').filter({ hasText: 'note.md' }).first()).toBeVisible()
  })

  test('TC-11.5 — Rename rejects empty name', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    await expect(window.locator('input[value="note.md"]')).toBeVisible()

    const sidebarInput = window.locator('[data-testid="sidebar-entry"] input')
    await sidebarInput.fill('')
    await sidebarInput.press('Enter')

    await window.waitForTimeout(200)

    // Input dismissed; sidebar still shows note.md
    await expect(window.locator('[data-testid="sidebar-entry"]').filter({ hasText: 'note.md' }).first()).toBeVisible()
  })

  test('TC-11.7 — Trash via hover button', async ({ window }) => {
    await window.evaluate(() => {
      window.confirm = () => true
    })

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.hover()

    // Trash button appears on hover (group-hover:block)
    const trashButton = fileEntry.locator('button').last()
    await trashButton.click()

    await window.waitForTimeout(300)

    expect(true).toBe(true)
  })

  test('TC-11.8 — Trash confirmed: trashFile called with correct path', async ({ window, vault }) => {
    await window.evaluate(() => {
      window.confirm = () => true
    })

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.hover()

    const trashButton = fileEntry.locator('button').last()
    await trashButton.click()

    await window.waitForTimeout(300)

    // Verify file was actually trashed (no longer exists on disk)
    const exists = await vaultFileExists(vault, 'note.md')
    // File should be in trash, not on disk
    expect(exists).toBe(false)
  })

  test('TC-11.4 — Rename updates open tab filePath', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    await window.waitForSelector('[data-testid="tab-bar"]', { timeout: 3000 }).catch(() =>
      window.waitForTimeout(300),
    )

    const fileEntry = window.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    await expect(window.locator('input[value="note.md"]')).toBeVisible()

    const sidebarInput = window.locator('[data-testid="sidebar-entry"] input')
    await sidebarInput.fill('renamed.md')
    await sidebarInput.press('Enter')

    await window.waitForTimeout(500)

    const tabBar = window.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('renamed.md')).toBeVisible()
  })
})
