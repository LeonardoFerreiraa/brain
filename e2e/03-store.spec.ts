import { test, expect } from '@playwright/test'
import { setupMock } from './helpers/api-mock'

// All TC-3 tests operate on the Zustand store directly via window.__appStore
// The app must be loaded with rootFolder set so the main layout renders.

test.describe('TC-3: Zustand Store', () => {
  test.beforeEach(async ({ page }) => {
    await setupMock(page, { config: { rootFolder: '/vault' } })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-3.1 — openFile creates markdown tab with correct shape', async ({ page }) => {
    const tab = await page.evaluate(() => {
      const store = (window as any).__appStore
      const id = store.getState().openFile('/vault/note.md', 'note.md', 'markdown')
      return store.getState().tabs.find((t: { id: string }) => t.id === id)
    })
    expect(tab).toBeTruthy()
    expect(tab.type).toBe('markdown')
    expect(tab.filePath).toBe('/vault/note.md')
    expect(tab.mode).toBe('edit')
    expect(tab.dirty).toBe(false)
  })

  test('TC-3.2 — openFile creates excalidraw tab', async ({ page }) => {
    const tab = await page.evaluate(() => {
      const store = (window as any).__appStore
      const id = store.getState().openFile('/vault/drawing.excalidraw', 'drawing.excalidraw', 'excalidraw')
      return store.getState().tabs.find((t: { id: string }) => t.id === id)
    })
    expect(tab).toBeTruthy()
    expect(tab.type).toBe('excalidraw')
  })

  test('TC-3.3 — openFile deduplicates by canonical path', async ({ page }) => {
    const result = await page.evaluate(() => {
      const store = (window as any).__appStore
      const id1 = store.getState().openFile('/vault/note.md', 'note.md', 'markdown')
      const id2 = store.getState().openFile('/vault/note.md', 'note.md', 'markdown')
      return { id1, id2, tabCount: store.getState().tabs.length, activeTabId: store.getState().activeTabId }
    })
    expect(result.id1).toBe(result.id2)
    expect(result.tabCount).toBe(1)
    expect(result.activeTabId).toBe(result.id1)
  })

  test('TC-3.4 — closeTab removes tab and updates active', async ({ page }) => {
    const result = await page.evaluate(() => {
      const store = (window as any).__appStore.getState()
      const id1 = store.openFile('/vault/a.md', 'a.md', 'markdown')
      const id2 = store.openFile('/vault/b.md', 'b.md', 'markdown')
      store.closeTab(id1)
      return {
        tabs: (window as any).__appStore.getState().tabs.map((t: { id: string }) => t.id),
        activeTabId: (window as any).__appStore.getState().activeTabId,
        id1,
        id2,
      }
    })
    expect(result.tabs).not.toContain(result.id1)
    expect(result.tabs).toContain(result.id2)
    expect(result.activeTabId).toBe(result.id2)
  })

  test('TC-3.5 — markTabDirty sets dirty flag', async ({ page }) => {
    const dirty = await page.evaluate(() => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile('/vault/note.md', 'note.md', 'markdown')
      store.markTabDirty(id, true)
      return (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)?.dirty
    })
    expect(dirty).toBe(true)
  })

  test('TC-3.6 — updateTabContent updates markdown content', async ({ page }) => {
    const content = await page.evaluate(() => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile('/vault/note.md', 'note.md', 'markdown')
      store.updateTabContent(id, { content: 'new content' })
      return (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)?.content
    })
    expect(content).toBe('new content')
  })

  test('TC-3.7 — setTabMode toggles edit/preview', async ({ page }) => {
    const mode = await page.evaluate(() => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile('/vault/note.md', 'note.md', 'markdown')
      store.setTabMode(id, 'preview')
      return (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)?.mode
    })
    expect(mode).toBe('preview')
  })

  test('TC-3.8 — tab UUID survives rename (filePath update preserves id)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile('/vault/old.md', 'old.md', 'markdown')
      store.updateTabContent(id, { filePath: '/vault/new.md', fileName: 'new.md' })
      const tab = (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)
      return { id, tabId: tab?.id, filePath: tab?.filePath }
    })
    expect(result.tabId).toBe(result.id)
    expect(result.filePath).toBe('/vault/new.md')
  })
})
