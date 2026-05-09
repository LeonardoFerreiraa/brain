import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useSessionPersist() {
  const tabs = useAppStore(s => s.tabs)
  const activeTabId = useAppStore(s => s.activeTabId)

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously save session (fire-and-forget is OK here)
      void window.api.setConfig({
        session: {
          openTabs: tabs.map(t => t.filePath),
          activeTab: activeTabId,
        },
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tabs, activeTabId])
}
