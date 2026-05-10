import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { FolderPrompt } from './components/FolderPrompt'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { MarkdownEditor } from './components/MarkdownEditor'
import { MarkdownPreview } from './components/MarkdownPreview'
import { Canvas } from './components/Canvas'
import { useTheme } from './hooks/useTheme'
import { useSessionRestore } from './hooks/useSessionRestore'
import { useSessionPersist } from './hooks/useSessionPersist'
import type { MarkdownTab, ExcalidrawTab } from './store/useAppStore'

function App() {
  const rootFolder = useAppStore(s => s.rootFolder)
  const setRootFolder = useAppStore(s => s.setRootFolder)
  const tabs = useAppStore(s => s.tabs)
  const activeTabId = useAppStore(s => s.activeTabId)
  const { isDark } = useTheme()
  const [configLoaded, setConfigLoaded] = useState(false)
  const [showFolderPrompt, setShowFolderPrompt] = useState(false)

  useSessionRestore()
  useSessionPersist()

  useEffect(() => {
    void (async () => {
      const config = await window.api.getConfig() as { rootFolder?: string | null }
      if (config.rootFolder) {
        setRootFolder(config.rootFolder)
      }
      setConfigLoaded(true)
    })()
  }, [setRootFolder])

  useEffect(() => {
    const off = window.api.onOpenFile((filePath: string) => {
      if (filePath === '__change-folder__') {
        setShowFolderPrompt(true)
      } else {
        const type = filePath.endsWith('.excalidraw') ? 'excalidraw' : 'markdown'
        const fileName = filePath.split('/').pop() ?? filePath
        useAppStore.getState().openFile(filePath, fileName, type)
      }
    })
    return off
  }, [])

  const activeTab = tabs.find(t => t.id === activeTabId)

  if (!configLoaded) {
    return <div data-testid="loading" className="h-screen bg-white dark:bg-gray-900" />
  }

  return (
    <>
      {(rootFolder === null || showFolderPrompt) && (
        <FolderPrompt
          onClose={showFolderPrompt ? () => setShowFolderPrompt(false) : undefined}
        />
      )}

      {rootFolder !== null && (
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-gray-900">
            <TabBar />
            <div className="flex-1 overflow-hidden">
              {activeTab?.type === 'markdown' && activeTab.mode === 'edit' && (
                <MarkdownEditor tab={activeTab as MarkdownTab} isDark={isDark} />
              )}
              {activeTab?.type === 'markdown' && activeTab.mode === 'preview' && (
                <MarkdownPreview content={(activeTab as MarkdownTab).content} isDark={isDark} />
              )}
              {activeTab?.type === 'excalidraw' && (
                <Canvas tab={activeTab as ExcalidrawTab} />
              )}
              {!activeTab && (
                <div
                  data-testid="empty-state"
                  className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500"
                >
                  <p>Select a file from the sidebar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
