import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Tab } from '../store/useAppStore'
import { computeContentHash } from '../../utils/hashUtils'

const DEBOUNCE_MS = 1000

type DirtyState = 'clean' | 'pending' | 'failed'

interface SaveState {
  hash: string
  dirtyState: DirtyState
  failureMessage?: string
  retryCount: number
  retryTimer?: ReturnType<typeof setTimeout>
}

// Per-tab save state (outside Zustand to avoid serialization)
const saveStates = new Map<string, SaveState>()

function getSaveState(tabId: string): SaveState {
  if (!saveStates.has(tabId)) {
    saveStates.set(tabId, { hash: '', dirtyState: 'clean', retryCount: 0 })
  }
  return saveStates.get(tabId)!
}

export function useSave(tab: Tab) {
  const markTabDirty = useAppStore(s => s.markTabDirty)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getContent = useCallback((): string => {
    if (tab.type === 'markdown') return tab.content
    // For excalidraw, serialize key fields
    return JSON.stringify({ elements: tab.elements, appState: tab.appState, files: tab.files })
  }, [tab])

  const doSave = useCallback(async () => {
    const state = getSaveState(tab.id)
    state.dirtyState = 'pending'
    markTabDirty(tab.id, true)

    const content = getContent()
    const result = await window.api.writeFile(tab.filePath, content) as
      | { ok: true; mtime: number }
      | { ok: false; code: string; message: string }

    if (result.ok) {
      state.hash = computeContentHash(content)
      state.dirtyState = 'clean'
      state.retryCount = 0
      markTabDirty(tab.id, false)
    } else {
      state.dirtyState = 'failed'
      state.failureMessage = result.message
      markTabDirty(tab.id, true)
      // Exponential backoff retry
      const backoffMs = Math.min(2000 * Math.pow(2, state.retryCount), 30000)
      state.retryCount++
      state.retryTimer = setTimeout(() => doSave(), backoffMs)
    }
  }, [tab, markTabDirty, getContent])

  const scheduleSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    const state = getSaveState(tab.id)
    state.dirtyState = 'pending'
    debounceTimerRef.current = setTimeout(() => doSave(), DEBOUNCE_MS)
  }, [tab.id, doSave])

  const saveImmediately = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    await doSave()
  }, [doSave])

  // Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void saveImmediately()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveImmediately])

  // Trigger auto-save when content changes
  const contentHash = computeContentHash(getContent())
  const state = getSaveState(tab.id)
  const isContentChanged = contentHash !== state.hash

  useEffect(() => {
    if (isContentChanged && state.dirtyState !== 'pending') {
      scheduleSave()
    }
  }, [isContentChanged, scheduleSave, state.dirtyState])

  return {
    saveImmediately,
    scheduleSave,
    dirtyState: state.dirtyState,
    failureMessage: state.failureMessage,
  }
}
