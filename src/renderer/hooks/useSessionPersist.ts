import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useSessionPersist() {
  const tabs = useAppStore(s => s.tabs)
  const activeTabId = useAppStore(s => s.activeTabId)

  useEffect(() => {
    const handleBeforeUnload = () => {
      // BUG-15: save filePath, not the UUID — tab IDs are regenerated on every
      // session so the saved UUID would never match anything on restore.
      const activeTab = tabs.find(t => t.id === activeTabId)
      void window.api.setConfig({
        session: {
          openTabs: tabs.map(t => t.filePath),
          activeTab: activeTab?.filePath ?? null,
        },
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tabs, activeTabId])
}
