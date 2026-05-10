import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile } from './helpers/vault'
import { join } from 'node:path'

test.describe('TC-5: File Watching', () => {
  test('TC-5.1 — External edit to clean tab: silent reload', async ({ window, vault }) => {
    // Note: This requires file-watching integration wired into the editor.
    // The renderer's useAppStore has no useFileWatcher hook yet — no component subscribes and reloads content.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'new content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Verify tab is clean (dirty=false)
    const isDirty = await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      return state.tabs[0]?.dirty ?? false
    })
    expect(isDirty).toBe(false)

    // Wait briefly for any async update
    await window.waitForTimeout(300)

    // Tab content should have updated to 'new content'
    const content = await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      return state.tabs[0]?.content ?? ''
    })
    expect(content).toBe('new content')

    // No conflict banner should be visible
    await expect(window.getByText('File changed on disk')).not.toBeVisible()
  })

  test('TC-5.2 — External edit to dirty tab: conflict banner', async ({ window, vault }) => {
    // Note: Conflict banner on dirty-tab file change is not implemented.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'original content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Mark tab dirty via store
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    await window.waitForTimeout(300)

    // Conflict banner should be visible with Reload and Keep mine buttons
    await expect(window.getByText('File changed on disk')).toBeVisible()
    await expect(window.getByRole('button', { name: 'Reload' })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Keep mine' })).toBeVisible()
  })

  test('TC-5.5 — External delete marks tab orphaned', async ({ window, vault }) => {
    // Note: Orphaned tab state on file delete is not implemented.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    await window.waitForTimeout(300)

    // Tab should still exist but show an orphaned indicator
    const tabElement = window.locator('[data-testid="tab-bar"]').getByText('note.md')
    await expect(tabElement).toBeVisible()

    // Check for orphaned class or text
    const hasOrphanedIndicator = await window.evaluate(() => {
      return (
        document.body.innerHTML.includes('orphaned') ||
        document.querySelector('.orphaned') !== null
      )
    })
    expect(hasOrphanedIndicator).toBe(true)
  })

  test('TC-5.6 — Own save does not trigger reload', async ({ window, vault }) => {
    // Note: Save-suppression of self-triggered file-change events is not implemented.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'original')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Trigger Ctrl+S to save
    await window.keyboard.press('Control+s')
    await window.waitForTimeout(200)

    await window.waitForTimeout(300)

    // No reload toast or conflict banner should appear
    await expect(window.getByText('File changed on disk')).not.toBeVisible()
    await expect(window.getByText('Reloaded')).not.toBeVisible()

    // Tab should remain clean
    const isDirty = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(isDirty).toBe(false)
  })
})
