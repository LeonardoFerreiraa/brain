import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../renderer/store/useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      rootFolder: null,
      tabs: [],
      activeTabId: null,
      vaultIndex: new Map(),
    })
  })

  describe('setRootFolder', () => {
    it('sets rootFolder', () => {
      useAppStore.getState().setRootFolder('/home/user/Brain')
      expect(useAppStore.getState().rootFolder).toBe('/home/user/Brain')
    })

    it('can set to null', () => {
      useAppStore.getState().setRootFolder('/Brain')
      useAppStore.getState().setRootFolder(null)
      expect(useAppStore.getState().rootFolder).toBeNull()
    })
  })

  describe('openFile', () => {
    it('opens markdown tab', () => {
      const id = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      const { tabs, activeTabId } = useAppStore.getState()
      expect(tabs).toHaveLength(1)
      expect(tabs[0].type).toBe('markdown')
      expect(tabs[0].filePath).toBe('/Brain/note.md')
      expect(activeTabId).toBe(id)
    })

    it('opens excalidraw tab', () => {
      useAppStore.getState().openFile('/Brain/draw.excalidraw', 'draw.excalidraw', 'excalidraw')
      const { tabs } = useAppStore.getState()
      expect(tabs[0].type).toBe('excalidraw')
    })

    it('dedupes: focusing existing tab instead of opening new', () => {
      useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().openFile('/Brain/other.md', 'other.md', 'markdown')
      useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      expect(useAppStore.getState().tabs).toHaveLength(2)
    })

    it('focuses existing tab on dedup', () => {
      const id1 = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().openFile('/Brain/other.md', 'other.md', 'markdown')
      const id1again = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      expect(id1again).toBe(id1)
      expect(useAppStore.getState().activeTabId).toBe(id1)
    })
  })

  describe('closeTab', () => {
    it('removes tab', () => {
      const id = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().closeTab(id)
      expect(useAppStore.getState().tabs).toHaveLength(0)
      expect(useAppStore.getState().activeTabId).toBeNull()
    })

    it('focuses adjacent tab when closing active', () => {
      useAppStore.getState().openFile('/Brain/a.md', 'a.md', 'markdown')
      const id2 = useAppStore.getState().openFile('/Brain/b.md', 'b.md', 'markdown')
      const id3 = useAppStore.getState().openFile('/Brain/c.md', 'c.md', 'markdown')
      useAppStore.getState().closeTab(id3)
      expect(useAppStore.getState().activeTabId).toBe(id2)
    })

    it('does not change active if closing non-active tab', () => {
      const id1 = useAppStore.getState().openFile('/Brain/a.md', 'a.md', 'markdown')
      const id2 = useAppStore.getState().openFile('/Brain/b.md', 'b.md', 'markdown')
      useAppStore.getState().setActiveTab(id2)
      useAppStore.getState().closeTab(id1)
      expect(useAppStore.getState().activeTabId).toBe(id2)
    })
  })

  describe('updateTabContent', () => {
    it('updates markdown content', () => {
      const id = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().updateTabContent(id, { content: '# Hello' })
      const tab = useAppStore.getState().tabs.find(t => t.id === id)
      expect(tab?.type === 'markdown' && tab.content).toBe('# Hello')
    })

    it('does not modify other tabs', () => {
      const id1 = useAppStore.getState().openFile('/Brain/a.md', 'a.md', 'markdown')
      const id2 = useAppStore.getState().openFile('/Brain/b.md', 'b.md', 'markdown')
      useAppStore.getState().updateTabContent(id1, { content: 'changed' })
      const tab2 = useAppStore.getState().tabs.find(t => t.id === id2)
      expect(tab2?.type === 'markdown' && tab2.content).toBe('')
    })
  })

  describe('markTabDirty', () => {
    it('marks tab as dirty', () => {
      const id = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().markTabDirty(id, true)
      expect(useAppStore.getState().tabs[0].dirty).toBe(true)
    })

    it('marks tab as clean', () => {
      const id = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().markTabDirty(id, true)
      useAppStore.getState().markTabDirty(id, false)
      expect(useAppStore.getState().tabs[0].dirty).toBe(false)
    })
  })

  describe('setTabMode', () => {
    it('sets markdown tab mode to preview', () => {
      const id = useAppStore.getState().openFile('/Brain/note.md', 'note.md', 'markdown')
      useAppStore.getState().setTabMode(id, 'preview')
      const tab = useAppStore.getState().tabs.find(t => t.id === id)
      expect(tab?.type === 'markdown' && tab.mode).toBe('preview')
    })

    it('ignores setTabMode on excalidraw tab', () => {
      const id = useAppStore.getState().openFile('/Brain/draw.excalidraw', 'draw.excalidraw', 'excalidraw')
      useAppStore.getState().setTabMode(id, 'preview')
      const tab = useAppStore.getState().tabs.find(t => t.id === id)
      expect(tab?.type).toBe('excalidraw') // still excalidraw, no mode property
    })
  })

  describe('updateVaultIndex', () => {
    it('builds index from entries', () => {
      useAppStore.getState().updateVaultIndex([
        { name: 'note.md', path: '/Brain/note.md' },
        { name: 'draw.excalidraw', path: '/Brain/draw.excalidraw' },
      ])
      const { vaultIndex } = useAppStore.getState()
      expect(vaultIndex.get('note.md')).toBe('/Brain/note.md')
      expect(vaultIndex.get('draw.excalidraw')).toBe('/Brain/draw.excalidraw')
    })

    it('replaces previous index on update', () => {
      useAppStore.getState().updateVaultIndex([{ name: 'old.md', path: '/Brain/old.md' }])
      useAppStore.getState().updateVaultIndex([{ name: 'new.md', path: '/Brain/new.md' }])
      const { vaultIndex } = useAppStore.getState()
      expect(vaultIndex.has('old.md')).toBe(false)
      expect(vaultIndex.get('new.md')).toBe('/Brain/new.md')
    })
  })
})
