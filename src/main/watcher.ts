import { BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Dirent } from 'node:fs'
import chokidar, { FSWatcher } from 'chokidar'

// Self-write suppression: track recent writes with TTL
interface RecentWrite {
  mtime: number
  expiresAt: number
}

const recentWrites = new Map<string, RecentWrite>()
const SUPPRESS_TTL_MS = 2000

export function recordWrite(filePath: string, mtime: number) {
  recentWrites.set(filePath, { mtime, expiresAt: Date.now() + SUPPRESS_TTL_MS })
}

export function isSuppressed(filePath: string): boolean {
  const entry = recentWrites.get(filePath)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    recentWrites.delete(filePath)
    return false
  }
  return true
}

export function clearSuppression(filePath: string) {
  recentWrites.delete(filePath)
}

let watcher: FSWatcher | null = null
let treeChangedTimer: ReturnType<typeof setTimeout> | null = null

export function startWatcher(rootFolder: string, win: BrowserWindow) {
  // Stop existing watcher
  if (watcher) {
    watcher.close()
    watcher = null
  }

  watcher = chokidar.watch(rootFolder, {
    followSymlinks: false,
    ignoreInitial: true,
    depth: 20,
    ignored: /(^|[/\\])\../, // ignore dotfiles
  })

  const emitTreeChanged = () => {
    if (treeChangedTimer) clearTimeout(treeChangedTimer)
    treeChangedTimer = setTimeout(() => {
      win.webContents.send('fs:tree-changed', {})
    }, 300)
  }

  watcher
    .on('add', emitTreeChanged)
    .on('addDir', emitTreeChanged)
    .on('unlinkDir', emitTreeChanged)
    .on('change', (filePath) => {
      if (isSuppressed(filePath)) return
      // BUG-20: use actual filesystem mtime from stat, not the event-receipt timestamp.
      // Date.now() always differs from stat.mtimeMs, causing false conflict detection.
      fs.stat(filePath).then(stat => {
        win.webContents.send('fs:file-changed', { path: filePath, mtime: stat.mtimeMs })
      }).catch(() => {
        win.webContents.send('fs:file-changed', { path: filePath, mtime: Date.now() })
      })
      emitTreeChanged()
    })
    .on('unlink', (filePath) => {
      if (isSuppressed(filePath)) return
      win.webContents.send('fs:file-deleted', { path: filePath })
      emitTreeChanged()
    })
}

export function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}

export interface TreeEntry {
  path: string
  name: string
  type: 'file' | 'dir'
  depth: number
}

const MAX_DEPTH = 20
const BATCH_SIZE = 100

export async function initialScan(rootFolder: string, win: BrowserWindow): Promise<void> {
  const batch: TreeEntry[] = []

  async function scanDir(dirPath: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return
    let entries: Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.name === 'node_modules') continue

      const fullPath = path.join(dirPath, entry.name)
      const type: 'file' | 'dir' = entry.isDirectory() ? 'dir' : 'file'

      batch.push({ path: fullPath, name: entry.name, type, depth })

      if (batch.length >= BATCH_SIZE) {
        win.webContents.send('fs:tree-entry', batch.splice(0, BATCH_SIZE))
        await new Promise<void>(r => setImmediate(r))
      }

      if (entry.isDirectory()) {
        await scanDir(fullPath, depth + 1)
      }
    }
  }

  await scanDir(rootFolder, 0)

  if (batch.length > 0) {
    win.webContents.send('fs:tree-entry', batch.splice(0))
  }
}
