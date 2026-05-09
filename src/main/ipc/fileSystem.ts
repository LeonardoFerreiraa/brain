import { ipcMain, dialog, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

// Config for path validation
let rootFolder: string | null = null
export function setRootFolder(folder: string) { rootFolder = folder }
export function getRootFolder() { return rootFolder }

async function resolveAndValidate(inputPath: string): Promise<string> {
  const resolved = await fs.realpath(inputPath)
  if (!rootFolder) throw new Error('Root folder not set')
  const canonicalRoot = await fs.realpath(rootFolder)
  if (!resolved.startsWith(canonicalRoot + path.sep) && resolved !== canonicalRoot) {
    throw new Error(`Path traversal detected: ${inputPath}`)
  }
  return resolved
}

export function registerIpcHandlers() {
  // fs:list-dir
  ipcMain.handle('fs:list-dir', async (_e, { path: dirPath }) => {
    const resolved = await resolveAndValidate(dirPath)
    const entries = await fs.readdir(resolved, { withFileTypes: true })
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(resolved, e.name) }))
  })

  // fs:read-file
  ipcMain.handle('fs:read-file', async (_e, { path: filePath }) => {
    try {
      const resolved = await resolveAndValidate(filePath)
      const content = await fs.readFile(resolved, 'utf-8')
      const stat = await fs.stat(resolved)
      return { ok: true, content, mtime: stat.mtimeMs }
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      return { ok: false, code: error.code ?? 'UNKNOWN', message: error.message }
    }
  })

  // fs:write-file (atomic write via tmp file)
  ipcMain.handle('fs:write-file', async (_e, { path: filePath, content }) => {
    try {
      const resolved = await resolveAndValidate(filePath)
      const tmpPath = resolved + '.tmp'
      await fs.writeFile(tmpPath, content, 'utf-8')
      await fs.rename(tmpPath, resolved)
      const stat = await fs.stat(resolved)
      return { ok: true, mtime: stat.mtimeMs }
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      return { ok: false, code: error.code ?? 'UNKNOWN', message: error.message }
    }
  })

  // fs:rename-file
  ipcMain.handle('fs:rename-file', async (_e, { oldPath, newPath }) => {
    try {
      const resolvedOld = await resolveAndValidate(oldPath)
      // newPath only needs to be under root, not necessarily exist yet
      if (!rootFolder) throw new Error('Root folder not set')
      const canonicalRoot = await fs.realpath(rootFolder)
      const resolvedNew = path.resolve(newPath)
      if (!resolvedNew.startsWith(canonicalRoot + path.sep)) {
        throw new Error('New path outside root')
      }
      await fs.rename(resolvedOld, resolvedNew)
      return { ok: true, newPath: resolvedNew }
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      return { ok: false, code: error.code ?? 'UNKNOWN', message: error.message }
    }
  })

  // shell:trash-file
  ipcMain.handle('shell:trash-file', async (_e, { path: filePath }) => {
    try {
      const resolved = await resolveAndValidate(filePath)
      await shell.trashItem(resolved)
      return { ok: true }
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      return { ok: false, code: error.code ?? 'UNKNOWN', message: error.message }
    }
  })

  // dialog:pick-folder
  ipcMain.handle('dialog:pick-folder', async (_e, { defaultPath }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: defaultPath ?? path.join(os.homedir(), 'Brain'),
    })
    return { path: result.canceled ? null : result.filePaths[0] ?? null }
  })

  // shell:open-external
  ipcMain.handle('shell:open-external', async (_e, { url }) => {
    // Only allow http/https
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Only http/https URLs allowed')
      }
      await shell.openExternal(url)
      return { ok: true }
    } catch (err) {
      const error = err as Error
      return { ok: false, message: error.message }
    }
  })

  // config:get and config:set are handled in config module (see issue #4)
  // fs:watch-start is handled in watcher module (see issue #8)
}
