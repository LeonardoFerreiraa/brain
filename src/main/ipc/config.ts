import { ipcMain } from 'electron'
import os from 'node:os'
import { readConfig, mergeConfig, Config } from '../config'
import { setRootFolder } from './fileSystem'

function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return os.homedir() + p.slice(1)
  return p
}

export function registerConfigHandlers() {
  ipcMain.handle('config:get', async () => {
    return readConfig()
  })

  ipcMain.handle('config:set', async (_e, partial: Partial<Config>) => {
    // BUG-18: expand ~ in rootFolder before saving — Node fs does not expand it
    if (partial.rootFolder) {
      partial = { ...partial, rootFolder: expandTilde(partial.rootFolder) }
    }
    const result = await mergeConfig(partial)
    if (result.rootFolder) setRootFolder(result.rootFolder)
    return result
  })
}
