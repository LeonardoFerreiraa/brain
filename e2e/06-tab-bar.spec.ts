import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile } from './helpers/vault'
import { join } from 'node:path'

test.describe('TC-6: Tab Bar', () => {
  test.beforeEach(async ({ window, vault }) => {
    await createVaultFile(vault, 'note.md', '# Note')
    await createVaultFile(vault, 'other.md', '# Other')
    await window.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-6.1 — Tab shows file name', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')
    // Tab bar should show the file name
    await expect(window.locator('[data-testid="tab-bar"]').getByText('note.md')).toBeVisible()
  })

  test('TC-6.2 — Active tab highlighted', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')
    await openFileInStore(window, join(vault, 'other.md'), 'other.md', 'markdown')

    // Set note.md as active tab
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const noteTab = store.getState().tabs.find((t: any) => t.fileName === 'note.md')
      if (noteTab) store.getState().setActiveTab(noteTab.id)
    })

    // note.md tab should have data-active="true"
    const noteTabEl = window.locator('[data-testid="tab-item"]').filter({ hasText: 'note.md' })
    await expect(noteTabEl).toHaveAttribute('data-active', 'true')

    // other.md tab should have data-active="false"
    const otherTabEl = window.locator('[data-testid="tab-item"]').filter({ hasText: 'other.md' })
    await expect(otherTabEl).toHaveAttribute('data-active', 'false')
  })

  test('TC-6.3 — Gray dot on dirty tab', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Mark tab dirty via store
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    // Gray dirty dot should exist in the tab (title="Unsaved changes")
    await expect(window.locator('[title="Unsaved changes"]')).toHaveCount(1)
  })

  test('TC-6.5 — No dot on clean tab', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')
    // Tab is clean by default — no dirty dot (no element with Unsaved changes title)
    await expect(window.locator('[title="Unsaved changes"]')).toHaveCount(0)
  })

  test('TC-6.6 — Close button closes tab', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Tab should be visible initially
    await expect(window.locator('[data-testid="tab-bar"]').getByText('note.md')).toBeVisible()

    // Hover over the tab to reveal the close button, then click ×
    const tabEl = window.locator('div').filter({ hasText: /^note\.md/ }).first()
    await tabEl.hover()

    const closeBtn = tabEl.getByTitle('Close tab')
    await closeBtn.click()

    // Tab should no longer be visible
    await expect(window.locator('[data-testid="tab-bar"]').getByText('note.md')).not.toBeVisible()
  })

  test('TC-6.7 — Close dirty tab shows confirm dialog', async ({ window, vault }) => {
    // Override window.confirm to return false (user cancels)
    await window.evaluate(() => {
      ;(window as any).confirm = () => false
    })

    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Mark tab dirty
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    // Hover and click close button
    const tabEl = window.locator('div').filter({ hasText: /^note\.md/ }).first()
    await tabEl.hover()

    const closeBtn = tabEl.getByTitle('Close tab')
    await closeBtn.click()

    // Tab should still remain open because confirm returned false
    await expect(window.locator('[data-testid="tab-bar"]').getByText('note.md')).toBeVisible()

    // Verify tab is still in store
    const tabCount = await window.evaluate(() => {
      return (window as any).__appStore.getState().tabs.length
    })
    expect(tabCount).toBe(1)
  })

  test('TC-6.8 — Dedup: clicking same file focuses existing tab', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Verify 1 tab
    const countBefore = await window.evaluate(() => {
      return (window as any).__appStore.getState().tabs.length
    })
    expect(countBefore).toBe(1)

    // Open the same file again
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Should still be only 1 tab
    const countAfter = await window.evaluate(() => {
      return (window as any).__appStore.getState().tabs.length
    })
    expect(countAfter).toBe(1)

    // That tab should be active
    const isActive = await window.evaluate(() => {
      const state = (window as any).__appStore.getState()
      return state.tabs[0]?.id === state.activeTabId
    })
    expect(isActive).toBe(true)
  })

  test('TC-6.9 — Soft cap at 20 tabs: shows confirm dialog', async ({ window }) => {
    test.fixme()

    // Open 20 tabs first
    for (let i = 1; i <= 20; i++) {
      await openFileInStore(window, `/vault/file${i}.md`, `file${i}.md`, 'markdown')
    }

    const countAt20 = await window.evaluate(() => {
      return (window as any).__appStore.getState().tabs.length
    })
    expect(countAt20).toBe(20)
  })

  test('TC-6.10 — Hard cap at 50 tabs: file does NOT open', async ({ window, vault }) => {
    // Open 50 tabs via store
    for (let i = 1; i <= 50; i++) {
      await openFileInStore(window, join(vault, `file${i}.md`), `file${i}.md`, 'markdown')
    }

    const countAt50 = await window.evaluate(() => {
      return (window as any).__appStore.getState().tabs.length
    })
    expect(countAt50).toBe(50)

    // Try to open the 51st file — store.openFile enforces hard cap and returns ''
    const result = await window.evaluate((filePath) => {
      const store = (window as any).__appStore
      return store.getState().openFile(filePath, 'file51.md', 'markdown')
    }, join(vault, 'file51.md'))

    expect(result).toBe('')

    // Tab count must still be 50
    const countAfter = await window.evaluate(() => {
      return (window as any).__appStore.getState().tabs.length
    })
    expect(countAfter).toBe(50)
  })
})
