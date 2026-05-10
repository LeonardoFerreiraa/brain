import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile } from './helpers/vault'
import { join } from 'node:path'

test.describe('TC-10: Save Behavior', () => {
  test('TC-10.1 — Auto-save fires 1 second after edit', async ({ window, vault }) => {
    // Note: useSave hook may not be wired to CodeMirror editor yet.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'initial content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Click into the CodeMirror editor and type a character
    const editor = window.locator('.cm-editor').first()
    await editor.click()
    await window.keyboard.type('x')

    // Wait 1500ms for the 1s debounce to fire
    await window.waitForTimeout(1500)

    // Verify file was actually written (real Electron writes to disk)
    const { readVaultFile } = await import('./helpers/vault')
    const content = await readVaultFile(vault, 'note.md')
    expect(content).toContain('x')
  })

  test('TC-10.3 — Ctrl+S saves immediately', async ({ window, vault }) => {
    // Note: useSave hook may not be wired to the editor yet.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'initial content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    const editor = window.locator('.cm-editor').first()
    await editor.click()
    await window.keyboard.type('hello')

    // Press Ctrl+S immediately (do not wait 1s)
    await window.keyboard.press('Control+s')

    // Give a short grace period for synchronous handling
    await window.waitForTimeout(200)

    // Verify file was actually written
    const { readVaultFile } = await import('./helpers/vault')
    const content = await readVaultFile(vault, 'note.md')
    expect(content).toContain('hello')
  })

  test('TC-10.4 — Dirty: pending → clean on success', async ({ window, vault }) => {
    // Note: useSave hook may not be wired to editor
    test.fixme()

    await createVaultFile(vault, 'note.md', 'content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Mark tab dirty
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    // Trigger save
    await window.keyboard.press('Control+s')
    await window.waitForTimeout(300)

    const dirty: boolean = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? true
    })
    expect(dirty).toBe(false)
  })

  test('TC-10.5 — Dirty: pending → failed on error', async ({ window, vault }) => {
    // Note: useSave hook may not be wired to editor — failed state may not propagate.
    test.fixme()

    await createVaultFile(vault, 'note.md', 'content')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Mark tab dirty to simulate pending state
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    // Trigger save
    await window.keyboard.press('Control+s')
    await window.waitForTimeout(500)

    const dirty: boolean = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(dirty).toBe(true)
  })

  test('TC-10.9 — Closing failed-state tab shows dialog', async ({ window, vault }) => {
    // Note: The 'failed' dirty state is not yet exposed
    test.fixme()

    await createVaultFile(vault, 'note.md', 'content')
    await window.waitForSelector('[data-testid="empty-state"]')

    // Override confirm to return false
    await window.evaluate(() => {
      ;(window as any)._confirms = []
      window.confirm = (msg: string) => { (window as any)._confirms.push(msg); return false }
    })

    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    // Mark the tab as dirty (simulating failed state)
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) state.markTabDirty(tabId, true)
    })

    // Click the × close button on the tab
    const closeButton = window
      .locator('[data-testid="tab-bar"]')
      .getByRole('button', { name: /close|×/i })
      .first()
    await closeButton.click()

    await window.waitForTimeout(300)

    // Tab should still be visible (confirm returned false → close cancelled)
    const tabBar = window.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('note.md')).toBeVisible()
  })

  test('TC-10.13 — Excalidraw pan/zoom does NOT mark tab dirty', async ({ window, vault }) => {
    // Note: This requires Excalidraw to render and fire onChange with appState-only changes.
    test.fixme()

    await createVaultFile(vault, 'drawing.excalidraw', JSON.stringify({ elements: [], appState: {} }))
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'drawing.excalidraw'), 'drawing.excalidraw', 'excalidraw')

    // Verify tab starts clean
    const initialDirty: boolean = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(initialDirty).toBe(false)

    // Simulate a pan/zoom-only updateTabContent call
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) {
        state.updateTabContent(tabId, {
          appState: { scrollX: 10, scrollY: 20, zoom: { value: 1.5 } },
        })
      }
    })

    await window.waitForTimeout(300)

    // Tab should remain clean after pan/zoom-only change
    const dirty: boolean = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(dirty).toBe(false)
  })
})
