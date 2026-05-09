import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

function inferTabType(filePath: string): 'markdown' | 'excalidraw' | null {
  if (filePath.endsWith('.md')) return 'markdown'
  if (filePath.endsWith('.excalidraw')) return 'excalidraw'
  return null
}

export function useSessionRestore() {
  const openFile = useAppStore(s => s.openFile)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const hasRestored = useRef(false)

  useEffect(() => {
    if (hasRestored.current) return
    hasRestored.current = true

    void (async () => {
      const config = await window.api.getConfig() as {
        session?: { openTabs?: string[]; activeTab?: string | null }
      }
      const { openTabs = [], activeTab = null } = config.session ?? {}

      const restoredIds: Map<string, string> = new Map() // filePath → tabId

      for (const filePath of openTabs) {
        const type = inferTabType(filePath)
        if (!type) continue // skip unsupported extensions

        // Check file exists via read (silent skip on failure)
        try {
          const result = await window.api.readFile(filePath) as { ok: boolean }
          if (!result.ok) continue
        } catch {
          continue
        }

        const fileName = filePath.split('/').pop() ?? filePath
        const tabId = openFile(filePath, fileName, type)
        restoredIds.set(filePath, tabId)
      }

      // Restore active tab
      if (activeTab && restoredIds.has(activeTab)) {
        setActiveTab(restoredIds.get(activeTab)!)
      } else if (restoredIds.size > 0) {
        const firstId = restoredIds.values().next().value
        if (firstId) setActiveTab(firstId)
      }
    })()
  }, [openFile, setActiveTab])
}
