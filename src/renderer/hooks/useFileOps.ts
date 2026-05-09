import { useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { autoIncrementName, validateNewName, buildRenamedPath, inferFileType, buildNewFilePath } from '../../utils/fileOps'

export function useFileOps() {
  const rootFolder = useAppStore(s => s.rootFolder)
  const openFile = useAppStore(s => s.openFile)
  const tabs = useAppStore(s => s.tabs)

  const createNewNote = useCallback(async (existingNames: Set<string>) => {
    if (!rootFolder) return null
    const name = autoIncrementName('Untitled', '.md', existingNames)
    const filePath = buildNewFilePath(rootFolder, name)
    const result = await window.api.writeFile(filePath, '') as { ok: boolean }
    if (!result.ok) return null
    openFile(filePath, name, 'markdown')
    return filePath
  }, [rootFolder, openFile])

  const createNewDrawing = useCallback(async (existingNames: Set<string>) => {
    if (!rootFolder) return null
    const name = autoIncrementName('Untitled', '.excalidraw', existingNames)
    const filePath = buildNewFilePath(rootFolder, name)
    const empty = JSON.stringify({ type: 'excalidraw', version: 2, elements: [], appState: {}, files: {} })
    const result = await window.api.writeFile(filePath, empty) as { ok: boolean }
    if (!result.ok) return null
    openFile(filePath, name, 'excalidraw')
    return filePath
  }, [rootFolder, openFile])

  const renameFile = useCallback(async (oldPath: string, newName: string): Promise<{ ok: boolean; error?: string }> => {
    const validationError = validateNewName(newName)
    if (validationError) return { ok: false, error: validationError }

    const newPath = buildRenamedPath(oldPath, newName)
    if (newPath === oldPath) return { ok: true } // no change

    const result = await window.api.renameFile(oldPath, newPath) as { ok: boolean; newPath?: string; code?: string }
    if (!result.ok) return { ok: false, error: 'Rename failed' }

    // Update open tab if it was this file
    const matchingTab = tabs.find(t => t.filePath === oldPath)
    if (matchingTab) {
      const type = inferFileType(newPath) ?? (matchingTab.type as 'markdown' | 'excalidraw')
      // Tab update happens via store action (implemented in issue #6)
      void type
    }

    return { ok: true }
  }, [tabs])

  const trashFile = useCallback(async (filePath: string, fileName: string): Promise<boolean> => {
    const confirmed = window.confirm(`Move "${fileName}" to Trash?`)
    if (!confirmed) return false
    const result = await window.api.trashFile(filePath) as { ok: boolean }
    return result.ok
  }, [])

  return { createNewNote, createNewDrawing, renameFile, trashFile }
}
