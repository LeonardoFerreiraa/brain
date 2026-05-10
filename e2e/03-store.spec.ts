import { test, expect } from './fixtures/electron'
import { join } from 'node:path'

// All TC-3 tests operate on the Zustand store directly via window.__appStore
// The app must be loaded with rootFolder set so the main layout renders.

test.describe('TC-3: Zustand Store', () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-3.1 — openFile creates markdown tab with correct shape', async ({ window, vault }) => {
    const notePath = join(vault, 'note.md')
    const tab = await window.evaluate((filePath) => {
      const store = (window as any).__appStore
      const id = store.getState().openFile(filePath, 'note.md', 'markdown')
      return store.getState().tabs.find((t: { id: string }) => t.id === id)
    }, notePath)
    expect(tab).toBeTruthy()
    expect(tab.type).toBe('markdown')
    expect(tab.filePath).toBe(notePath)
    expect(tab.mode).toBe('edit')
    expect(tab.dirty).toBe(false)
  })

  test('TC-3.2 — openFile creates excalidraw tab', async ({ window, vault }) => {
    const drawingPath = join(vault, 'drawing.excalidraw')
    const tab = await window.evaluate((filePath) => {
      const store = (window as any).__appStore
      const id = store.getState().openFile(filePath, 'drawing.excalidraw', 'excalidraw')
      return store.getState().tabs.find((t: { id: string }) => t.id === id)
    }, drawingPath)
    expect(tab).toBeTruthy()
    expect(tab.type).toBe('excalidraw')
  })

  test('TC-3.3 — openFile deduplicates by canonical path', async ({ window, vault }) => {
    const notePath = join(vault, 'note.md')
    const result = await window.evaluate((filePath) => {
      const store = (window as any).__appStore
      const id1 = store.getState().openFile(filePath, 'note.md', 'markdown')
      const id2 = store.getState().openFile(filePath, 'note.md', 'markdown')
      return { id1, id2, tabCount: store.getState().tabs.length, activeTabId: store.getState().activeTabId }
    }, notePath)
    expect(result.id1).toBe(result.id2)
    expect(result.tabCount).toBe(1)
    expect(result.activeTabId).toBe(result.id1)
  })

  test('TC-3.4 — closeTab removes tab and updates active', async ({ window, vault }) => {
    const aPath = join(vault, 'a.md')
    const bPath = join(vault, 'b.md')
    const result = await window.evaluate(({ aPath, bPath }) => {
      const store = (window as any).__appStore.getState()
      const id1 = store.openFile(aPath, 'a.md', 'markdown')
      const id2 = store.openFile(bPath, 'b.md', 'markdown')
      store.closeTab(id1)
      return {
        tabs: (window as any).__appStore.getState().tabs.map((t: { id: string }) => t.id),
        activeTabId: (window as any).__appStore.getState().activeTabId,
        id1,
        id2,
      }
    }, { aPath, bPath })
    expect(result.tabs).not.toContain(result.id1)
    expect(result.tabs).toContain(result.id2)
    expect(result.activeTabId).toBe(result.id2)
  })

  test('TC-3.5 — markTabDirty sets dirty flag', async ({ window, vault }) => {
    const notePath = join(vault, 'note.md')
    const dirty = await window.evaluate((filePath) => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile(filePath, 'note.md', 'markdown')
      store.markTabDirty(id, true)
      return (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)?.dirty
    }, notePath)
    expect(dirty).toBe(true)
  })

  test('TC-3.6 — updateTabContent updates markdown content', async ({ window, vault }) => {
    const notePath = join(vault, 'note.md')
    const content = await window.evaluate((filePath) => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile(filePath, 'note.md', 'markdown')
      store.updateTabContent(id, { content: 'new content' })
      return (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)?.content
    }, notePath)
    expect(content).toBe('new content')
  })

  test('TC-3.7 — setTabMode toggles edit/preview', async ({ window, vault }) => {
    const notePath = join(vault, 'note.md')
    const mode = await window.evaluate((filePath) => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile(filePath, 'note.md', 'markdown')
      store.setTabMode(id, 'preview')
      return (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)?.mode
    }, notePath)
    expect(mode).toBe('preview')
  })

  test('TC-3.8 — tab UUID survives rename (filePath update preserves id)', async ({ window, vault }) => {
    const oldPath = join(vault, 'old.md')
    const newPath = join(vault, 'new.md')
    const result = await window.evaluate(({ oldPath, newPath }) => {
      const store = (window as any).__appStore.getState()
      const id = store.openFile(oldPath, 'old.md', 'markdown')
      store.updateTabContent(id, { filePath: newPath, fileName: 'new.md' })
      const tab = (window as any).__appStore.getState().tabs.find((t: { id: string }) => t.id === id)
      return { id, tabId: tab?.id, filePath: tab?.filePath }
    }, { oldPath, newPath })
    expect(result.tabId).toBe(result.id)
    expect(result.filePath).toBe(newPath)
  })
})
