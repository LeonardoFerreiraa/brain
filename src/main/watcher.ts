import { BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
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
