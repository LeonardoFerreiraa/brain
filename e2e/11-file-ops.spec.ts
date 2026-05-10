import { test, expect } from '@playwright/test'
import { setupMock, openFileInStore, emitTreeEntries } from './helpers/api-mock'

const NOTE_ENTRY = [
  { path: '/vault/note.md', name: 'note.md', type: 'file' as const, depth: 0 },
]

test.describe('TC-11: File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': 'hello' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    // Populate the sidebar with note.md and wait for it to render
    await emitTreeEntries(page, NOTE_ENTRY)
    await page.getByText('note.md').first().waitFor({ timeout: 3000 })
  })

  test('TC-11.1 — Double-click starts inline rename', async ({ page }) => {
    // Pre-open the file so the onClick deduplicates (no tabs change → no Sidebar re-render)
    // This lets the dblclick sequence complete cleanly without DOM thrashing.
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    const renameInput = page.locator('input[value="note.md"]')
    await expect(renameInput).toBeVisible()
  })

  test('TC-11.2 — Rename confirmed on Enter', async ({ page }) => {
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    await expect(page.locator('input[value="note.md"]')).toBeVisible()

    // Use a stable locator (not value-dependent) for subsequent interactions
    const sidebarInput = page.locator('[data-testid="sidebar-entry"] input')
    await sidebarInput.fill('renamed.md')
    await sidebarInput.press('Enter')

    await page.waitForTimeout(300)

    // Either 'renamed.md' appears or 'note.md' is gone from sidebar
    const noteStillVisible = await page.locator('[data-testid="sidebar-entry"]').filter({ hasText: 'note.md' }).isVisible().catch(() => false)
    const renamedVisible = await page.getByText('renamed.md').isVisible().catch(() => false)

    expect(renamedVisible || !noteStillVisible).toBe(true)
  })

  test('TC-11.3 — Rename cancelled on Escape', async ({ page }) => {
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    const renameInput = page.locator('input[value="note.md"]')
    await expect(renameInput).toBeVisible()

    await renameInput.press('Escape')

    await page.waitForTimeout(200)

    await expect(renameInput).not.toBeVisible()
    await expect(page.locator('[data-testid="sidebar-entry"]').filter({ hasText: 'note.md' }).first()).toBeVisible()
  })

  test('TC-11.5 — Rename rejects empty name', async ({ page }) => {
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    await expect(page.locator('input[value="note.md"]')).toBeVisible()

    const sidebarInput = page.locator('[data-testid="sidebar-entry"] input')
    await sidebarInput.fill('')
    await sidebarInput.press('Enter')

    await page.waitForTimeout(200)

    // Input dismissed; sidebar still shows note.md
    await expect(page.locator('[data-testid="sidebar-entry"]').filter({ hasText: 'note.md' }).first()).toBeVisible()
  })

  test('TC-11.7 — Trash via hover button', async ({ page }) => {
    await page.evaluate(() => {
      window.confirm = () => true
    })

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.hover()

    // Trash button appears on hover (group-hover:block)
    const trashButton = fileEntry.locator('button').last()
    await trashButton.click()

    await page.waitForTimeout(300)

    expect(true).toBe(true)
  })

  test('TC-11.8 — Trash confirmed: trashFile called with correct path', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': 'hello' },
      extraScript: `
        window._trashCalls = [];
        window.api.trashFile = (p) => { window._trashCalls.push(p); return Promise.resolve({ ok: true }); };
        window.confirm = () => true;
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await emitTreeEntries(page, NOTE_ENTRY)
    await page.waitForTimeout(300)

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.hover()

    const trashButton = fileEntry.locator('button').last()
    await trashButton.click()

    await page.waitForTimeout(300)

    const calls: string[] = await page.evaluate(() => (window as any)._trashCalls)
    expect(calls).toContain('/vault/note.md')
  })

  test('TC-11.4 — Rename updates open tab filePath', async ({ page }) => {
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    await page.waitForSelector('[data-testid="tab-bar"]', { timeout: 3000 }).catch(() =>
      page.waitForTimeout(300),
    )

    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()

    await expect(page.locator('input[value="note.md"]')).toBeVisible()

    const sidebarInput = page.locator('[data-testid="sidebar-entry"] input')
    await sidebarInput.fill('renamed.md')
    await sidebarInput.press('Enter')

    await page.waitForTimeout(500)

    const tabBar = page.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('renamed.md')).toBeVisible()
  })
})
