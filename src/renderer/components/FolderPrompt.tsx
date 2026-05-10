import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

// Since we're in renderer (no node access), default to ~/Brain via string
const DEFAULT_PATH = '~/Brain'

interface FolderPromptProps {
  onClose?: () => void
}

export function FolderPrompt({ onClose }: FolderPromptProps) {
  const rootFolder = useAppStore(s => s.rootFolder)
  const setRootFolder = useAppStore(s => s.setRootFolder)
  const [inputPath, setInputPath] = useState(DEFAULT_PATH)
  const [warning, setWarning] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState(false)

  // Only show if no rootFolder set (or always shown when triggered from menu)
  const shouldShow = rootFolder === null || onClose !== undefined

  if (!shouldShow) return null

  const validate = (p: string): string | null => {
    if (p === '~' || p === '/home' || p.match(/^\/home\/[^/]+\s*$/)) {
      return 'Warning: selecting your home directory may be slow. Continue?'
    }
    if (p === '/' || p === '/root') {
      return 'Warning: selecting filesystem root is not recommended. Continue?'
    }
    return null
  }

  const handleBrowse = async () => {
    const result = await window.api.pickFolder(inputPath)
    if (result && typeof result === 'object' && 'path' in result && result.path) {
      setInputPath(result.path as string)
      setWarning(null)
      setPendingConfirm(false)
    }
  }

  const handleConfirm = async () => {
    const warn = validate(inputPath)
    if (warn && !pendingConfirm) {
      setWarning(warn)
      setPendingConfirm(true)
      return
    }
    // BUG-18: tilde expansion handled in main process config:set handler
    const result = await window.api.setConfig({ rootFolder: inputPath }) as { rootFolder?: string }
    const savedPath = result?.rootFolder ?? inputPath
    setRootFolder(savedPath)
    setWarning(null)
    setPendingConfirm(false)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Select Vault Folder</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Choose the root folder for your Brain vault.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputPath}
            onChange={e => {
              setInputPath(e.target.value)
              setWarning(null)
              setPendingConfirm(false)
            }}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="~/Brain"
          />
          <button
            onClick={handleBrowse}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white"
          >
            Browse
          </button>
        </div>
        {warning && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-600 rounded text-sm text-yellow-800 dark:text-yellow-200">
            {warning}
          </div>
        )}
        <div className="flex justify-end gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            {pendingConfirm ? 'Confirm anyway' : 'Open'}
          </button>
        </div>
      </div>
    </div>
  )
}
