import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose safe typed API to the Renderer process ---------
// Typed API bridge - no raw ipcRenderer leak
const api = {
  // File system
  listDir: (path: string) => ipcRenderer.invoke('fs:list-dir', { path }),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', { path }),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('fs:write-file', { path, content }),
  renameFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('fs:rename-file', { oldPath, newPath }),
  trashFile: (path: string) => ipcRenderer.invoke('shell:trash-file', { path }),
  // Dialog
  pickFolder: (defaultPath?: string) =>
    ipcRenderer.invoke('dialog:pick-folder', { defaultPath }),
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke('config:set', config),
  // Watch
  watchStart: (path: string) => ipcRenderer.invoke('fs:watch-start', { path }),
  // External
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', { url }),
  // Event listeners (main → renderer)
  onTreeChanged: (callback: () => void) => {
    ipcRenderer.on('fs:tree-changed', callback)
    return () => ipcRenderer.off('fs:tree-changed', callback)
  },
  onTreeEntry: (callback: (batch: unknown[]) => void) => {
    const wrapper = (_e: Electron.IpcRendererEvent, data: unknown[]) => callback(data)
    ipcRenderer.on('fs:tree-entry', wrapper)
    return () => ipcRenderer.off('fs:tree-entry', wrapper)
  },
  onFileChanged: (callback: (data: { path: string; mtime: number }) => void) => {
    const wrapper = (_e: Electron.IpcRendererEvent, data: { path: string; mtime: number }) => callback(data)
    ipcRenderer.on('fs:file-changed', wrapper)
    return () => ipcRenderer.off('fs:file-changed', wrapper)
  },
  onFileDeleted: (callback: (data: { path: string }) => void) => {
    const wrapper = (_e: Electron.IpcRendererEvent, data: { path: string }) => callback(data)
    ipcRenderer.on('fs:file-deleted', wrapper)
    return () => ipcRenderer.off('fs:file-deleted', wrapper)
  },
  onOpenFile: (callback: (filePath: string) => void) => {
    ipcRenderer.on('open-file', (_e, filePath) => callback(filePath))
    return () => ipcRenderer.off('open-file', callback)
  },
  onThemeChanged: (callback: (isDark: boolean) => void) => {
    ipcRenderer.on('theme:changed', (_e, isDark) => callback(isDark))
    return () => ipcRenderer.off('theme:changed', callback)
  },
}

contextBridge.exposeInMainWorld('api', api)

// TypeScript type declaration for renderer
export type Api = typeof api
