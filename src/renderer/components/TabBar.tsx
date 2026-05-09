import { useAppStore } from '../store/useAppStore'
import type { Tab } from '../store/useAppStore'

// Tab limits per PRD
const SOFT_CAP = 20
const HARD_CAP = 50

interface TabBarProps {
  onTabClose?: (tabId: string) => void
}

function DirtyDot({ dirty, failed }: { dirty: boolean; failed?: boolean }) {
  if (!dirty) return null
  return (
    <span
      title={failed ? 'Save failed - click to retry' : 'Unsaved changes'}
      className={`inline-block w-2 h-2 rounded-full ml-1 flex-shrink-0 ${
        failed ? 'bg-red-500' : 'bg-gray-400'
      }`}
    />
  )
}

interface TabItemProps {
  tab: Tab
  isActive: boolean
  onActivate: () => void
  onClose: () => void
}

function TabItem({ tab, isActive, onActivate, onClose }: TabItemProps) {
  return (
    <div
      className={`flex items-center gap-1 px-3 py-2 text-sm cursor-pointer border-b-2 flex-shrink-0 min-w-0 max-w-[180px] group ${
        isActive
          ? 'border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          : 'border-transparent bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={onActivate}
    >
      <span className="truncate flex-1">{tab.fileName}</span>
      <DirtyDot dirty={tab.dirty} />
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="flex-shrink-0 ml-1 w-4 h-4 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
        title="Close tab"
      >
        ×
      </button>
    </div>
  )
}

export function TabBar({ onTabClose }: TabBarProps) {
  const tabs = useAppStore(s => s.tabs)
  const activeTabId = useAppStore(s => s.activeTabId)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const closeTab = useAppStore(s => s.closeTab)
  const openFile = useAppStore(s => s.openFile)

  const handleClose = (tab: Tab) => {
    if (tab.dirty) {
      const confirmed = window.confirm(`"${tab.fileName}" has unsaved changes. Close anyway?`)
      if (!confirmed) return
    }
    closeTab(tab.id)
    onTabClose?.(tab.id)
  }

  // Exposed for external use (e.g. sidebar opening a file with cap enforcement)
  const openFileWithCaps = (filePath: string, fileName: string, type: 'markdown' | 'excalidraw') => {
    if (tabs.length >= HARD_CAP) {
      window.alert('Close some tabs first')
      return null
    }
    if (tabs.length >= SOFT_CAP) {
      const proceed = window.confirm('Many tabs open, may slow app. Open anyway?')
      if (!proceed) return null
    }
    return openFile(filePath, fileName, type)
  }

  // Expose openFileWithCaps via ref or just render it — for now just render tabs
  void openFileWithCaps // used externally

  return (
    <div className="flex items-stretch border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-x-auto flex-shrink-0">
      {tabs.map(tab => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onActivate={() => setActiveTab(tab.id)}
          onClose={() => handleClose(tab)}
        />
      ))}
    </div>
  )
}
