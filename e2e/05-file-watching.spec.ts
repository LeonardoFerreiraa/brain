import { test, expect } from '@playwright/test'
import { setupMock, openFileInStore } from './helpers/api-mock'

test.describe('TC-5: File Watching', () => {
  test('TC-5.1 — External edit to clean tab: silent reload', async ({ page }) => {
    // Note: This requires file-watching integration wired into the editor.
    // The renderer's useAppStore has no useFileWatcher hook yet — the mock
    // provides __emitFileChanged but no component subscribes and reloads content.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': 'new content' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    // Verify tab is clean (dirty=false)
    const isDirty = await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      return state.tabs[0]?.dirty ?? false
    })
    expect(isDirty).toBe(false)

    // Emit file-changed event
    await page.evaluate(() => {
      ;(window as any).__emitFileChanged({ path: '/vault/note.md', mtime: Date.now() })
    })

    // Wait briefly for any async update
    await page.waitForTimeout(300)

    // Tab content should have updated to 'new content'
    const content = await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      return state.tabs[0]?.content ?? ''
    })
    expect(content).toBe('new content')

    // No conflict banner should be visible
    await expect(page.getByText('File changed on disk')).not.toBeVisible()
  })

  test('TC-5.2 — External edit to dirty tab: conflict banner', async ({ page }) => {
    // Note: Conflict banner on dirty-tab file change is not implemented.
    // No component subscribes to onFileChanged and shows a banner.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': 'original content' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    // Mark tab dirty via store
    await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    // Emit file-changed event
    await page.evaluate(() => {
      ;(window as any).__emitFileChanged({ path: '/vault/note.md', mtime: Date.now() })
    })

    await page.waitForTimeout(300)

    // Conflict banner should be visible with Reload and Keep mine buttons
    await expect(page.getByText('File changed on disk')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Keep mine' })).toBeVisible()
  })

  test('TC-5.5 — External delete marks tab orphaned', async ({ page }) => {
    // Note: Orphaned tab state on file delete is not implemented.
    // No component subscribes to onFileDeleted and marks the tab as orphaned.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': 'content' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    // Emit file-deleted event
    await page.evaluate(() => {
      ;(window as any).__emitFileDeleted({ path: '/vault/note.md' })
    })

    await page.waitForTimeout(300)

    // Tab should still exist but show an orphaned indicator
    const tabElement = page.locator('[data-testid="tab-bar"]').getByText('note.md')
    await expect(tabElement).toBeVisible()

    // Check for orphaned class or text
    const hasOrphanedIndicator = await page.evaluate(() => {
      return (
        document.body.innerHTML.includes('orphaned') ||
        document.querySelector('.orphaned') !== null
      )
    })
    expect(hasOrphanedIndicator).toBe(true)
  })

  test('TC-5.6 — Own save does not trigger reload', async ({ page }) => {
    // Note: Save-suppression of self-triggered file-change events is not implemented.
    // The useSave hook does not record its own write mtime to suppress the watcher.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': 'original' },
      writeFile: 'ok',
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    // Trigger Ctrl+S to save
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(200)

    // Then emit a file-changed event for the same file (simulating the OS watcher
    // picking up the write we just did)
    await page.evaluate(() => {
      ;(window as any).__emitFileChanged({ path: '/vault/note.md', mtime: Date.now() })
    })

    await page.waitForTimeout(300)

    // No reload toast or conflict banner should appear
    await expect(page.getByText('File changed on disk')).not.toBeVisible()
    await expect(page.getByText('Reloaded')).not.toBeVisible()

    // Tab should remain clean
    const isDirty = await page.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(isDirty).toBe(false)
  })
})
