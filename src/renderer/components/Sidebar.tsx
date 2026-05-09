import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

export interface TreeEntry {
  path: string
  name: string
  type: 'file' | 'dir'
  depth: number
}

interface TreeNode {
  entry: TreeEntry
  children: TreeNode[]
  expanded: boolean
}

function buildTree(entries: TreeEntry[]): TreeNode[] {
  // Build nested tree structure from flat list
  const roots: TreeNode[] = []
  const nodeMap = new Map<string, TreeNode>()

  for (const entry of entries) {
    const node: TreeNode = { entry, children: [], expanded: true }
    nodeMap.set(entry.path, node)

    if (entry.depth === 0) {
      roots.push(node)
    } else {
      // Find parent by path
      const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'))
      const parent = nodeMap.get(parentPath)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node) // fallback
      }
    }
  }
  return roots
}

const SUPPORTED_EXTENSIONS = new Set(['.md', '.excalidraw'])

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.substring(dot) : ''
}

function isSupported(name: string): boolean {
  return SUPPORTED_EXTENSIONS.has(getExtension(name))
}

export function Sidebar() {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const openFile = useAppStore((s) => s.openFile)
  const [entries, setEntries] = useState<TreeEntry[]>([])
  const [truncated, setTruncated] = useState(false)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    if (!rootFolder) return

    // Start scan
    window.api.watchStart(rootFolder)

    // Listen for batched tree entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offEntry = window.api.onTreeEntry((batch: any) => {
      setEntries((prev) => {
        const newEntries = [...prev, ...(batch as TreeEntry[])]
        if (newEntries.length >= 50000) {
          setTruncated(true)
          return newEntries.slice(0, 50000)
        }
        return newEntries
      })
    })

    // Listen for tree changes (re-scan)
    const offChanged = window.api.onTreeChanged(() => {
      setEntries([])
      setTruncated(false)
      window.api.watchStart(rootFolder)
    })

    return () => {
      offEntry()
      offChanged()
    }
  }, [rootFolder])

  const handleFileClick = (entry: TreeEntry) => {
    if (entry.type === 'dir') {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        if (next.has(entry.path)) next.delete(entry.path)
        else next.add(entry.path)
        return next
      })
      return
    }
    if (!isSupported(entry.name)) {
      showToast('File type not supported')
      return
    }
    const type = entry.name.endsWith('.excalidraw') ? 'excalidraw' : 'markdown'
    openFile(entry.path, entry.name, type)
  }

  const handleNewNote = async () => {
    if (!rootFolder) return
    let name = 'Untitled.md'
    let counter = 2
    const existingNames = new Set(entries.filter((e) => e.depth === 0).map((e) => e.name))
    while (existingNames.has(name)) {
      name = `Untitled ${counter}.md`
      counter++
    }
    const filePath = rootFolder + '/' + name
    await window.api.writeFile(filePath, '')
    openFile(filePath, name, 'markdown')
  }

  const handleNewDrawing = async () => {
    if (!rootFolder) return
    let name = 'Untitled.excalidraw'
    let counter = 2
    const existingNames = new Set(entries.filter((e) => e.depth === 0).map((e) => e.name))
    while (existingNames.has(name)) {
      name = `Untitled ${counter}.excalidraw`
      counter++
    }
    const filePath = rootFolder + '/' + name
    const emptyExcalidraw = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      elements: [],
      appState: {},
      files: {},
    })
    await window.api.writeFile(filePath, emptyExcalidraw)
    openFile(filePath, name, 'excalidraw')
  }

  const handleRenameStart = (entry: TreeEntry) => {
    setRenamingPath(entry.path)
    setRenameValue(entry.name)
  }

  const handleRenameConfirm = async (entry: TreeEntry) => {
    if (!renameValue.trim() || renameValue === entry.name) {
      setRenamingPath(null)
      return
    }
    const dir = entry.path.substring(0, entry.path.lastIndexOf('/'))
    const newPath = dir + '/' + renameValue
    await window.api.renameFile(entry.path, newPath)
    setRenamingPath(null)
  }

  const handleTrash = async (entry: TreeEntry) => {
    const confirmed = window.confirm(`Move "${entry.name}" to Trash?`)
    if (!confirmed) return
    await window.api.trashFile(entry.path)
  }

  const renderNode = (node: TreeNode, indent: number = 0): React.ReactNode => {
    const { entry } = node
    const isExpanded =
      entry.type === 'dir' ? expandedDirs.has(entry.path) || node.expanded : false

    return (
      <div key={entry.path}>
        <div
          className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm group"
          style={{ paddingLeft: `${8 + indent * 12}px` }}
          onClick={() => handleFileClick(entry)}
          onDoubleClick={() => entry.type === 'file' && handleRenameStart(entry)}
          onContextMenu={(e) => {
            e.preventDefault()
            if (entry.type === 'file') handleRenameStart(entry)
          }}
        >
          <span className="flex-shrink-0">{entry.type === 'dir' ? (isExpanded ? '▾' : '▸') : '·'}</span>
          {renamingPath === entry.path ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameConfirm(entry)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm(entry)
                if (e.key === 'Escape') setRenamingPath(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm bg-white dark:bg-gray-600 border border-blue-400 rounded px-1"
            />
          ) : (
            <span className="flex-1 truncate dark:text-gray-200">{entry.name}</span>
          )}
          {entry.type === 'file' && (
            <button
              className="hidden group-hover:block text-gray-400 hover:text-red-500 text-xs px-1"
              onClick={(e) => {
                e.stopPropagation()
                handleTrash(entry)
              }}
            >
              🗑
            </button>
          )}
        </div>
        {entry.type === 'dir' && isExpanded && (
          <div>{node.children.map((child) => renderNode(child, indent + 1))}</div>
        )}
      </div>
    )
  }

  const tree = buildTree(entries)

  return (
    <div className="w-60 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium dark:text-white">Files</span>
        <div className="flex gap-1">
          <button
            onClick={handleNewNote}
            title="New Note"
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white"
          >
            + Note
          </button>
          <button
            onClick={handleNewDrawing}
            title="New Drawing"
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white"
          >
            + Draw
          </button>
        </div>
      </div>

      {truncated && (
        <div className="px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-700">
          Vault exceeds 50k files. Some files hidden — wikilinks/search incomplete. Move root or
          split vault.
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!rootFolder ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No folder selected</div>
        ) : tree.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Scanning...</div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      {toast && (
        <div className="absolute bottom-4 left-4 bg-gray-800 text-white text-sm px-3 py-2 rounded shadow">
          {toast}
        </div>
      )}
    </div>
  )
}
