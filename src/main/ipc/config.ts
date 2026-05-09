import { ipcMain } from 'electron'
import { readConfig, mergeConfig, Config } from '../config'

export function registerConfigHandlers() {
  ipcMain.handle('config:get', async () => {
    return readConfig()
  })

  ipcMain.handle('config:set', async (_e, partial: Partial<Config>) => {
    return mergeConfig(partial)
  })
}
