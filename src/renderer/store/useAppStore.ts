import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { TAB_HARD_CAP } from '../../utils/tabUtils'

// Excalidraw types — imported as type-only to avoid runtime issues in tests
// In production these match @excalidraw/excalidraw types exactly
export type ExcalidrawElement = {
  id: string
  type: string
  [key: string]: unknown
}

export type ExcalidrawAppState = {
  viewBackgroundColor?: string
  gridSize?: number | null
  theme?: string
  [key: string]: unknown
}

export type BinaryFiles = Record<string, {
  mimeType: string
  id: string
  dataURL: string
  created: number
}>

export type ExcalidrawTab = {
  id: string
  type: 'excalidraw'
  filePath: string
  fileName: string
  dirty: boolean
  elements: ExcalidrawElement[]
  appState: ExcalidrawAppState
  files: BinaryFiles
  _passthrough?: Record<string, unknown>
}

export type MarkdownTab = {
  id: string
  type: 'markdown'
  filePath: string
  fileName: string
  dirty: boolean
  content: string
  mode: 'edit' | 'preview'
}

export type Tab = ExcalidrawTab | MarkdownTab

export interface AppStore {
  // State
  rootFolder: string | null
  tabs: Tab[]
  activeTabId: string | null
  vaultIndex: Map<string, string>  // basename → fullPath

  // Actions
  setRootFolder: (folder: string | null) => void
  openFile: (filePath: string, fileName: string, type: 'markdown' | 'excalidraw') => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabContent: (tabId: string, content: Partial<ExcalidrawTab> | Partial<MarkdownTab>) => void
  markTabDirty: (tabId: string, dirty: boolean) => void
  setTabMode: (tabId: string, mode: 'edit' | 'preview') => void
  updateVaultIndex: (entries: Array<{ name: string; path: string }>) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  rootFolder: null,
  tabs: [],
  activeTabId: null,
  vaultIndex: new Map(),

  setRootFolder: (folder) => set({ rootFolder: folder }),

  openFile: (filePath, fileName, type) => {
    const { tabs } = get()
    // Dedup: if already open, focus it
    const existing = tabs.find(t => t.filePath === filePath)
    if (existing) {
      set({ activeTabId: existing.id })
      return existing.id
    }
    // Enforce hard cap — refuse to open beyond limit
    if (tabs.length >= TAB_HARD_CAP) return ''
    const id = uuidv4()
    const newTab: Tab = type === 'excalidraw'
      ? { id, type: 'excalidraw', filePath, fileName, dirty: false, elements: [], appState: {}, files: {} }
      : { id, type: 'markdown', filePath, fileName, dirty: false, content: '', mode: 'edit' }
    set({ tabs: [...tabs, newTab], activeTabId: id })
    return id
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get()
    const idx = tabs.findIndex(t => t.id === tabId)
    const newTabs = tabs.filter(t => t.id !== tabId)
    let newActiveId = activeTabId
    if (activeTabId === tabId) {
      // Focus adjacent tab
      if (newTabs.length === 0) {
        newActiveId = null
      } else {
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)].id
      }
    }
    set({ tabs: newTabs, activeTabId: newActiveId })
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabContent: (tabId, content) => {
    set(state => ({
      tabs: state.tabs.map(tab => {
        if (tab.id !== tabId) return tab
        return { ...tab, ...content } as Tab
      })
    }))
  },

  markTabDirty: (tabId, dirty) => {
    set(state => ({
      tabs: state.tabs.map(tab => tab.id === tabId ? { ...tab, dirty } : tab)
    }))
  },

  setTabMode: (tabId, mode) => {
    set(state => ({
      tabs: state.tabs.map(tab => {
        if (tab.id !== tabId || tab.type !== 'markdown') return tab
        return { ...tab, mode } as MarkdownTab
      })
    }))
  },

  updateVaultIndex: (entries) => {
    const index = new Map<string, string>()
    for (const { name, path } of entries) {
      index.set(name, path)
    }
    set({ vaultIndex: index })
  },
}))
